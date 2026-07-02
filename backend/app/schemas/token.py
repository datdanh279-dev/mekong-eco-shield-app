from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


class TokenAccountResponse(BaseModel):
    id: str
    user_id: str
    balance: Decimal
    lifetime_earned: Decimal
    lifetime_spent: Decimal
    tier: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class TokenTransactionResponse(BaseModel):
    id: str
    from_account_id: str | None = None
    to_account_id: str | None = None
    amount: Decimal
    transaction_type: str
    reference_id: str | None = None
    description: str | None = None
    signature: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaginatedTokenTransactions(BaseModel):
    items: list[TokenTransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TokenTransferRequest(BaseModel):
    to_user_id: str
    amount: Decimal = Field(gt=0)
    description: str | None = None


class EmergencyListingCreate(BaseModel):
    goods_type: str
    quantity: Decimal = Field(gt=0)
    unit: str
    price_per_unit: Decimal = Field(gt=0)
    location_zone: str
    description: str | None = None
    expires_hours: int = Field(default=72, ge=1, le=720)


class EmergencyListingResponse(BaseModel):
    id: str
    seller_id: str
    goods_type: str
    quantity: Decimal
    unit: str
    price_per_unit: Decimal
    location_zone: str
    status: str
    description: str | None = None
    created_at: datetime | None = None
    expires_at: datetime | None = None
    seller_name: str | None = None
    time_remaining_hours: float | None = None

    model_config = {"from_attributes": True}


class EmergencyOrderCreate(BaseModel):
    listing_id: str
    quantity: Decimal = Field(gt=0)


class EmergencyOrderResponse(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    quantity: Decimal
    total_tokens: Decimal
    status: str
    escrow_release: bool
    created_at: datetime | None = None
    fulfilled_at: datetime | None = None
    listing_goods_type: str | None = None
    listing_location_zone: str | None = None

    model_config = {"from_attributes": True}


class PaginatedEmergencyOrders(BaseModel):
    items: list[EmergencyOrderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TokenMarketStats(BaseModel):
    total_supply: Decimal
    active_listings: int
    trades_24h: int
    emergency_reserve: Decimal
    total_accounts: int


class TierBenefits(BaseModel):
    tier: str
    reward_multiplier: float
    vote_weight: float
    listing_fee_discount: float


class ContributionRequest(BaseModel):
    reference_id: str | None = None
    description: str | None = None
