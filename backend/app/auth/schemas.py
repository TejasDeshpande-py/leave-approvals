"""Authentication request and response schemas."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.enums import Role, UserStatus


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def require_company_email(cls, email: EmailStr) -> EmailStr:
        if email.rsplit("@", 1)[-1].casefold() != "triconinfotech.com":
            raise ValueError("Email must use the @triconinfotech.com domain")
        return email

    @field_validator("password")
    @classmethod
    def require_password_complexity(cls, password: str) -> str:
        return validate_password_complexity(password)


def validate_password_complexity(password: str) -> str:
    if not any(character.isalpha() for character in password):
        raise ValueError("Password must contain at least one letter")
    if not any(character.isdigit() for character in password):
        raise ValueError("Password must contain at least one digit")
    if not any(character.isupper() for character in password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not any(not character.isalnum() and not character.isspace() for character in password):
        raise ValueError("Password must contain at least one special symbol")
    return password


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password", "confirm_new_password")
    @classmethod
    def require_password_complexity(cls, password: str) -> str:
        return validate_password_complexity(password)

    @model_validator(mode="after")
    def validate_password_change(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("New password and confirmation must match")
        if self.current_password == self.new_password:
            raise ValueError("New password must be different from current password")
        return self


class TokenOut(BaseModel):
    access_token: str
    access_token_expires_in: int
    token_type: str = "bearer"


class MessageOut(BaseModel):
    detail: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    role: Role
    status: UserStatus


class SessionOut(UserOut):
    access_token: str