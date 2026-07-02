import hashlib
import hmac
import math
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.fintech import User
from app.models.token import (
    TokenAccount,
    TokenTransaction,
    EmergencyListing,
    EmergencyOrder,
    TokenPool,
    TokenTier,
    TransactionType,
    ListingStatus,
    OrderStatus,
    PoolType,
    GoodsType,
    UnitType,
)


def _sign_transaction(
    from_id: str | None,
    to_id: str | None,
    amount: Decimal,
    tx_type: str,
    nonce: str,
) -> str:
    raw = f"{from_id or ''}:{to_id or ''}:{amount}:{tx_type}:{nonce}:{settings.SECRET_KEY}"
    return hmac.new(
        settings.SECRET_KEY.encode(),
        raw.encode(),
        hashlib.sha256,
    ).hexdigest()


def _calculate_tier(total_earned: Decimal) -> TokenTier:
    if total_earned >= Decimal("10000"):
        return TokenTier.PLATINUM
    if total_earned >= Decimal("1000"):
        return TokenTier.GOLD
    if total_earned >= Decimal("100"):
        return TokenTier.SILVER
    return TokenTier.BRONZE


def _get_tier_benefits(tier: TokenTier) -> dict[str, Any]:
    benefits = {
        TokenTier.BRONZE: {"reward_multiplier": 1.0, "vote_weight": 1.0, "listing_fee_discount": 0.0},
        TokenTier.SILVER: {"reward_multiplier": 1.2, "vote_weight": 1.5, "listing_fee_discount": 0.1},
        TokenTier.GOLD: {"reward_multiplier": 1.5, "vote_weight": 2.5, "listing_fee_discount": 0.2},
        TokenTier.PLATINUM: {"reward_multiplier": 2.0, "vote_weight": 4.0, "listing_fee_discount": 0.3},
    }
    return benefits.get(tier, benefits[TokenTier.BRONZE])


