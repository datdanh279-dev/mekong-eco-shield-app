from datetime import datetime, timedelta
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class DeviceCreate(BaseModel):
    device_fingerprint: str = Field(..., min_length=1, max_length=512)


class DeviceResponse(BaseModel):
    id: str
    device_fingerprint: str
    user_id: str
    is_active: bool
    first_seen_at: datetime
    last_seen_at: datetime
    vote_power: float

    model_config = {"from_attributes": True}


class ProposalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    proposal_type: str = Field(...)
    target_param: Optional[dict[str, Any]] = None
    voting_days: int = Field(default=7, ge=1, le=90)

    @field_validator("proposal_type")
    @classmethod
    def validate_proposal_type(cls, v: str) -> str:
        allowed = {"algorithm_update", "fund_allocation", "system_parameter", "emergency_action"}
        if v not in allowed:
            raise ValueError(f"proposal_type must be one of: {', '.join(sorted(allowed))}")
        return v


class ProposalResponse(BaseModel):
    id: str
    title: str
    description: str
    proposal_type: str
    target_param: Optional[dict[str, Any]] = None
    status: str
    created_by: str
    created_at: datetime
    voting_ends_at: datetime
    yes_votes: float
    no_votes: float
    total_votes: float
    required_threshold: float
    time_remaining_days: Optional[float] = None

    model_config = {"from_attributes": True}


class VoteRequest(BaseModel):
    proposal_id: str = Field("", description="Overridden by path param")
    vote: str = Field(...)
    device_fingerprint: str = Field(..., min_length=1)

    @field_validator("vote")
    @classmethod
    def validate_vote(cls, v: str) -> str:
        if v not in ("yes", "no", "abstain"):
            raise ValueError("vote must be 'yes', 'no', or 'abstain'")
        return v


class VoteResponse(BaseModel):
    id: str
    proposal_id: str
    device_id: str
    vote: str
    vote_power: float
    voted_at: datetime
    vote_signature: str

    model_config = {"from_attributes": True}


class GovernanceStats(BaseModel):
    total_devices: int
    active_voters: int
    open_proposals: int
    passed_proposals: int
    total_proposals: int
    voter_turnout_pct: float
