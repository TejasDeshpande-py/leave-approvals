from datetime import date, datetime

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.enums import LeaveStatus
from app.models.user import User


class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_leave_dates"),
        Index("ix_leave_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    to_hr_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    leave_type: Mapped[str] = mapped_column(String(30))
    start_date: Mapped[date]
    end_date: Mapped[date]
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[LeaveStatus] = mapped_column(
        Enum(LeaveStatus, native_enum=False, length=20), default=LeaveStatus.pending
    )
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[datetime | None]
    review_comment: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    employee: Mapped[User] = relationship(foreign_keys=[employee_id])
    to_hr: Mapped[User] = relationship(foreign_keys=[to_hr_id])