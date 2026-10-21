# Leave Approvals - Technical Documentation

This document describes the implemented architecture, runtime configuration,
authentication model, authorization rules, data model, and HTTP API for the
Leave Approvals application.

## 1. Product overview

Leave Approvals is a web application for submitting, reviewing, and administering
employee leave requests. It has:

- A React and TypeScript single-page frontend.
- A FastAPI backend with asynchronous SQLAlchemy access.
- A MySQL database accessed through the `aiomysql` driver.
- Optional AI-assisted leave-note rephrasing through Groq.
- Three application roles: `employee`, `hr`, and `admin`.

The API is mounted at `/api/v1`. Interactive API documentation is available at
`/docs` while the backend is running.

## 2. Repository structure

```text
backend/
  app/
    api/
      deps.py                 Authentication, role guards, and dependency factories
      v1/
        admin.py              Admin user-management endpoints
        auth.py               Registration, login, session, and password endpoints
        leaves.py             Leave requests, review, statistics, and rephrasing
        router.py             API router composition
    core/
      config.py               Environment-backed application settings
      exceptions.py           Application exceptions and HTTP status mapping
      security.py             Password hashing and token/recipient-key utilities
    db/
      base.py                 SQLAlchemy declarative base
      session.py              Async engine, session factory, and DB dependency
    models/
      user.py                 User ORM model
      leave_request.py        LeaveRequest ORM model and relationships
    repositories/
      user_repo.py            User database queries
      leave_repo.py           Leave database queries and atomic updates
    schemas/
      auth.py                 Authentication and user request/response schemas
      admin.py                Admin user-management schemas
      leave.py                Leave, recipient, review, and pagination schemas
    services/
      auth_service.py         Registration, login, session, password workflows
      leave_service.py        Leave request and review business rules
      rephrase_service.py     Groq rephrase integration
      user_service.py         User administration and recipient selection
  scripts/
    init_db.py                Create or reset application tables
    seed_users.py             Create a trusted active user
    upgrade_leave_schema.py   Add/backfill leave note columns on existing DBs
  requirements.txt            Pinned Python dependencies
  .env.example                Backend configuration template
frontend/
  src/
    app/
      auth/                    Auth context, provider, and hook
      AppRoutes.tsx            Route definitions and frontend role guards
    components/                Shared UI components
    features/
      auth/authApi.ts          Authentication API client
      leaves/leaveApi.ts       Leave API client and payload types
      users/userApi.ts         Admin user API client
    layouts/                   Authentication and workspace layouts
    pages/                     Login, registration, profile, leave, and review pages
    shared/
      api/client.ts            Fetch wrapper, bearer header, refresh, and request coalescing
      approvalCounts.ts        Event name for refreshing sidebar approval counts
      types.ts                 Shared frontend domain types
      useInfinitePage.ts       Shared offset-based lazy-scroll list loader
  package.json                 Frontend scripts and dependencies
  vite.config.ts               Vite configuration and local API proxy
README.md                      Quick-start and high-level project information
TECHNICAL_DOCUMENTATION.md     This reference
```

## 3. Architecture and request flow

### Backend layers

1. **Router** parses HTTP input, applies dependencies, and selects response
   schemas.
2. **Dependency layer** (`api/deps.py`) resolves the current user, enforces
   allowed roles, and constructs services and repositories.
3. **Service layer** applies application rules such as date overlap checks,
   role-specific review visibility, and password verification.
4. **Repository layer** runs SQLAlchemy queries and updates.
5. **ORM models** map application entities to MySQL tables.

The API uses Pydantic models for request validation and response serialization.
Application exceptions are translated to JSON responses of the form
`{"detail":"..."}`.

### Frontend

`AuthProvider` owns the current user and in-memory access token. Page components
call feature API clients, which use the shared fetch wrapper. That wrapper adds
the bearer token, includes cookies on API requests, and retries an unauthorized
non-auth request once after refreshing the access token.

The My requests, Review inbox, and User approvals lists use
`shared/useInfinitePage.ts` to load 50 records at a time. An
`IntersectionObserver` requests the next offset when the user scrolls near the
end of the list; there are no page-navigation controls. The API still enforces
its normal `limit` and `offset` bounds, and each response's `total` is used for
the displayed result count.

The workspace sidebar displays pending counts for Review inbox and User
approvals. Review counts come from `GET /api/v1/leaves/stats` and are scoped to
the signed-in HR recipient or global for admins. User approval counts come from
the admin-only `GET /api/v1/admin/users/stats`. After a decision or account
approval/rejection, the page broadcasts the approval-count update event so the
sidebar refreshes both counts.

