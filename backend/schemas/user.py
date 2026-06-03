from datetime import datetime
from pydantic import BaseModel
from typing import Literal


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: Literal["faculty", "hod"]


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
