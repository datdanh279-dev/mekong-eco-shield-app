from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Index, Enum as SQLEnum, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
import enum


class TokenTier(str, enum.Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class TransactionType(str, enum.Enum):
    MESH_CONTRIBUTION = "mesh_contribution"
    DATA_CONTRIBUTION = "data_contribution"
    ALERT_RESPONSE = "alert_response"
    REFERRAL = "referral"
    EMERGENCY_AID = "emergency_aid"
    EXCHANGE_GOODS = "exchange_goods"
    GOVERNANCE_REWARD = "governance_reward"


class GoodsType(str, enum.Enum):
    RICE = "rice"
    WATER = "water"
    FLOATATION = "floatation"
    MEDICINE = "medicine"
    FUEL = "fuel"
    SHELTER = "shelter"
    OTHER = "other"


class UnitType(str, enum.Enum):
    KG = "kg"
    LITER = "liter"
    PIECE = "piece"
    PACK = "pack"


class ListingStatus(str, enum.Enum):
    ACTIVE = "active"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    MATCHED = "matched"
    FULFILLED = "fulfilled"
    DISPUTED = "disputed"


class PoolType(str, enum.Enum):
    EMERGENCY_RESERVE = "emergency_reserve"
    COMMUNITY_REWARD = "community_reward"
    GOVERNANCE = "governance"


class TokenAccount(Base, TimestampMixin):
    __tablename__ = "token_accounts"
    __table_args__ = (
        Index("ix_token_accounts_user_id", "user_id", unique=True),
        Index("ix_token_accounts_tier", "tier"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False, default=Decimal("0")
    )
    lifetime_earned: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False, default=Decimal("0")
    )
    lifetime_spent: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False, default=Decimal("0")
    )
    tier: Mapped[TokenTier] = mapped_column(
        SQLEnum(TokenTier), nullable=False, default=TokenTier.BRONZE
    )

    user = relationship("User", backref="token_account", lazy="joined")
    sent_transactions: Mapped[list["TokenTransaction"]] = relationship(
        back_populates="from_account", foreign_keys="TokenTransaction.from_account_id"
    )
    received_transactions: Mapped[list["TokenTransaction"]] = relationship(
        back_populates="to_account", foreign_keys="TokenTransaction.to_account_id"
    )


class TokenTransaction(Base, TimestampMixin):
    __tablename__ = "token_transactions"
    __table_args__ = (
        Index("ix_token_tx_from", "from_account_id"),
        Index("ix_token_tx_to", "to_account_id"),
        Index("ix_token_tx_type", "transaction_type"),
        Index("ix_token_tx_created", "created_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    from_account_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("token_accounts.id", ondelete="SET NULL"), nullable=True
    )
    to_account_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("token_accounts.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False
    )
    transaction_type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType), nullable=False
    )
    reference_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    signature: Mapped[str] = mapped_column(
        String(128), nullable=False
    )

    from_account: Mapped[Optional["TokenAccount"]] = relationship(
        back_populates="sent_transactions",
        foreign_keys=[from_account_id],
        lazy="joined",
    )
    to_account: Mapped[Optional["TokenAccount"]] = relationship(
        back_populates="received_transactions",
        foreign_keys=[to_account_id],
        lazy="joined",
    )


class EmergencyListing(Base, TimestampMixin):
    __tablename__ = "emergency_listings"
    __table_args__ = (
        Index("ix_listing_seller", "seller_id"),
        Index("ix_listing_goods_type", "goods_type"),
        Index("ix_listing_status", "status"),
        Index("ix_listing_zone", "location_zone"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    seller_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("token_accounts.id", ondelete="CASCADE"), nullable=False
    )
    goods_type: Mapped[GoodsType] = mapped_column(
        SQLEnum(GoodsType), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    unit: Mapped[UnitType] = mapped_column(
        SQLEnum(UnitType), nullable=False
    )
    price_per_unit: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False
    )
    location_zone: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    status: Mapped[ListingStatus] = mapped_column(
        SQLEnum(ListingStatus), nullable=False, default=ListingStatus.ACTIVE
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    seller = relationship("TokenAccount", backref="listings", lazy="joined")
    orders: Mapped[list["EmergencyOrder"]] = relationship(back_populates="listing")


class EmergencyOrder(Base, TimestampMixin):
    __tablename__ = "emergency_orders"
    __table_args__ = (
        Index("ix_order_listing", "listing_id"),
        Index("ix_order_buyer", "buyer_id"),
        Index("ix_order_status", "status"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    listing_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("emergency_listings.id", ondelete="CASCADE"), nullable=False
    )
    buyer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("token_accounts.id", ondelete="CASCADE"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    total_tokens: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False
    )
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus), nullable=False, default=OrderStatus.PENDING
    )
    fulfilled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    escrow_release: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    listing = relationship("EmergencyListing", back_populates="orders", lazy="joined")
    buyer = relationship("TokenAccount", backref="orders", lazy="joined")


class TokenPool(Base, TimestampMixin):
    __tablename__ = "token_pools"
    __table_args__ = (
        Index("ix_pool_type", "pool_type", unique=True),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    pool_type: Mapped[PoolType] = mapped_column(
        SQLEnum(PoolType), nullable=False, unique=True
    )
    balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False, default=Decimal("0")
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
