from pydantic import BaseModel, UUID4, EmailStr, field_validator, model_validator
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    full_name: str
    password: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    preferred_language: str = "en"

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @model_validator(mode="after")
    def at_least_one_identifier(self):
        if not self.phone and not self.email:
            raise ValueError("Provide at least a phone number or an email to register")
        return self


class UserLogin(BaseModel):
    # Farmers may not have email in rural areas — allow login via phone or email.
    identifier: str  # phone or email
    password: str


class UserResponse(BaseModel):
    id: UUID4
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    preferred_language: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
