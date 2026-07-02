from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class CreditApplicationCreate(BaseModel):
    farm_id: str
    requested_amount_vnd: float = Field(gt=0)
    purpose: str = Field(min_length=1, max_length=1000)
    loan_term_months: int = Field(gt=0, le=360)
    collateral_description: str | None = None
    additional_data: dict[str, Any] = {}


class CreditApplicationResponse(BaseModel):
    id: str
    applicant_id: str
    farm_id: str
    status: str
    requested_amount_vnd: float
    purpose: str
    loan_term_months: int
    collateral_description: str | None = None
    score: float | None = None
    decision: str | None = None
    decided_by: str | None = None
    decided_at: datetime | None = None
    additional_data: dict[str, Any] = {}
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class GreenCreditScoreResponse(BaseModel):
    id: str
    user_id: str | None = None
    farm_id: str | None = None
    score: float
    score_model: str
    model_version: str
    factors: dict[str, Any] = {}
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaginatedCreditApplications(BaseModel):
    items: list[CreditApplicationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedCreditScores(BaseModel):
    items: list[GreenCreditScoreResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