Vite proxies requests beginning with `/api` to `http://127.0.0.1:8001` in
development.

## 4. Roles and authorization

| Role | Capabilities |
| --- | --- |
| `employee` | Submit leave requests to an active HR/admin recipient, rephrase notes, view own requests, edit own pending requests, and view own profile. |
| `hr` | Employee capabilities; list and review requests assigned to that HR account; view assigned-request statistics. |
| `admin` | Employee capabilities; list/review all requests, view global leave statistics, and manage users. |

User statuses are `pending`, `active`, and `disabled`. New registrations are
`pending` and cannot authenticate until approved by an admin. Only active users
can log in and refresh a session. Admin user updates can set status to `active`
or `disabled`; the update endpoint does not accept `pending`.

The backend is authoritative for authorization. Frontend route guards improve
navigation UX but do not replace backend role checks.

### Reviewer scope

- HR list, stats, detail, and decision operations are restricted to requests
  assigned to the authenticated HR user.
- Admin list, stats, detail, and decision operations cover all requests.
- Employees can only view their own requests.
- Only the request owner may edit a request note, and only while it is pending.
- A reviewer cannot decide their own request.

## 5. Authentication and session security

### Login and tokens

`POST /api/v1/auth/login` returns a short-lived JWT access token and sets the
refresh token in an HTTP-only cookie:

- Access-token lifetime defaults to **30 minutes**.
- Refresh-token lifetime defaults to **7 days**.
- Access tokens are held in browser memory, not persistent web storage.
- The refresh cookie is named `leave_office_refresh`, is `HttpOnly`, uses
  `SameSite=Lax`, and is scoped to `/api/v1/auth`.
- `Secure` is controlled by `REFRESH_COOKIE_SECURE`. It is disabled by default
  for local HTTP development and should be enabled when serving over HTTPS.

The access JWT contains `sub` (user ID), `name`, `email`, numeric `role`, `typ`,
`iat`, and `exp`. Role claims map to `1` for admin, `2` for HR, and `3` for
employee. Each authenticated request checks the current database user and
requires that the user is active and the token's name, email, and role match.

### Session restoration and refresh

On application startup, the frontend calls `GET /api/v1/auth/me` once. The
backend:

1. Uses the supplied bearer access token if it is valid and still matches an
   active database user.
2. Otherwise validates the HTTP-only refresh cookie.
3. Returns the user and a fresh access token in the same response.

During an active session, if a protected API call returns `401`, the frontend
calls `POST /api/v1/auth/refresh` with the cookie and retries the original
request once. Concurrent unauthorized requests share a single in-flight refresh
request.

`POST /api/v1/auth/logout` expires the refresh cookie. The frontend also clears
the in-memory access token and user state.

Refresh tokens are signed JWTs and are not stored server-side or rotated on
refresh. Logout clears the browser cookie but does not revoke a previously
copied refresh token; such a token remains valid until its expiry unless the
signing secret is changed or its user is made inactive.

### Password security

Passwords are hashed using `pwdlib`'s recommended Argon2 configuration. The
API never returns password hashes. Password requirements for registration and
password changes:

- 8 to 128 characters.
- At least one letter.
- At least one digit.
- At least one uppercase letter.
- At least one non-alphanumeric, non-whitespace special character.

Changing a password additionally requires the current password, exact equality
between new password and confirmation, and the new password must differ from
the current password.

## 6. Database model

### `users`

| Column | Description |
| --- | --- |
| `id` | Integer primary key |
| `name` | Display name, maximum 100 characters |
| `email` | Unique email, maximum 255 characters |
| `password_hash` | Argon2 password hash |
| `role` | `admin`, `hr`, or `employee` |
| `status` | `pending`, `active`, or `disabled`; defaults to pending |
| `created_at` | Database-generated creation timestamp |

Registration accepts only `@triconinfotech.com` addresses, normalizes email to
lowercase, and always creates an employee with pending status. The seed script
can create trusted active users with any supported role.

### `leave_requests`

