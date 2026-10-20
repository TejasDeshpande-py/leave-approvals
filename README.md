# Leave Approval API

An asynchronous REST API for employee leave requests and admin-managed account approval. The backend is built with FastAPI, SQLAlchemy's async ORM, Pydantic, and MySQL.

## Backend Overview

- New registrations are created with `pending` status and cannot log in until an admin activates them.
- Registration requires a `@triconinfotech.com` email and a password with at least 8 characters, including a letter, digit, uppercase letter, and special symbol.
- Admin users can list users with optional role/status filters and update a user's role or active/disabled status.
- Employees can choose an active HR recipient, write and submit a leave request, view its status, and access their profile. HR users can review requests assigned to them and view their own leave statistics.
- Authentication uses 30-minute access tokens held only in frontend memory and 7-day refresh tokens stored in an `HttpOnly` cookie. The frontend automatically refreshes expired access tokens. The API checks access-token claims against the active database user.

| Access | Endpoints |
| --- | --- |
| Any active user | `GET /api/v1/auth/me` |
| Public | `POST /api/v1/auth/login`, `POST /api/v1/auth/register` |
| Authenticated user | `PATCH /api/v1/auth/password` |
| Refresh cookie | `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` |
| Employee, HR, or admin | `GET /api/v1/leaves/recipients`, `POST /api/v1/leaves/rephrase`, `POST /api/v1/leaves`, `GET /api/v1/leaves/me` |
| Assigned HR | `GET /api/v1/leaves`, `GET /api/v1/leaves/stats`, `PATCH /api/v1/leaves/{leave_id}/decision` |
| Admin | `GET /api/v1/leaves`, `GET /api/v1/leaves/stats`, `PATCH /api/v1/leaves/{leave_id}/decision` for all requests |
| HR/admin or the request owner | `GET /api/v1/leaves/{leave_id}` |
| Admin | `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/{user_id}` |

The API is mounted under `/api/v1`. Interactive API documentation is available at `/docs` when the server is running.

## Requirements

- Python 3.12 or newer
- A running MySQL database and credentials with permission to create/drop tables
- The Python packages pinned in `requirements.txt`

The requirements file includes the application dependencies and supporting packages. `greenlet` is included for SQLAlchemy's asyncio support. The database URL uses the `aiomysql` async driver.

## Setup (Bash)

Create and activate the virtual environment from the repository root, then enter `backend/` for backend commands:

```bash
python -m venv .venv
# Git Bash on Windows
source .venv/Scripts/activate
# macOS/Linux instead use: source .venv/bin/activate
python -m pip install --upgrade pip
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to the MySQL database you created. The example URL is:

```dotenv
DATABASE_URL=mysql+aiomysql://leave_app:change-me@localhost:3307/leave_db
```

Replace the sample database credentials and change `JWT_SECRET` to a long, random value. The settings are:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy async database connection URL |
| `JWT_SECRET` | Secret used to sign access tokens; replace the example value |
| `JWT_ALGORITHM` | Token algorithm; defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes; defaults to `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh-token lifetime in days; defaults to `7` |
| `REFRESH_COOKIE_SECURE` | Set the refresh cookie's `Secure` flag; enable for HTTPS production deployments |
| `FRONTEND_ORIGIN` | Allowed frontend origin for credentialed API requests; defaults to `http://localhost:5173` |
| `SEED_PASSWORD` | Optional development password for the seed script; if unset, the script prompts securely |
| `GROQ_API_KEY` | Groq API key used for optional leave-note rephrasing |
| `GROQ_MODEL` | Groq model used for rephrasing; defaults to `llama-3.3-70b-versatile` |

The `.env` file is local configuration in `backend/` and is ignored by Git. Do not commit real credentials or production secrets.

The frontend keeps access tokens in memory and clears legacy token values from `localStorage`. On startup, one `GET /api/v1/auth/me` call validates the access token or restores the session from the refresh cookie and returns the user together with a fresh access token. The refresh token is sent only in an `HttpOnly`, `SameSite=Lax` cookie scoped to `/api/v1/auth`; logout clears that cookie. For production, serve over HTTPS and set `REFRESH_COOKIE_SECURE=true`.

Leave requests keep the manual text in `body`, the optional Groq rewrite in `ai_body`, and the exact text sent for review in `submitted_body`. Rephrasing never overwrites the manual text. Requests from employees, HR, or admin include an opaque `recipient_key` selected from `GET /api/v1/leaves/recipients`; the backend resolves it to the selected active HR/admin account. Recipient options and leave responses expose only recipient name and role, not their numeric database ID or email. HR sees only requests assigned to them; admin can review all requests. The rephrase endpoint returns `ai_body` without submitting a leave request.

## Initialize the Database

Run these commands from `backend/`. After configuring `.env` and creating the MySQL database, create any missing tables:

```bash
python -m scripts.init_db
```

The initializer uses SQLAlchemy `create_all`, which creates missing tables but does not alter existing tables. During development, use `--reset` to drop and recreate this application's tables:

```bash
python -m scripts.init_db --reset
```

`--reset` permanently deletes all data in those tables, including users and leave requests. Use it only when rebuilding a disposable development database.

For the leave-note fields added after initial setup, update an existing database without deleting data:

```bash
python -m scripts.upgrade_leave_schema
```

## Create an Admin User

Create a trusted, active account by running:

```bash
python -m scripts.seed_users --email admin@example.com --name "Admin" --role admin
```

The script prompts for a password unless `SEED_PASSWORD` is set in `.env`. Use a password of at least 8 characters. Supported roles are `admin`, `hr`, and `employee`.

## Run the API

Start the development server from the repository root:

```bash
python -m uvicorn app.main:app --reload --port 8001
```

The server listens at `http://127.0.0.1:8001`.

- API documentation: `http://127.0.0.1:8001/docs`
- Health check: `http://127.0.0.1:8001/health`
- API base path: `http://127.0.0.1:8001/api/v1`

## Project Layout

```text
backend/
  app/                  FastAPI app, routes, models, and business logic
  scripts/              Database initialization and admin seeding
  requirements.txt      Pinned Python dependencies
  .env.example          Backend configuration template
.venv/                  Repository virtual environment
README.md               Project setup and API guide
```
