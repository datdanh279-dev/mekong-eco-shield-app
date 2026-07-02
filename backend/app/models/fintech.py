from datetime import datetime
from typing import Optional, List
from uuid import uuid4
from decimal import Decimal

from sqlalchemy import (
    String, Text, Float, Integer, Boolean, DateTime, ForeignKey, Index, Enum as SQLEnum,
    JSON, Numeric, Date, func, CheckConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin, SoftDeleteMixin
import enum


class UserRole(str, enum.Enum):
    FARMER = "farmer"
    INVESTOR = "investor"
    FINANCIAL_INSTITUTION = "financial_institution"
    GOVERNMENT = "government"
    NGO = "ngo"
    ADMIN = "admin"
    ANALYST = "analyst"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_VERIFICATION = "pending_verification"
    SUSPENDED = "suspended"


class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_email", "email", unique=True),
        Index("ix_users_phone", "phone", unique=True),
        Index("ix_users_role_status", "role", "status"),
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False, default=UserRole.FARMER)
    status: Mapped[UserStatus] = mapped_column(SQLEnum(UserStatus), nullable=False, default=UserStatus.PENDING_VERIFICATION)

    organization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    kyc_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    kyc_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    kyc_documents: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    notification_channels: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    phone_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    farms: Mapped[List["Farm"]] = relationship(back_populates="owner", foreign_keys="Farm.owner_id")
    credit_applications: Mapped[List["CreditApplication"]] = relationship(back_populates="applicant")
    investments: Mapped[List["Investment"]] = relationship(back_populates="investor")
    esg_assessments: Mapped[List["ESGAssessment"]] = relationship(back_populates="assessor")
    alerts_subscriptions: Mapped[List["AlertSubscription"]] = relationship(back_populates="user")


class CreditScoreModel(str, enum.Enum):
    XGBOOST_V1 = "xgboost_v1"
    LIGHTGBM_V1 = "lightgbm_v1"
    ENSEMBLE_V1 = "ensemble_v1"


class GreenCreditScore(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "green_credit_scores"