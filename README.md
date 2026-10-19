# Leave Approval API

An asynchronous REST API for employee leave requests and admin-managed account approval. The backend is built with FastAPI, SQLAlchemy's async ORM, Pydantic, and MySQL.

## Backend Overview

- New registrations are created with `pending` status and cannot log in until an admin activates them.
- Registration requires a `@triconinfotech.com` email and a password with at least 8 characters, including a letter, digit, uppercase letter, and special symbol.
- Admin users can list users with optional role/status filters and update a user's role or active/disabled status.
- Employees can choose an active HR recipient, write and submit a leave request, view its status, and access their profile. HR users can review requests assigned to them and view their own leave statistics.
- Authentication uses bearer tokens containing the user's name, email, and numeric role (`1` admin, `2` HR, `3` employee). The API checks those claims against the active database user.

| Access | Endpoints |
| --- | --- |
| Any active user | `GET /api/v1/auth/me` |
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
| `SEED_PASSWORD` | Optional development password for the seed script; if unset, the script prompts securely |
| `GROQ_API_KEY` | Groq API key used for optional leave-note rephrasing |
| `GROQ_MODEL` | Groq model used for rephrasing; defaults to `llama-3.3-70b-versatile` |

The `.env` file is local configuration in `backend/` and is ignored by Git. Do not commit real credentials or production secrets.

Leave requests keep the manual text in `body`, the optional Groq rewrite in `ai_body`, and the exact text sent for review in `submitted_body`. Rephrasing never overwrites the manual text. Requests from employees, HR, or admin include `recipient_id` (selected from `GET /api/v1/leaves/recipients`). Active HR and admin accounts can be recipients. The API still accepts the legacy `to_hr_id` request field. Responses include the mapped `recipient` name and email. HR sees only requests assigned to them; admin can review all requests. The rephrase endpoint returns `ai_body` without submitting a leave request.

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

## Create an Admin User

Create a trusted, active account by running:

```bash
python -m scripts.seed_users --email admin@example.com --name "Admin" --role admin
```

The script prompts for a password unless `SEED_PASSWORD` is set in `.env`. Use a password of at least 8 characters. Supported roles are `admin`, `hr`, and `employee`.

## Run the API

Start the development server from the repository root:

```bash
python -m uvicorn app.main:app --reload
```

The server listens at `http://127.0.0.1:8000` by default.

- API documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- API base path: `http://127.0.0.1:8000/api/v1`

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
