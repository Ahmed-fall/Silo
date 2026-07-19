from fastapi import APIRouter, HTTPException, Depends, status
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import UserRegister, UserLogin, UserResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    db = await get_db()

    if payload.email:
        existing = await db.fetchrow("SELECT id FROM users WHERE email = $1", payload.email)
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")
    if payload.phone:
        existing = await db.fetchrow("SELECT id FROM users WHERE phone = $1", payload.phone)
        if existing:
            raise HTTPException(status_code=409, detail="An account with this phone number already exists")

    row = await db.fetchrow(
        """
        INSERT INTO users (full_name, phone, email, password_hash, preferred_language)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        payload.full_name,
        payload.phone,
        payload.email,
        hash_password(payload.password),
        payload.preferred_language,
    )

    # Mock onboarding: until the government "install silo + hand farmer a
    # claim code" flow ships, give every new farmer 1-2 unclaimed demo silos
    # so their dashboard isn't empty on first login.
    await db.execute(
        """
        UPDATE silos SET owner_id = $1
        WHERE id IN (SELECT id FROM silos WHERE owner_id IS NULL ORDER BY created_at LIMIT 2)
        """,
        row["id"],
    )

    token = create_access_token(row["id"])
    return TokenResponse(access_token=token, user=UserResponse(**dict(row)))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    db = await get_db()

    row = await db.fetchrow(
        "SELECT * FROM users WHERE email = $1 OR phone = $1",
        payload.identifier,
    )
    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect phone/email or password")

    token = create_access_token(row["id"])
    return TokenResponse(access_token=token, user=UserResponse(**dict(row)))


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)
