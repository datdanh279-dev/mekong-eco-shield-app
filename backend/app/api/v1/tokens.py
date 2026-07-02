from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.fintech import User
from app.schemas.token import (
    TokenAccountResponse,
    TokenTransactionResponse,
    PaginatedTokenTransactions,
    TokenTransferRequest,
    EmergencyListingCreate,
    EmergencyListingResponse,
    EmergencyOrderCreate,
    EmergencyOrderResponse,
    PaginatedEmergencyOrders,
    TokenMarketStats,
    TierBenefits,
    ContributionRequest,
)
from app.services.token_service import TokenService, _get_tier_benefits
from app.models.token import TokenTier, TransactionType

router = APIRouter()


def _get_service(db: Annotated[AsyncSession, Depends(get_db)]) -> TokenService:
    return TokenService(db)


@router.get("/account", response_model=TokenAccountResponse)
async def get_token_account(
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> TokenAccountResponse:
    account = await service.get_account(current_user.id)
    return TokenAccountResponse.model_validate(account)


@router.get("/transactions", response_model=PaginatedTokenTransactions)
async def get_transactions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedTokenTransactions:
    result = await service.get_transaction_history(current_user.id, page, page_size)
    return PaginatedTokenTransactions(
        items=[TokenTransactionResponse.model_validate(t) for t in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )


@router.post("/transfer", response_model=TokenTransactionResponse)
async def transfer_tokens(
    body: TokenTransferRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> TokenTransactionResponse:
    try:
        tx = await service.transfer_tokens(
            from_id=current_user.id,
            to_id=body.to_user_id,
            amount=body.amount,
            description=body.description,
        )
        return TokenTransactionResponse.model_validate(tx)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/market/listings")
async def get_active_listings(
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
    goods_type: str | None = Query(None),
    zone: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    return await service.get_active_listings(goods_type, zone, page, page_size)


@router.post("/market/listings", response_model=EmergencyListingResponse, status_code=201)
async def create_listing(
    body: EmergencyListingCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> EmergencyListingResponse:
    listing = await service.create_listing(
        seller_id=current_user.id,
        data=body.model_dump(),
    )
    return EmergencyListingResponse(
        id=listing.id,
        seller_id=listing.seller_id,
        goods_type=listing.goods_type.value,
        quantity=listing.quantity,
        unit=listing.unit.value,
        price_per_unit=listing.price_per_unit,
        location_zone=listing.location_zone,
        status=listing.status.value,
        description=listing.description,
        created_at=listing.created_at,
        expires_at=listing.expires_at,
    )


@router.get("/market/listings/{listing_id}", response_model=EmergencyListingResponse)
async def get_listing_detail(
    listing_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> EmergencyListingResponse:
    listing = await service.get_listing_detail(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return EmergencyListingResponse(**listing)


@router.post("/market/order", response_model=EmergencyOrderResponse, status_code=201)
async def create_order(
    body: EmergencyOrderCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> EmergencyOrderResponse:
    try:
        order = await service.match_order(
            buyer_id=current_user.id,
            listing_id=body.listing_id,
            quantity=body.quantity,
        )
        return EmergencyOrderResponse(
            id=order.id,
            listing_id=order.listing_id,
            buyer_id=order.buyer_id,
            quantity=order.quantity,
            total_tokens=order.total_tokens,
            status=order.status.value,
            escrow_release=order.escrow_release,
            created_at=order.created_at,
            fulfilled_at=order.fulfilled_at,
            listing_goods_type=order.listing.goods_type.value if order.listing else None,
            listing_location_zone=order.listing.location_zone if order.listing else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/market/orders", response_model=PaginatedEmergencyOrders)
async def get_my_orders(
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedEmergencyOrders:
    result = await service.get_user_orders(current_user.id, page, page_size)
    return PaginatedEmergencyOrders(**result)


@router.post("/market/orders/{order_id}/fulfill", response_model=EmergencyOrderResponse)
async def fulfill_order(
    order_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> EmergencyOrderResponse:
    try:
        order = await service.fulfill_order(order_id)
        return EmergencyOrderResponse(
            id=order.id,
            listing_id=order.listing_id,
            buyer_id=order.buyer_id,
            quantity=order.quantity,
            total_tokens=order.total_tokens,
            status=order.status.value,
            escrow_release=order.escrow_release,
            created_at=order.created_at,
            fulfilled_at=order.fulfilled_at,
            listing_goods_type=order.listing.goods_type.value if order.listing else None,
            listing_location_zone=order.listing.location_zone if order.listing else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/market/stats", response_model=TokenMarketStats)
async def get_market_stats(
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> TokenMarketStats:
    stats = await service.get_market_stats()
    return TokenMarketStats(**stats)


@router.post("/contribute/mesh", response_model=TokenTransactionResponse)
async def reward_mesh_contribution(
    body: ContributionRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> TokenTransactionResponse:
    tx = await service.credit_tokens(
        user_id=current_user.id,
        amount=Decimal("5"),
        tx_type=TransactionType.MESH_CONTRIBUTION,
        reference_id=body.reference_id,
        description=body.description or "Chia sẻ mạng lưới mesh",
    )
    return TokenTransactionResponse.model_validate(tx)


@router.post("/contribute/data", response_model=TokenTransactionResponse)
async def reward_data_contribution(
    body: ContributionRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> TokenTransactionResponse:
    tx = await service.credit_tokens(
        user_id=current_user.id,
        amount=Decimal("10"),
        tx_type=TransactionType.DATA_CONTRIBUTION,
        reference_id=body.reference_id,
        description=body.description or "Đóng góp dữ liệu cảm biến",
    )
    return TokenTransactionResponse.model_validate(tx)


@router.get("/tier-benefits", response_model=TierBenefits)
async def get_tier_benefits(
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[TokenService, Depends(_get_service)],
) -> TierBenefits:
    account = await service.get_account(current_user.id)
    benefits = _get_tier_benefits(account.tier)
    return TierBenefits(
        tier=account.tier.value,
        reward_multiplier=benefits["reward_multiplier"],
        vote_weight=benefits["vote_weight"],
        listing_fee_discount=benefits["listing_fee_discount"],
    )