| Column | Description |
| --- | --- |
| `id` | Integer primary key |
| `employee_id` | Foreign key to the submitting user |
| `to_hr_id` | Foreign key to the selected HR/admin recipient |
| `leave_type` | `casual`, `sick`, `earned`, or `unpaid` |
| `start_date`, `end_date` | Requested leave date range |
| `body` | Original/manual note |
| `ai_body` | Optional rephrased draft |
| `submitted_body` | Exact note submitted for review |
| `status` | `pending`, `approved`, or `rejected`; defaults to pending |
| `reviewed_by` | User ID of the decision-maker, nullable |
| `reviewed_at` | Decision timestamp, nullable |
| `review_comment` | Optional decision comment, maximum 500 characters |
| `created_at` | Database-generated creation timestamp |

The database enforces `end_date >= start_date` and indexes the employee,
recipient, and status/creation-time paths used for lookups. Note validation
allows a maximum inclusive leave span of 60 calendar days. A request conflicts
with another request for the same employee if its dates overlap a pending or
approved request; rejected requests do not block new requests.

## 7. API conventions

- Base path: `/api/v1`
- Request and response bodies use JSON unless noted.
- Protected routes accept `Authorization: Bearer <access_token>`.
- Cookie-bearing requests must allow credentials; the frontend sends
  `credentials: "include"`.
- Paginated endpoints return:

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

Common errors:

| Status | Meaning |
| --- | --- |
| `401` | Missing, invalid, or expired credentials; invalid current password |
| `403` | Authenticated user lacks permission, or account is awaiting approval/disabled |
| `404` | Requested user/leave/recipient does not exist or is not visible to the caller |
| `409` | Duplicate registration, overlapping leave, non-pending edit/review, or concurrent decision |
| `422` | Request validation failed |
| `503` | Rephrase integration is unavailable or not configured |

Validation errors may use FastAPI's standard structured `detail` array. The
frontend displays API error detail messages when available.

## 8. API reference

### Health

#### `GET /health`

No authentication. Returns `{"status":"ok"}` when the application process is
responding. It does not test database or Groq connectivity.

### Authentication

#### `POST /api/v1/auth/register`

Public registration.

Request:

```json
{
  "name": "Alex Employee",
  "email": "alex@triconinfotech.com",
  "password": "StrongPass1!"
}
```

Returns `201`:

```json
{
  "detail": "Registration received. An admin must approve your account before you can log in."
}
```

Requires a valid company email and a password satisfying the password rules.
New accounts always receive role `employee` and status `pending`. Existing
emails return `409`.

#### `POST /api/v1/auth/login`

Public login.

Request:

```json
{"email":"alex@triconinfotech.com","password":"StrongPass1!"}
```

Returns `200` with `access_token`, `access_token_expires_in` (seconds), and
`token_type: "bearer"`. Also sets the refresh cookie. Invalid credentials
return `401`; a pending or disabled account returns `403`.

#### `GET /api/v1/auth/me`

Accepts an access bearer token and/or the refresh cookie. If the bearer token is
valid, it returns the active user's data and that token. If the bearer token is
missing, invalid, or expired, it attempts session restoration from the refresh
cookie and issues a new access token.

Returns `200`:

```json
{
  "id": 12,
  "name": "Alex Employee",
  "email": "alex@triconinfotech.com",
  "role": "employee",
  "status": "active",
  "access_token": "<access-token>"
}
```

Without a valid access token or refresh cookie, returns `401`.

#### `POST /api/v1/auth/refresh`

Requires the HTTP-only refresh cookie; no token is sent in the JSON body.
Returns a new access token and its lifetime. The refresh token is not rotated.
Invalid, expired, or inactive-user refresh sessions return `401`.

#### `POST /api/v1/auth/logout`

Expires the refresh cookie and returns `204 No Content`. The browser should
include credentials so the cookie is sent and cleared.

#### `PATCH /api/v1/auth/password`

Requires an active user's bearer access token.

Request:

```json
{
  "current_password": "OldPass1!",
  "new_password": "NewPass2!",
  "confirm_new_password": "NewPass2!"
}
```

Returns `200`:

```json
{"detail":"Password updated successfully"}
```

Returns `401` if the current password is incorrect and `422` if the new
passwords differ, the new password equals the current password, or complexity
requirements are not met.

### Leave recipients and rephrasing

#### `GET /api/v1/leaves/recipients`

Available to all active roles. Returns active HR/admin accounts other than the
current user, sorted by name and ID:

```json
[
  {"id": 8, "name": "Taylor HR", "role": "hr"},
  {"id": 11, "name": "Morgan Admin", "role": "admin"}
]
```

The legacy alias `GET /api/v1/leaves/hr-recipients` returns the same response
but is hidden from the generated OpenAPI schema. The frontend uses
`/recipients`.

