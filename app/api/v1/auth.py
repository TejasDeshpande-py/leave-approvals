from fastapi import APIRouter, Depends

from app.api.deps import get_auth_service, get_current_user
from app.models import User
from app.schemas.auth import LoginRequest, MessageOut, RegisterRequest, TokenOut, UserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=MessageOut, status_code=201)
async def register(body: RegisterRequest, svc: AuthService = Depends(get_auth_service)):
    await svc.register(body.name, body.email, body.password)
    return MessageOut(detail="Registration received. An admin must approve your account before you can log in.")


@router.post("/login", response_model=TokenOut)
async def login(body: LoginRequest, svc: AuthService = Depends(get_auth_service)):
    return TokenOut(access_token=await svc.login(body.email, body.password))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user