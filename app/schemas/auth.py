from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

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
        if not any(character.isalpha() for character in password):
            raise ValueError("Password must contain at least one letter")
        if not any(character.isdigit() for character in password):
            raise ValueError("Password must contain at least one digit")
        if not any(character.isupper() for character in password):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(not character.isalnum() and not character.isspace() for character in password):
            raise ValueError("Password must contain at least one special symbol")
        return password


class TokenOut(BaseModel):
    access_token: str
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