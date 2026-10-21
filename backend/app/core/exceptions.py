class AppError(Exception):
    status_code = 400
    default = "Bad request"

    def __init__(self, detail: str | None = None):
        self.detail = detail or self.default


class Unauthorized(AppError):
    status_code, default = 401, "Invalid or missing credentials"


class Forbidden(AppError):
    status_code, default = 403, "Forbidden"


class NotFound(AppError):
    status_code, default = 404, "Not found"


class Conflict(AppError):
    status_code, default = 409, "Conflict"


class NotALeaveNote(AppError):
    status_code, default = 422, "Text does not look like a leave note"


class RephraseRejected(AppError):
    status_code, default = 422, "Could not safely rewrite this leave note"


class ServiceUnavailable(AppError):
    status_code, default = 503, "Service unavailable"
