from typing import Literal

from pydantic import BaseModel, model_validator

from app.enums import Role
from app.schemas.auth import UserOut


class UserUpdate(BaseModel):
    role: Role | None = None
    status: Literal["active", "disabled"] | None = None

    @model_validator(mode="after")
    def at_least_one(self):
        if self.role is None and self.status is None:
            raise ValueError("provide role and/or status")
        return self


class UserPage(BaseModel):
    items: list[UserOut]
    total: int
    limit: int
    offset: int