#### `POST /api/v1/leaves/rephrase`

Available to all active roles. Sends a note to the configured Groq model and
returns an AI draft; it does not create or update a leave request.

Request: `{"body":"I need a day off next Friday for an appointment."}`

`body` must be 3-3000 characters. Returns
`{"ai_body":"..."}`. If `GROQ_API_KEY` is missing or the provider fails, returns
`503`. The prompt instructs the model to preserve meaning and stated facts,
avoid invented details, and return only the rewritten note.

### Leave requests

#### `POST /api/v1/leaves`

Available to all active roles. Creates a pending request and returns `201` with
a leave response.

Request:

```json
{
  "recipient_id": 8,
  "leave_type": "casual",
  "start_date": "2026-11-02",
  "end_date": "2026-11-03",
  "body": "I need leave for a personal appointment.",
  "ai_body": null,
  "submitted_body": "I need leave for a personal appointment."
}
```

The frontend selects `recipient_id`. The API also accepts the legacy
`recipient_key` instead; exactly one of the two recipient fields is required.
The recipient must be an active HR/admin account other than the submitter.
`leave_type` must be `casual`, `sick`, `earned`, or `unpaid`. Dates must be
ordered and span no more than 60 inclusive calendar days. `body` and
`submitted_body` are 3-3000 characters; `ai_body` is optional and at most 3000
characters. If `submitted_body` is omitted, it defaults to `body`.

A pending or approved overlapping request by the same employee returns `409`.
Rejected requests do not block submission.

#### `GET /api/v1/leaves/me`

Available to all active roles. Lists only the caller's own requests.

| Query | Default | Description |
| --- | --- | --- |
| `status` | none | `pending`, `approved`, or `rejected` |
| `limit` | `20` | 1-100 |
| `offset` | `0` | Non-negative row offset |

#### `GET /api/v1/leaves`

Available to HR and admin.

| Query | Default | Description |
| --- | --- | --- |
| `status` | none | Filter by leave status |
| `employee_id` | none | Filter by submitting user ID |
| `from_date` | none | Include requests whose end date is on/after this date |
| `to_date` | none | Include requests whose start date is on/before this date |
| `limit` | `20` | 1-100 |
| `offset` | `0` | Non-negative row offset |

The date filters use range-overlap semantics. HR results are always scoped to
that HR user's assigned requests; admins see all matching requests.

The frontend loads request history, review results, and admin user lists
incrementally as users scroll; the API continues to use `limit` and `offset`
for each batch.

#### `GET /api/v1/leaves/stats`

Available to HR and admin. Returns counts for all statuses, including zero
counts, e.g.:

```json
{"pending":4,"approved":9,"rejected":2}
```

HR counts only requests assigned to them. Admin counts are global.
The frontend uses the pending count in the Review inbox navigation badge.

#### `GET /api/v1/leaves/{leave_id}`

Requires an active user. Employees can read their own request, HR can read a
request assigned to them, and admin can read any request. Inaccessible or
non-existent IDs return `404`.

#### `PATCH /api/v1/leaves/{leave_id}`

Requires authentication. The caller must own the request, and it must still be
pending. At least one field must be provided:

```json
{
  "body": "Updated original note.",
  "ai_body": null,
  "submitted_body": "Updated original note."
}
```

All fields are optional individually. `body` and `submitted_body`, when
provided, must be 3-3000 characters; `ai_body` may be null and is at most 3000
characters. If `submitted_body` is omitted, it follows an updated `body`, or
otherwise a non-empty `ai_body`. A missing request returns `404`, a non-owner
returns `403`, and a non-pending request returns `409`.

#### `PATCH /api/v1/leaves/{leave_id}/decision`

Available to HR and admin. Only pending requests can be decided.

Approve:

```json
{"status":"approved","comment":"Approved."}
```

Reject:

```json
{"status":"rejected","comment":"Please coordinate coverage."}
```

`status` must be `approved` or `rejected`. Rejection requires a non-blank
comment; comments are limited to 500 characters. HR can decide only requests
assigned to their account; admins can decide any request. A request owner
cannot review their own request. The update is atomic and only changes a still
pending request, preventing duplicate decisions.

### Admin user management

#### `GET /api/v1/admin/users`

Admin only.

| Query | Default | Description |
| --- | --- | --- |
| `status` | none | `pending`, `active`, or `disabled` |
| `role` | none | `employee`, `hr`, or `admin` |
| `limit` | `20` | 1-100 |
| `offset` | `0` | Non-negative row offset |

