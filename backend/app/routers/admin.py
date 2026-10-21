from fastapi import APIRouter, Depends, Query

from app.routers.deps import get_user_service, require_role
from app.enums import Role, UserStatus
from app.models import User
from app.schemas.admin import UserPage, UserUpdate
from app.auth.schemas import UserOut
from app.services.user_service import UserService

router = APIRouter(prefix="/admin/users", tags=["admin"])


@router.get("", response_model=UserPage)
async def list_users(
    status: UserStatus | None = None,
    role: Role | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: User = Depends(require_role(Role.admin)),
    svc: UserService = Depends(get_user_service),
):
    items, total = await svc.list(status, role, limit, offset)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/stats", response_model=dict[str, int])
async def user_stats(
    _: User = Depends(require_role(Role.admin)),
    svc: UserService = Depends(get_user_service),
):
    return await svc.stats()


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    admin: User = Depends(require_role(Role.admin)),
    svc: UserService = Depends(get_user_service),
):
    return await svc.update(admin, user_id, body)