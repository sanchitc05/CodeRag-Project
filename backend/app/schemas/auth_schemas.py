"""Pydantic request/response models for authentication endpoints."""

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    username: str | None = None
    full_name: str | None = None


class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    username: str | None = None


class UserProfileResponse(BaseModel):
    id: int
    email: str
    username: str | None = None
    full_name: str | None = None

    class Config:
        from_attributes = True
