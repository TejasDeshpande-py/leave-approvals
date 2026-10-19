from datetime import date

from fastapi import APIRouter, Depends, Query

from app.api.deps import (
    get_current_user,
    get_leave_service,
    get_rephrase_service,
    get_user_service,
    require_role,
)
from app.enums import LeaveStatus, Role
from app.models import User
from app.schemas.leave import (
    Decision,
    EmployeeBrief,
    LeaveCreate,
    LeaveOut,
    LeavePage,
    RephraseRequest,
    RephraseResponse,
)
from app.services.leave_service import LeaveService
from app.services.rephrase_service import RephraseService
from app.services.user_service import UserService

router = APIRouter(prefix="/leaves", tags=["leaves"])


@router.post("/rephrase", response_model=RephraseResponse)
async def rephrase_leave_reason(
    body: RephraseRequest,
    _: User = Depends(require_role(Role.employee)),
    svc: RephraseService = Depends(get_rephrase_service),
):
    return RephraseResponse(body=await svc.rephrase(body.body))


@router.get("/hr-recipients", response_model=list[EmployeeBrief])
async def list_hr_recipients(
    _: User = Depends(require_role(Role.employee)),
    svc: UserService = Depends(get_user_service),
):
    return await svc.list_active_hr()


@router.post("", response_model=LeaveOut, status_code=201)
async def submit_leave(
    data: LeaveCreate,
    user: User = Depends(require_role(Role.employee)),
    svc: LeaveService = Depends(get_leave_service),
):
    return await svc.submit(user, data)


@router.get("/me", response_model=LeavePage)
async def my_leaves(
    status: LeaveStatus | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_role(Role.employee)),
    svc: LeaveService = Depends(get_leave_service),
):
    items, total = await svc.my_leaves(user, status, limit, offset)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/stats", response_model=dict[str, int])
async def leave_stats(
    hr: User = Depends(require_role(Role.hr)),
    svc: LeaveService = Depends(get_leave_service),
):
    return await svc.stats(hr.id)


@router.get("", response_model=LeavePage)
async def list_leaves(
    status: LeaveStatus | None = None,
    employee_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    hr: User = Depends(require_role(Role.hr)),
    svc: LeaveService = Depends(get_leave_service),
):
    items, total = await svc.list_all(hr.id, status, employee_id, from_date, to_date, limit, offset)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{leave_id}", response_model=LeaveOut)
async def get_leave(
    leave_id: int,
    user: User = Depends(get_current_user),
    svc: LeaveService = Depends(get_leave_service),
):
    return await svc.get(user, leave_id)


@router.patch("/{leave_id}/decision", response_model=LeaveOut)
async def decide_leave(
    leave_id: int,
    body: Decision,
    hr: User = Depends(require_role(Role.hr)),
    svc: LeaveService = Depends(get_leave_service),
):
    return await svc.decide(hr, leave_id, body)