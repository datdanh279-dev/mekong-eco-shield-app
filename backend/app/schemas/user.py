from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, EmailStr, Field, model_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = None
    organization: str | None = None
    role: str = "farmer"

    @model_validator(mode="after")
    def validate_role(self) -> "UserCreate":
        allowed = {"farmer", "investor", "financial_institution", "government", "ngo", "admin", "analyst"}
        if self.role.lower() not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        self.role = self.role.lower()
        return self


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    organization: str | None = None
    address: str | None = None
    avatar_url: str | None = None
    preferences: dict[str, Any] | None = None
    notification_channels: dict[str, Any] | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: str | None = None
    role: str
    status: str
    organization: str | None = None
    avatar_url: str | None = None
    address: str | None = None
    kyc_status: str
    email_verified_at: datetime | None = None
    last_login_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefresh(BaseModel):
    refresh_token: str


class PaginatedUsers(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
