from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.enums import LeaveStatus

MAX_DAYS = 60


class RephraseRequest(BaseModel):
    body: str = Field(min_length=3, max_length=2000)


class RephraseResponse(BaseModel):
    body: str


class LeaveCreate(BaseModel):
    to_hr_id: int = Field(gt=0)
    leave_type: Literal["casual", "sick", "earned", "unpaid"]
    start_date: date
    end_date: date
    body: str = Field(min_length=3, max_length=2000)

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if (self.end_date - self.start_date).days >= MAX_DAYS:
            raise ValueError(f"leave cannot exceed {MAX_DAYS} days")
        return self


class Decision(BaseModel):
    status: Literal["approved", "rejected"]
    comment: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def rejection_needs_comment(self):
        if self.status == "rejected" and not (self.comment and self.comment.strip()):
            raise ValueError("a comment is required when rejecting")
        return self


class EmployeeBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr


class LeaveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee: EmployeeBrief
    to_hr: EmployeeBrief
    to_hr_id: int
    leave_type: str
    start_date: date
    end_date: date
    body: str
    status: LeaveStatus
    reviewed_by: int | None
    reviewed_at: datetime | None
    review_comment: str | None
    created_at: datetime


class LeavePage(BaseModel):
    items: list[LeaveOut]
    total: int
    limit: int
    offset: int