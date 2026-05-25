from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)
    regionId: Literal["chuncheon-north", "chuncheon-east"]


class SignupRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    department: str = Field(min_length=1)
    regionId: Literal["chuncheon-north", "chuncheon-east"]
