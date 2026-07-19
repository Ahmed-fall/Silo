from fastapi import APIRouter, Depends
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.device import DeviceRegister, DeviceResponse

router = APIRouter(prefix="/devices", tags=["devices"])


@router.post("/register", response_model=DeviceResponse)
async def register_device(payload: DeviceRegister, current_user: dict = Depends(get_current_user)):
    """Called by the Flutter app once it has an FCM token, so alerts on the
    farmer's silo(s) can be pushed even when the app is backgrounded (the
    /ws/alerts websocket only works while the app is foregrounded/connected)."""
    db = await get_db()
    row = await db.fetchrow(
        """
        INSERT INTO device_tokens (user_id, token, platform)
        VALUES ($1, $2, $3)
        ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform
        RETURNING *
        """,
        current_user["id"],
        payload.token,
        payload.platform,
    )
    return dict(row)
