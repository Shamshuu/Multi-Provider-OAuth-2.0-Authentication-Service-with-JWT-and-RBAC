# Multi-Provider OAuth 2.0 Authentication Service

A production-ready, containerized RESTful authentication service built with Node.js, Express, TypeScript, PostgreSQL, and Redis. This project implements secure Local Authentication, OAuth 2.0 (Google, GitHub), JWT Session Management, and Role-Based Access Control (RBAC).

## 🚀 Features

-   **Authentication Strategies**:
    -   **Local**: Email & Password registration/login with Bcrypt hashing.
    -   **OAuth 2.0**: Integrated with Google and GitHub.
-   **Session Security**:
    -   Short-lived **JWT Access Tokens**.
    -   Long-lived, rotating **Refresh Tokens**.
-   **Authorization**:
    -   **RBAC Middleware**: Protects admin-only routes.
-   **Security Best Practices**:
    -   **Rate Limiting**: Redis-backed protection against brute-force attacks.
    -   **Helmet**: Sets secure HTTP headers.
    -   **CORS**: Configured interactions.
-   **Infrastructure**:
    -   Fully containerized with **Docker** & **Docker Compose**.
    -   Automatic Database Seeding on startup.
    -   Health checks for all services.

## 📋 Prerequisites

Ensure you have the following installed on your machine:
-   [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Compose)
-   [Git](https://git-scm.com/)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Shamshuu/Multi-Provider-OAuth-2.0-Authentication-Service-with-JWT-and-RBAC
cd Multi-Provider-OAuth-2.0-Authentication-Service-with-JWT-and-RBAC
```

### 2. Configure Environment Variables
Copy the example environment file to create your local `.env`:
```bash
cp .env.example .env
```
> **Note**: The default values in `.env` are set up to work immediately with the Docker environment. You do not need to change DB or Redis settings unless you are running them manually.

### 3. Start the Application
Build and start the services using Docker Compose:
```bash
docker-compose up --build
```
-   **App**: Runs on `http://localhost:8080`
-   **Database**: PostgreSQL on port `5432`
-   **Cache**: Redis on port `6379`

Wait for the logs to say `Server running on port 8080`. The database will automatically initialize and seed itself with test users.

## 🧪 Testing Guide

### 1. Default Test Credentials
The database is pre-seeded with the following accounts (from `submission.json`):

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `AdminPassword123!` |
| **User** | `user@example.com` | `UserPassword123!` |

### 2. Manual API Testing (cURL Examples)

#### Register a New User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "Password123!"}'
```

#### Login (Local)
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "AdminPassword123!"}'
```
*Response will contain `accessToken` and `refreshToken`.*

#### Get Current User Profile (Protected)
```bash
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

#### List All Users (Admin Only)
```bash
curl http://localhost:8080/api/users \
  -H "Authorization: Bearer <YOUR_ADMIN_ACCESS_TOKEN>"
```

### 3. OAuth 2.0 Testing

#### ⚠️ Important Note on Credentials
The default `.env` file uses placeholder credentials (`your-google-client-id`).
-   Actual **Google/GitHub** login will fail (`401 invalid_client`) unless you provide real credentials in `.env`.

#### ✅ How to Test Without Real Credentials (Simulation Mode)
For testing and verification purposes, the API supports a **Simulation Mode** that mimics a successful OAuth provider callback. You can use this to verify the backend logic (user creation, linking, token generation) without needing a Google Cloud account.

**Simulate Google Login:**
```bash
curl "http://localhost:8080/api/auth/google/callback?email=sim@google.com&name=SimGoogle&id=google123"
```
*This will create a new user `sim@google.com` linked to provider `google` and return valid JWT tokens.*

### 4. Automated Verification
A script is included to automatically verify all 11 core requirements:
```bash
# Ensure docker containers are running first
docker exec -it <container_name_or_id> node scripts/verify.js
# OR if you have node installed locally:
node scripts/verify.js
```

## 📂 Project Structure

```
├── dist/                  # Compiled JavaScript
├── seeds/                 # Database initialization SQL scripts
├── src/
│   ├── config/            # DB and Redis configuration
│   ├── controllers/       # Request handlers (Auth, User)
│   ├── middleware/        # Auth, RBAC, RateLimiter
│   ├── routes/            # Route definitions
│   ├── services/          # Business logic and DB access
│   ├── utils/             # Helpers (AppError, JWT, CatchAsync)
│   ├── app.ts             # Express app setup
│   └── server.ts          # Entry point
├── .env.example           # Environment variable template
├── docker-compose.yml     # Docker services orchestration
├── Dockerfile             # App container definition
├── package.json           # Dependencies
└── README.md              # Documentation
```

## ❓ Troubleshooting

-   **Database Connection Error**: Ensure the `db` service is healthy. Docker Compose handles the startup order, but if you restart the app manually, give the DB a moment to initialize.
-   **"bcrypt" Error**: If you see errors related to `bcrypt` or `ELF header`, re-run `docker-compose up --build`. The Dockerfile includes steps to rebuild bcrypt for the correct architecture.
-   **OAuth 401 Error**: See the "OAuth 2.0 Testing" section above. This is expected if using placeholder credentials. Use the simulation URL or update `.env`.

## 📜 Submission Details
-   **Submission Config**: `submission.json` included in root.
-   **Env Docs**: `.env.example` included in root.
-   **Secrets**: No real secrets are committed to the repository.