from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import (
    String, Text, Float, Integer, Boolean, DateTime, ForeignKey, Index, Enum as SQLEnum,
    JSON, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
import enum


class ProposalType(str, enum.Enum):
    ALGORITHM_UPDATE = "algorithm_update"
    FUND_ALLOCATION = "fund_allocation"
    SYSTEM_PARAMETER = "system_parameter"
    EMERGENCY_ACTION = "emergency_action"


class ProposalStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PASSED = "passed"
    REJECTED = "rejected"
    EXECUTED = "executed"


class VoteType(str, enum.Enum):
    YES = "yes"
    NO = "no"
    ABSTAIN = "abstain"


class Device(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "governance_devices"
    __table_args__ = (
        Index("ix_device_fingerprint", "device_fingerprint", unique=True),
        Index("ix_device_user", "user_id"),
    )

    device_fingerprint: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    vote_power: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    votes: Mapped[List["Vote"]] = relationship(back_populates="device")


class Proposal(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "governance_proposals"
    __table_args__ = (
        Index("ix_proposal_status", "status"),
        Index("ix_proposal_creator", "created_by"),
    )

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    proposal_type: Mapped[ProposalType] = mapped_column(SQLEnum(ProposalType), nullable=False)
    target_param: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[ProposalStatus] = mapped_column(SQLEnum(ProposalStatus), nullable=False, default=ProposalStatus.PENDING)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    voting_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    yes_votes: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    no_votes: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_votes: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    required_threshold: Mapped[float] = mapped_column(Float, default=51.0, nullable=False)

    votes: Mapped[List["Vote"]] = relationship(back_populates="proposal")


class Vote(Base, UUIDMixin):
    __tablename__ = "governance_votes"
    __table_args__ = (
        Index("ix_vote_proposal", "proposal_id"),
        Index("ix_vote_device", "device_id"),
        Index("ix_vote_unique", "proposal_id", "device_id", unique=True),
    )

    proposal_id: Mapped[str] = mapped_column(ForeignKey("governance_proposals.id"), nullable=False)
    device_id: Mapped[str] = mapped_column(ForeignKey("governance_devices.id"), nullable=False)
    vote: Mapped[VoteType] = mapped_column(SQLEnum(VoteType), nullable=False)
    vote_power: Mapped[float] = mapped_column(Float, nullable=False)
    voted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    vote_signature: Mapped[str] = mapped_column(String(128), nullable=False)

    proposal: Mapped["Proposal"] = relationship(back_populates="votes")
    device: Mapped["Device"] = relationship(back_populates="votes")
