import enum


class Role(str, enum.Enum):
    admin = "admin"
    hr = "hr"
    employee = "employee"


ROLE_CLAIM_BY_ROLE = {
    Role.admin: 1,
    Role.hr: 2,
    Role.employee: 3,
}
ROLE_BY_CLAIM = {claim: role for role, claim in ROLE_CLAIM_BY_ROLE.items()}


class UserStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    disabled = "disabled"


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"