class TokenService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_account(self, user_id: str) -> TokenAccount:
        result = await self.db.execute(
            select(TokenAccount).where(TokenAccount.user_id == user_id)
        )
        account = result.scalars().first()
        if account is None:
            account = TokenAccount(user_id=user_id)
            self.db.add(account)
            await self.db.flush()
            await self.db.refresh(account)
        return account

    async def credit_tokens(
        self,
        user_id: str,
        amount: Decimal,
        tx_type: TransactionType,
        reference_id: str | None = None,
        description: str | None = None,
    ) -> TokenTransaction:
        account = await self.get_or_create_account(user_id)
        benefits = _get_tier_benefits(account.tier)
        adjusted = (amount * Decimal(str(benefits["reward_multiplier"]))).quantize(Decimal("0.000001"))

        nonce = str(datetime.now(timezone.utc).timestamp())
        signature = _sign_transaction(None, account.id, adjusted, tx_type.value, nonce)

        tx = TokenTransaction(
            to_account_id=account.id,
            amount=adjusted,
            transaction_type=tx_type,
            reference_id=reference_id,
            description=description,
            signature=signature,
        )
        self.db.add(tx)

        account.balance += adjusted
        account.lifetime_earned += adjusted
        account.tier = _calculate_tier(account.lifetime_earned)

        await self.db.flush()
        await self.db.refresh(tx)
        return tx

    async def debit_tokens(
        self,
        user_id: str,
        amount: Decimal,
        tx_type: TransactionType,
        reference_id: str | None = None,
        description: str | None = None,
    ) -> TokenTransaction:
        account = await self.get_or_create_account(user_id)

        if account.balance < amount:
            raise ValueError("Số dư token không đủ")

        nonce = str(datetime.now(timezone.utc).timestamp())
        signature = _sign_transaction(account.id, None, amount, tx_type.value, nonce)

        tx = TokenTransaction(
            from_account_id=account.id,
            amount=amount,
            transaction_type=tx_type,
            reference_id=reference_id,
            description=description,
            signature=signature,
        )
        self.db.add(tx)

        account.balance -= amount
        account.lifetime_spent += amount

        await self.db.flush()
        await self.db.refresh(tx)
        return tx

    async def transfer_tokens(
        self,
        from_id: str,
        to_id: str,
        amount: Decimal,
        description: str | None = None,
    ) -> TokenTransaction:
        account_from = await self.get_or_create_account(from_id)
        account_to = await self.get_or_create_account(to_id)

        if account_from.balance < amount:
            raise ValueError("Số dư token không đủ")

        nonce = str(datetime.now(timezone.utc).timestamp())
        signature = _sign_transaction(account_from.id, account_to.id, amount, "transfer", nonce)

        tx = TokenTransaction(
            from_account_id=account_from.id,
            to_account_id=account_to.id,
            amount=amount,
            transaction_type=TransactionType.EXCHANGE_GOODS,
            description=description or "Chuyển token",
            signature=signature,
        )
        self.db.add(tx)

        account_from.balance -= amount
        account_from.lifetime_spent += amount
        account_to.balance += amount
        account_to.lifetime_earned += amount

        account_from.tier = _calculate_tier(account_from.lifetime_earned)
        account_to.tier = _calculate_tier(account_to.lifetime_earned)

        await self.db.flush()
        await self.db.refresh(tx)
        return tx

    async def get_balance(self, user_id: str) -> Decimal:
        account = await self.get_or_create_account(user_id)
        return account.balance

    async def get_account(self, user_id: str) -> TokenAccount:
        return await self.get_or_create_account(user_id)

    async def get_transaction_history(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        account = await self.get_or_create_account(user_id)

        conditions = or_(
            TokenTransaction.from_account_id == account.id,
            TokenTransaction.to_account_id == account.id,
        )

        count_q = select(func.count(TokenTransaction.id)).where(conditions)
        total = (await self.db.execute(count_q)).scalar() or 0

        offset = (page - 1) * page_size
        q = (
            select(TokenTransaction)
            .where(conditions)
            .order_by(desc(TokenTransaction.created_at))
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(q)
        items = result.scalars().all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, math.ceil(total / page_size)) if page_size > 0 else 0,
        }

    async def calculate_tier(self, total_earned: Decimal) -> TokenTier:
        return _calculate_tier(total_earned)

    async def create_listing(
        self, seller_id: str, data: dict[str, Any]
    ) -> EmergencyListing:
        seller_account = await self.get_or_create_account(seller_id)

        expires_at = datetime.now(timezone.utc) + timedelta(hours=data["expires_hours"])

        listing = EmergencyListing(
            seller_id=seller_account.id,
            goods_type=GoodsType(data["goods_type"]),
            quantity=Decimal(str(data["quantity"])),
            unit=UnitType(data["unit"]),
            price_per_unit=Decimal(str(data["price_per_unit"])),
            location_zone=data["location_zone"],
            description=data.get("description"),
            expires_at=expires_at,
        )
        self.db.add(listing)
        await self.db.flush()
        await self.db.refresh(listing)
        return listing

    async def match_order(
        self, buyer_id: str, listing_id: str, quantity: Decimal
    ) -> EmergencyOrder:
        buyer_account = await self.get_or_create_account(buyer_id)

        result = await self.db.execute(
            select(EmergencyListing).where(
                EmergencyListing.id == listing_id,
                EmergencyListing.status == ListingStatus.ACTIVE,
            )
        )
        listing = result.scalars().first()
        if listing is None:
            raise ValueError("Danh sách không tồn tại hoặc đã hết hạn")

        if quantity > listing.quantity:
            raise ValueError(f"Số lượng yêu cầu vượt quá số lượng có sẵn ({listing.quantity})")

        total_cost = (quantity * listing.price_per_unit).quantize(Decimal("0.000001"))

        if buyer_account.balance < total_cost:
            raise ValueError("Số dư token không đủ")

        nonce = str(datetime.now(timezone.utc).timestamp())
        sig = _sign_transaction(buyer_account.id, listing.seller_id, total_cost, "escrow", nonce)

        buyer_account.balance -= total_cost
        buyer_account.lifetime_spent += total_cost
        buyer_account.tier = _calculate_tier(buyer_account.lifetime_earned)

        escrow_tx = TokenTransaction(
            from_account_id=buyer_account.id,
            amount=total_cost,
            transaction_type=TransactionType.EXCHANGE_GOODS,
            description=f"Ký quỹ mua hàng từ listing {listing_id}",
            signature=sig,
        )
        self.db.add(escrow_tx)

        listing.quantity -= quantity
        if listing.quantity <= Decimal("0"):
            listing.status = ListingStatus.FULFILLED

        order = EmergencyOrder(
            listing_id=listing_id,
            buyer_id=buyer_account.id,
            quantity=quantity,
            total_tokens=total_cost,
            status=OrderStatus.MATCHED,
        )
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)
        return order

    async def fulfill_order(self, order_id: str) -> EmergencyOrder:
        result = await self.db.execute(
            select(EmergencyOrder).where(EmergencyOrder.id == order_id)
        )
        order = result.scalars().first()
        if order is None:
            raise ValueError("Đơn hàng không tồn tại")

        if order.status != OrderStatus.MATCHED:
            raise ValueError("Đơn hàng không ở trạng thái khớp lệnh")

        order.status = OrderStatus.FULFILLED
        order.fulfilled_at = datetime.now(timezone.utc)
        order.escrow_release = True

        seller_result = await self.db.execute(
            select(TokenAccount).where(
                TokenAccount.id == order.listing.seller_id
            )
        )
        seller = seller_result.scalars().first()
        if seller:
            seller.balance += order.total_tokens
            seller.lifetime_earned += order.total_tokens
            seller.tier = _calculate_tier(seller.lifetime_earned)

        release_nonce = str(datetime.now(timezone.utc).timestamp())
        release_sig = _sign_transaction(
            None, order.listing.seller_id, order.total_tokens, "escrow_release", release_nonce
        )
        release_tx = TokenTransaction(
            to_account_id=order.listing.seller_id,
            amount=order.total_tokens,
            transaction_type=TransactionType.EXCHANGE_GOODS,
            reference_id=order_id,
            description=f"Giải phóng ký quỹ đơn hàng {order_id}",
            signature=release_sig,
        )
        self.db.add(release_tx)

        await self.db.flush()
        await self.db.refresh(order)
        return order

    async def get_market_stats(self) -> dict[str, Any]:
        total_supply_q = select(func.coalesce(func.sum(TokenAccount.balance), 0))
        total_supply = (await self.db.execute(total_supply_q)).scalar()

        active_listings_q = select(func.count(EmergencyListing.id)).where(
            EmergencyListing.status == ListingStatus.ACTIVE
        )
        active_listings = (await self.db.execute(active_listings_q)).scalar() or 0

        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        trades_q = select(func.count(TokenTransaction.id)).where(
            TokenTransaction.transaction_type == TransactionType.EXCHANGE_GOODS,
            TokenTransaction.created_at >= cutoff,
        )
        trades_24h = (await self.db.execute(trades_q)).scalar() or 0

        reserve_q = select(TokenPool.balance).where(
            TokenPool.pool_type == PoolType.EMERGENCY_RESERVE
        )
        reserve = (await self.db.execute(reserve_q)).scalar() or Decimal("0")

        accounts_q = select(func.count(TokenAccount.id))
        total_accounts = (await self.db.execute(accounts_q)).scalar() or 0

        return {
            "total_supply": total_supply,
            "active_listings": active_listings,
            "trades_24h": trades_24h,
            "emergency_reserve": reserve,
            "total_accounts": total_accounts,
        }

    async def issue_emergency_aid(
        self, zone: str, amount_per_device: Decimal
    ) -> list[TokenTransaction]:
        result = await self.db.execute(
            select(TokenAccount)
            .join(User, TokenAccount.user_id == User.id)
            .where(User.address.contains(zone))
        )
        accounts = result.scalars().all()

        txs = []
        for account in accounts:
            tx = await self.credit_tokens(
                user_id=account.user_id,
                amount=amount_per_device,
                tx_type=TransactionType.EMERGENCY_AID,
                reference_id=f"aid_{zone}",
                description=f"Hỗ trợ khẩn cấp khu vực {zone}",
            )
            txs.append(tx)
        return txs

    async def get_tier_benefits(self, tier: TokenTier) -> dict[str, Any]:
        return _get_tier_benefits(tier)

    async def get_active_listings(
        self,
        goods_type: str | None = None,
        zone: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        conditions = [EmergencyListing.status == ListingStatus.ACTIVE]

        if goods_type:
            conditions.append(EmergencyListing.goods_type == GoodsType(goods_type))
        if zone:
            conditions.append(EmergencyListing.location_zone.ilike(f"%{zone}%"))

        count_q = select(func.count(EmergencyListing.id)).where(and_(*conditions))
        total = (await self.db.execute(count_q)).scalar() or 0

        offset = (page - 1) * page_size
        q = (
            select(EmergencyListing)
            .where(and_(*conditions))
            .order_by(desc(EmergencyListing.created_at))
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(q)
        listings = result.scalars().all()

        now = datetime.now(timezone.utc)
        items = []
        for listing in listings:
            remaining = (listing.expires_at - now).total_seconds() / 3600
            seller_name = listing.seller.user.full_name if listing.seller and listing.seller.user else None
            items.append({
                "id": listing.id,
                "seller_id": listing.seller_id,
                "goods_type": listing.goods_type.value,
                "quantity": listing.quantity,
                "unit": listing.unit.value,
                "price_per_unit": listing.price_per_unit,
                "location_zone": listing.location_zone,
                "status": listing.status.value,
                "description": listing.description,
                "created_at": listing.created_at,
                "expires_at": listing.expires_at,
                "seller_name": seller_name,
                "time_remaining_hours": round(max(0, remaining), 1),
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, math.ceil(total / page_size)) if page_size > 0 else 0,
        }

    async def get_user_orders(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        account = await self.get_or_create_account(user_id)
        conditions = or_(
            EmergencyOrder.buyer_id == account.id,
            EmergencyOrder.listing.has(seller_id=account.id),
        )

        count_q = select(func.count(EmergencyOrder.id)).where(conditions)
        total = (await self.db.execute(count_q)).scalar() or 0

        offset = (page - 1) * page_size
        q = (
            select(EmergencyOrder)
            .where(conditions)
            .order_by(desc(EmergencyOrder.created_at))
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(q)
        orders = result.scalars().all()

        items = []
        for order in orders:
            items.append({
                "id": order.id,
                "listing_id": order.listing_id,
                "buyer_id": order.buyer_id,
                "quantity": order.quantity,
                "total_tokens": order.total_tokens,
                "status": order.status.value,
                "escrow_release": order.escrow_release,
                "created_at": order.created_at,
                "fulfilled_at": order.fulfilled_at,
                "listing_goods_type": order.listing.goods_type.value if order.listing else None,
                "listing_location_zone": order.listing.location_zone if order.listing else None,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, math.ceil(total / page_size)) if page_size > 0 else 0,
        }

    async def get_listing_detail(self, listing_id: str) -> dict[str, Any] | None:
        result = await self.db.execute(
            select(EmergencyListing).where(EmergencyListing.id == listing_id)
        )
        listing = result.scalars().first()
        if listing is None:
            return None

        now = datetime.now(timezone.utc)
        remaining = (listing.expires_at - now).total_seconds() / 3600
        seller_name = listing.seller.user.full_name if listing.seller and listing.seller.user else None

        return {
            "id": listing.id,
            "seller_id": listing.seller_id,
            "goods_type": listing.goods_type.value,
            "quantity": listing.quantity,
            "unit": listing.unit.value,
            "price_per_unit": listing.price_per_unit,
            "location_zone": listing.location_zone,
            "status": listing.status.value,
            "description": listing.description,
            "created_at": listing.created_at,
            "expires_at": listing.expires_at,
            "seller_name": seller_name,
            "time_remaining_hours": round(max(0, remaining), 1),
        }
