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
| Admin | `GET /api/v1/admin/users`, `GET /api/v1/admin/users/stats`, `PATCH /api/v1/admin/users/{user_id}` |

The API is mounted under `/api/v1`. Interactive API documentation is available at `/docs` when the server is running.

See [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) for the full project structure, authentication and role model, database schema, setup, and detailed API reference.

## Requirements

- Python 3.12 or newer
- A running MySQL database and credentials with permission to create/drop tables
- The Python packages pinned in `requirements.txt`

The requirements file includes the application dependencies and supporting packages. `greenlet` is included for SQLAlchemy's asyncio support. The database URL uses the `aiomysql` async driver.

## Setup

### Windows PowerShell

Run these commands from the repository root. The virtual environment is created in `.venv/`, and the remaining backend commands run from `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
Set-Location .\backend
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

### Git Bash, macOS, or Linux

Run these commands from the repository root:

```bash
python -m venv .venv
# Git Bash on Windows
source .venv/Scripts/activate
# macOS/Linux instead use: source .venv/bin/activate
python -m pip install --upgrade pip
cd backend
python -m pip install -r requirements.txt
test -f .env || cp .env.example .env

python -m uvicorn app.main:app --reload --port 8001
```

The commands below should be run from `backend/`. Edit `.env` and set `DATABASE_URL` to the MySQL database you created. The example URL is:

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
| `GROQ_MODEL` | Groq model used for rephrasing; defaults to `openai/gpt-oss-20b` |

The `.env` file is local configuration in `backend/` and is ignored by Git. Do not commit real credentials or production secrets.

### Keep MySQL running for Workbench (Windows)

MySQL Workbench is a client; opening it does not start the MySQL server. To make
the server start automatically whenever Windows starts, register it once as a
Windows service. The following example uses the existing data directory
`C:\Users\tejas.deshpande\mysql-leave-data` and port `3307`. If your data
directory is different, replace that path before running the commands.

Open **PowerShell as Administrator** and run:

```powershell
$myIni = 'C:\Users\tejas.deshpande\mysql-leave-data\my.ini'

@'
[mysqld]
basedir=C:/Program Files/MySQL/MySQL Server 8.0
datadir=C:/Users/tejas.deshpande/mysql-leave-data
port=3307
bind-address=127.0.0.1
'@ | Set-Content -Encoding ascii $myIni

& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe' --install LeaveApprovalsMySQL "--defaults-file=$myIni"
Set-Service -Name LeaveApprovalsMySQL -StartupType Automatic
```

Restart Windows after registering the service. This lets the manually started
server shut down before the service starts using the same data directory. After
restarting, check that the service is running:

```powershell
Get-Service LeaveApprovalsMySQL
```

In Workbench, use the saved connection with host `127.0.0.1`, port `3307`, and
the database account and schema from your local setup. Keep the Workbench port
and the port in `backend/.env`'s `DATABASE_URL` the same. If the service is
stopped, start it from Administrator PowerShell with
`Start-Service LeaveApprovalsMySQL`. Do not start a second MySQL server against
the same data directory.

The frontend keeps access tokens in memory and clears legacy token values from `localStorage`. On startup, one `GET /api/v1/auth/me` call validates the access token or restores the session from the refresh cookie and returns the user together with a fresh access token. The refresh token is sent only in an `HttpOnly`, `SameSite=Lax` cookie scoped to `/api/v1/auth`; logout clears that cookie. For production, serve over HTTPS and set `REFRESH_COOKIE_SECURE=true`.

Leave requests keep the manual text in `body`, the optional Groq rewrite in `ai_body`, and the exact text sent for review in `submitted_body`. Rephrasing never overwrites the manual text. Requests from employees, HR, or admin select an active HR/admin recipient from `GET /api/v1/leaves/recipients`; submissions use `recipient_id` (legacy `recipient_key` is still accepted). Leave responses expose recipient name and role. HR sees only requests assigned to them; admin can review all requests. The rephrase endpoint returns `ai_body` without submitting a leave request.

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

Start the development server from `backend/` (after activating the virtual environment and configuring `.env`):

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