Returns a paginated list of user profiles. Password hashes are never included.
Results are ordered newest first.

#### `GET /api/v1/admin/users/stats`

Admin only. Returns counts for all account statuses, including zero counts:

```json
{"pending":4,"active":9,"disabled":2}
```

The frontend uses the pending count in the User approvals navigation badge.

#### `PATCH /api/v1/admin/users/{user_id}`

Admin only. Provide at least one of `role` and `status`.

```json
{"role":"hr","status":"active"}
```

Supported roles: `employee`, `hr`, `admin`. Supported statuses: `active`,
`disabled`. Returns the updated user. An admin cannot change their own role or
status. A missing user returns `404`.

## 9. Frontend routes

| Route | Access |
| --- | --- |
| `/login` | Public; signed-in users are redirected to their role home |
| `/register` | Public; signed-in users are redirected |
| `/request` | Employee, HR, admin |
| `/mine` | Employee, HR, admin |
| `/review` | HR, admin |
| `/users` | Admin |
| `/profile` | Employee, HR, admin |

Unauthorized frontend navigation redirects to login or to the user's permitted
home route. The backend independently enforces each API permission.

## 10. Configuration

The backend loads a `.env` file from its current working directory, normally
`backend/`. Copy `backend/.env.example` to `backend/.env` and set real values.
Never commit `.env`, database credentials, JWT secrets, or provider API keys.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy async MySQL URL, e.g. `mysql+aiomysql://user:password@127.0.0.1:3306/leave_db` | Required |
| `JWT_SECRET` | Signs JWTs and derives recipient-key encryption key | Required |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access-token lifetime | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh-token/cookie lifetime | `7` |
| `REFRESH_COOKIE_SECURE` | Adds the cookie `Secure` attribute | `false` |
| `FRONTEND_ORIGIN` | Exact allowed origin for credentialed CORS requests | `http://localhost:5173` |
| `GROQ_API_KEY` | Enables note rephrasing | unset |
| `GROQ_MODEL` | Groq model ID | `openai/gpt-oss-20b` |
| `SEED_PASSWORD` | Optional seed-script password; otherwise prompted securely | unset |

For production, use a long random `JWT_SECRET`, HTTPS, and
`REFRESH_COOKIE_SECURE=true`. Set `FRONTEND_ORIGIN` to the exact deployed
frontend origin. The CORS middleware allows credentials and all methods and
headers for this single configured origin.

## 11. Setup and operation

### Backend (PowerShell)

From the repository root, create/activate a virtual environment and install
dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
Set-Location backend
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env`, then create missing tables from the `backend/` directory:

```powershell
python -m scripts.init_db
```

Run the API:

```powershell
python -m uvicorn app.main:app --reload --port 8001
```

The API is at `http://127.0.0.1:8001`; health check is `/health`, and Swagger
UI is `/docs`.

### Frontend

In a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Vite serves the app on its local development origin (default
`http://localhost:5173`) and proxies `/api` requests to the backend.

Useful checks:

```powershell
npm run build
npm run lint
```

### Database scripts

- `python -m scripts.init_db`: create missing schema objects; it does not
  migrate existing tables.
- `python -m scripts.init_db --reset`: drops and recreates application tables;
  **destroys application data**.
- `python -m scripts.upgrade_leave_schema`: adds/backfills `ai_body` and
  `submitted_body` columns for older leave-request schemas while preserving
  existing notes.
- `python -m scripts.seed_users --email admin@example.com --name "Admin" --role admin`:
  creates a trusted active user. The script checks for a password length of at
  least 8 characters; set `SEED_PASSWORD` or enter it at the secure prompt.

## 12. Operational notes and limitations

- Database setup uses SQLAlchemy `create_all`; schema evolution is handled by
  explicit scripts rather than a general migration framework.
- The `/health` endpoint is a process health check, not a dependency readiness
  check.
- Refresh JWTs are stateless: there is no server-side refresh-token revocation
  list or rotation.
- Password changes update the stored password hash. Existing signed tokens are
  not invalidated solely by changing the password; access and refresh expiry,
  active account status, and JWT claims continue to govern use.
- Rephrasing sends the submitted note text to the configured Groq API. Do not
  include sensitive information unless the organization's use of that provider
  is approved.
- The recipient-key mechanism remains accepted for backward compatibility;
  current frontend submission sends `recipient_id`.
