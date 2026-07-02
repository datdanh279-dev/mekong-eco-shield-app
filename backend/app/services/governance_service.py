import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.governance import (
    Device,
    Proposal,
    Vote,
    ProposalType,
    ProposalStatus,
    VoteType,
)
from app.models.fintech import User
from app.schemas.governance import (
    DeviceCreate,
    DeviceResponse,
    ProposalCreate,
    ProposalResponse,
    VoteRequest,
    VoteResponse,
    GovernanceStats,
)

logger = logging.getLogger(__name__)

VOTE_SECRET_SALT = "mekong-eco-shield-governance-salt-v1"


def _compute_vote_signature(proposal_id: str, device_id: str, vote: str) -> str:
    raw = f"{proposal_id}:{device_id}:{vote}:{VOTE_SECRET_SALT}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class GovernanceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_device(self, fingerprint: str, user_id: str) -> DeviceResponse:
        existing = await self.db.execute(
            select(Device).where(Device.device_fingerprint == fingerprint)
        )
        existing_device = existing.scalars().first()
        if existing_device:
            existing_device.last_seen_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(existing_device)
            return DeviceResponse.model_validate(existing_device)

        device = Device(
            device_fingerprint=fingerprint,
            user_id=user_id,
            is_active=True,
            first_seen_at=datetime.now(timezone.utc),
            last_seen_at=datetime.now(timezone.utc),
            vote_power=1.0,
        )
        self.db.add(device)
        await self.db.flush()
        await self.db.refresh(device)
        return DeviceResponse.model_validate(device)

    async def verify_device(self, fingerprint: str) -> DeviceResponse:
        result = await self.db.execute(
            select(Device).where(
                Device.device_fingerprint == fingerprint,
                Device.is_active == True,
            )
        )
        device = result.scalars().first()
        if device is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found or inactive",
            )
        return DeviceResponse.model_validate(device)

    async def get_device(self, device_id: str) -> DeviceResponse:
        result = await self.db.execute(
            select(Device).where(Device.id == device_id)
        )
        device = result.scalars().first()
        if device is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found",
            )
        return DeviceResponse.model_validate(device)

    async def get_device_by_fingerprint(self, fingerprint: str) -> DeviceResponse:
        result = await self.db.execute(
            select(Device).where(Device.device_fingerprint == fingerprint)
        )
        device = result.scalars().first()
        if device is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found",
            )
        return DeviceResponse.model_validate(device)

    async def check_device_since(self, fingerprint: str, days: int) -> bool:
        result = await self.db.execute(
            select(Device).where(Device.device_fingerprint == fingerprint)
        )
        device = result.scalars().first()
        if device is None:
            return False
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return device.first_seen_at <= cutoff

    async def create_proposal(self, creator_id: str, data: ProposalCreate) -> ProposalResponse:
        try:
            ptype = ProposalType(data.proposal_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid proposal_type: {data.proposal_type}",
            )

        voting_ends = datetime.now(timezone.utc) + timedelta(days=data.voting_days)

        proposal = Proposal(
            title=data.title,
            description=data.description,
            proposal_type=ptype,
            target_param=data.target_param or {},
            status=ProposalStatus.ACTIVE,
            created_by=creator_id,
            voting_ends_at=voting_ends,
            yes_votes=0.0,
            no_votes=0.0,
            total_votes=0.0,
            required_threshold=51.0,
        )
        self.db.add(proposal)
        await self.db.flush()
        await self.db.refresh(proposal)
        return ProposalResponse.model_validate(proposal)

    async def _get_device_by_id(self, device_id: str) -> Device:
        result = await self.db.execute(
            select(Device).where(Device.id == device_id, Device.is_active == True)
        )
        device = result.scalars().first()
        if device is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Active device not found",
            )
        return device

    async def _get_proposal(self, proposal_id: str) -> Proposal:
        result = await self.db.execute(
            select(Proposal).where(Proposal.id == proposal_id)
        )
        proposal = result.scalars().first()
        if proposal is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proposal not found",
            )
        return proposal

    async def cast_vote(self, device_id: str, proposal_id: str, vote: str) -> VoteResponse:
        device = await self._get_device_by_id(device_id)
        proposal = await self._get_proposal(proposal_id)

        if proposal.status != ProposalStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Proposal is not active for voting",
            )

        if datetime.now(timezone.utc) > proposal.voting_ends_at:
            proposal.status = ProposalStatus.REJECTED
            await self.db.flush()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voting period has ended",
            )

        existing = await self.db.execute(
            select(Vote).where(
                Vote.proposal_id == proposal_id,
                Vote.device_id == device_id,
            )
        )
        if existing.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Device has already voted on this proposal",
            )

        try:
            vote_type = VoteType(vote)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid vote: {vote}",
            )

        vote_signature = _compute_vote_signature(proposal_id, device_id, vote)
        vote_power = device.vote_power

        vote_record = Vote(
            proposal_id=proposal_id,
            device_id=device_id,
            vote=vote_type,
            vote_power=vote_power,
            voted_at=datetime.now(timezone.utc),
            vote_signature=vote_signature,
        )
        self.db.add(vote_record)

        proposal.total_votes += vote_power
        if vote_type == VoteType.YES:
            proposal.yes_votes += vote_power
        elif vote_type == VoteType.NO:
            proposal.no_votes += vote_power

        await self.db.flush()
        await self.db.refresh(vote_record)

        return VoteResponse.model_validate(vote_record)

    async def tally_votes(self, proposal_id: str) -> dict[str, Any]:
        proposal = await self._get_proposal(proposal_id)

        if proposal.total_votes == 0:
            return {
                "proposal_id": proposal_id,
                "yes_votes": proposal.yes_votes,
                "no_votes": proposal.no_votes,
                "total_votes": proposal.total_votes,
                "yes_pct": 0.0,
                "no_pct": 0.0,
                "threshold": proposal.required_threshold,
                "passed": False,
            }

        yes_pct = (proposal.yes_votes / proposal.total_votes) * 100
        no_pct = (proposal.no_votes / proposal.total_votes) * 100
        passed = yes_pct >= proposal.required_threshold

        return {
            "proposal_id": proposal_id,
            "yes_votes": proposal.yes_votes,
            "no_votes": proposal.no_votes,
            "total_votes": proposal.total_votes,
            "yes_pct": round(yes_pct, 2),
            "no_pct": round(no_pct, 2),
            "threshold": proposal.required_threshold,
            "passed": passed,
        }

    async def execute_proposal(self, proposal_id: str) -> dict[str, Any]:
        proposal = await self._get_proposal(proposal_id)

        if proposal.status != ProposalStatus.PASSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Proposal must be in PASSED status to execute, current: {proposal.status.value}",
            )

        actions = []
        if proposal.proposal_type == ProposalType.SYSTEM_PARAMETER and proposal.target_param:
            param_name = proposal.target_param.get("param")
            param_value = proposal.target_param.get("value")
            if param_name and param_value is not None:
                actions.append(f"Updated system parameter '{param_name}' to '{param_value}'")

        elif proposal.proposal_type == ProposalType.ALGORITHM_UPDATE:
            model_name = proposal.target_param.get("model", "unknown")
            version = proposal.target_param.get("version", "unknown")
            actions.append(f"Deployed algorithm update: {model_name} v{version}")

        elif proposal.proposal_type == ProposalType.FUND_ALLOCATION:
            amount = proposal.target_param.get("amount", "unknown")
            recipient = proposal.target_param.get("recipient", "unknown")
            actions.append(f"Allocated {amount} VND to {recipient}")

        elif proposal.proposal_type == ProposalType.EMERGENCY_ACTION:
            action = proposal.target_param.get("action", "unknown")
            actions.append(f"Executed emergency action: {action}")

        proposal.status = ProposalStatus.EXECUTED
        await self.db.flush()

        return {
            "proposal_id": proposal_id,
            "status": "executed",
            "actions": actions,
        }

    async def get_governance_stats(self) -> GovernanceStats:
        total_devices = await self.db.scalar(select(func.count(Device.id)))
        active_voters = await self.db.scalar(
            select(func.count(Device.id)).where(Device.is_active == True)
        )

        now = datetime.now(timezone.utc)
        open_proposals = await self.db.scalar(
            select(func.count(Proposal.id)).where(
                Proposal.status == ProposalStatus.ACTIVE,
                Proposal.voting_ends_at > now,
            )
        )
        passed_proposals = await self.db.scalar(
            select(func.count(Proposal.id)).where(Proposal.status == ProposalStatus.PASSED)
        )
        total_proposals = await self.db.scalar(select(func.count(Proposal.id)))

        total_voters_active = active_voters or 1
        total_proposals_count = total_proposals or 0
        open_count = open_proposals or 0
        passed_count = passed_proposals or 0
        device_count = total_devices or 0

        return GovernanceStats(
            total_devices=device_count,
            active_voters=active_voters or 0,
            open_proposals=open_count,
            passed_proposals=passed_count,
            total_proposals=total_proposals_count,
            voter_turnout_pct=round((open_count / max(total_voters_active, 1)) * 100, 2),
        )

    async def get_active_proposals(self) -> list[ProposalResponse]:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Proposal).where(
                Proposal.status == ProposalStatus.ACTIVE,
            ).order_by(Proposal.created_at.desc())
        )
        proposals = result.scalars().all()

        responses = []
        for p in proposals:
            resp = ProposalResponse.model_validate(p)
            remaining = (p.voting_ends_at - now).total_seconds() / 86400
            resp.time_remaining_days = max(0.0, round(remaining, 2))
            if remaining <= 0 and p.status == ProposalStatus.ACTIVE:
                tally = await self.tally_votes(p.id)
                if tally["passed"]:
                    p.status = ProposalStatus.PASSED
                else:
                    p.status = ProposalStatus.REJECTED
                await self.db.flush()
                resp.status = p.status.value
            responses.append(resp)

        return responses

    async def get_proposals(
        self,
        status_filter: Optional[str] = None,
    ) -> list[ProposalResponse]:
        now = datetime.now(timezone.utc)
        query = select(Proposal)

        if status_filter and status_filter != "all":
            try:
                ps = ProposalStatus(status_filter)
                query = query.where(Proposal.status == ps)
            except ValueError:
                pass

        query = query.order_by(Proposal.created_at.desc())
        result = await self.db.execute(query)
        proposals = result.scalars().all()

        responses = []
        for p in proposals:
            resp = ProposalResponse.model_validate(p)
            remaining = (p.voting_ends_at - now).total_seconds() / 86400
            resp.time_remaining_days = max(0.0, round(remaining, 2))
            if remaining <= 0 and p.status == ProposalStatus.ACTIVE:
                tally = await self.tally_votes(p.id)
                if tally["passed"]:
                    p.status = ProposalStatus.PASSED
                else:
                    p.status = ProposalStatus.REJECTED
                await self.db.flush()
                resp.status = p.status.value
            responses.append(resp)

        return responses

    async def get_proposal_detail(self, proposal_id: str) -> ProposalResponse:
        proposal = await self._get_proposal(proposal_id)
        now = datetime.now(timezone.utc)
        resp = ProposalResponse.model_validate(proposal)
        remaining = (proposal.voting_ends_at - now).total_seconds() / 86400
        resp.time_remaining_days = max(0.0, round(remaining, 2))

        if remaining <= 0 and proposal.status == ProposalStatus.ACTIVE:
            tally = await self.tally_votes(proposal_id)
            if tally["passed"]:
                proposal.status = ProposalStatus.PASSED
            else:
                proposal.status = ProposalStatus.REJECTED
            await self.db.flush()
            resp.status = proposal.status.value

        return resp
