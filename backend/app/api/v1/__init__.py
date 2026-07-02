from fastapi import APIRouter

from app.api.v1 import auth, users, farms, sensors, credit, alerts, predictions, mesh, tokens

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(farms.router, prefix="/farms", tags=["Farms"])
router.include_router(sensors.router, prefix="/sensors", tags=["Sensors"])
router.include_router(credit.router, prefix="/credit", tags=["Credit Scoring"])
router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
router.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
router.include_router(mesh.router, prefix="/mesh", tags=["Mesh Network"])
router.include_router(governance.router, prefix="/governance", tags=["Governance"])
router.include_router(tokens.router, prefix="/tokens", tags=["Survival Tokens"])
