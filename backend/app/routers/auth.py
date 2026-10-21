from fastapi import APIRouter, Cookie, Depends, Response
from fastapi.responses import Response as ResponseClass
from fastapi.security import HTTPAuthorizationCredentials

from app.routers.deps import bearer, get_auth_service, get_current_user
from app.core.config import settings
from app.core.exceptions import Unauthorized
from app.models import User
from app.auth.schemas import (
    LoginRequest,
    ChangePasswordRequest,
    MessageOut,
    RegisterRequest,
    SessionOut,
    TokenOut,
    UserOut,
)
from app.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
REFRESH_COOKIE = "leave_office_refresh"


def token_response(access_token: str) -> TokenOut:
    return TokenOut(
        access_token=access_token,
        access_token_expires_in=settings.access_token_expire_minutes * 60,
    )


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="lax",
        path="/api/v1/auth",
    )


@router.post("/register", response_model=MessageOut, status_code=201)
async def register(body: RegisterRequest, svc: AuthService = Depends(get_auth_service)):
    await svc.register(body.name, body.email, body.password)
    return MessageOut(detail="Registration received. An admin must approve your account before you can log in.")


@router.patch("/password", response_model=MessageOut)
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    svc: AuthService = Depends(get_auth_service),
):
    await svc.change_password(user, body.current_password, body.new_password)
    return MessageOut(detail="Password updated successfully")


@router.post("/login", response_model=TokenOut)
async def login(
    body: LoginRequest,
    response: Response,
    svc: AuthService = Depends(get_auth_service),
):
    tokens = await svc.login(body.email, body.password)
    set_refresh_cookie(response, tokens.refresh_token)
    return token_response(tokens.access_token)


@router.post("/refresh", response_model=TokenOut)
async def refresh(
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    svc: AuthService = Depends(get_auth_service),
):
    if not refresh_token:
        raise Unauthorized("Invalid or expired refresh token")
    access_token = await svc.refresh(refresh_token)
    return token_response(access_token)


@router.post("/logout", status_code=204)
async def logout():
    response = ResponseClass(status_code=204)
    response.delete_cookie(
        key=REFRESH_COOKIE,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="lax",
        path="/api/v1/auth",
    )
    return response


@router.get("/me", response_model=SessionOut)
async def me(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    svc: AuthService = Depends(get_auth_service),
):
    user, access_token = await svc.session(
        creds.credentials if creds else None,
        refresh_token,
    )
    return SessionOut(
        **UserOut.model_validate(user).model_dump(),
        access_token=access_token,
    )