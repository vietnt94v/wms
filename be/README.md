# WMS Backend

NestJS API + Socket.IO for backend-driven warehouse ops. Phase 1: authentication (REST + WS skeleton).

## Stack

- NestJS (REST + WebSocket)
- PostgreSQL 16 (Docker)
- Liquibase (SQL changesets)
- JWT access token + rotating refresh tokens
- Roles: `operator`, `supervisor`, `admin`

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm start:dev
```

API: `http://localhost:3000/api`  
WebSocket namespace: `http://localhost:3000/ws`

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm db:up` | Start Postgres container |
| `pnpm db:migrate` | Run Liquibase migrations |
| `pnpm db:down` | Stop containers |
| `pnpm db:reset` | Wipe volume, recreate DB, migrate |
| `pnpm start:dev` | Nest watch mode |

## DBeaver

Connect to the Docker Postgres instance:

| Field | Value |
|-------|-------|
| Host | `localhost` |
| Port | `5434` (see `POSTGRES_PORT` in `.env`) |
| Database | `wms` |
| Username | `wms` |
| Password | `wms` |

Port defaults to `5434` so it does not collide with other local Postgres instances on `5432`.

## Seed users

Password for all seed users: `Password123!`

| Username | Role |
|----------|------|
| `admin` | admin |
| `supervisor` | supervisor |
| `operator` | operator |

## Auth API

### Login

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"operator","password":"Password123!"}'
```

Response:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "username": "operator",
    "fullName": "Warehouse Operator",
    "roles": ["operator"]
  }
}
```

### Me

```bash
TOKEN='<accessToken>'
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Refresh

```bash
curl -s -X POST http://localhost:3000/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'
```

### Logout

```bash
curl -s -X POST http://localhost:3000/api/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'
```

### Admin-only sample

```bash
curl -s http://localhost:3000/api/auth/roles \
  -H "Authorization: Bearer <adminAccessToken>"
```

## WebSocket (COMMAND_CODE channel)

Connect to namespace `/ws` with the access token:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/ws', {
  auth: { token: accessToken },
});

socket.on('command', (msg) => {
  // { type: 'COMMAND', code: 'AUTH_OK', payload: { user } }
  console.log(msg);
});
```

Envelope shape (for later receiving/ops flows):

```ts
// Client → Server
{ type: 'INTENT', code: 'SCAN_BARCODE', payload: {...}, requestId: '...' }

// Server → Client
{ type: 'COMMAND', code: 'SHOW_ERROR', payload: {...}, requestId?: '...' }
{ type: 'EVENT',   code: 'SESSION_UPDATED', payload: {...} }
```

On successful connect the server joins rooms `user:{id}` and `role:{role}`, then emits `AUTH_OK`.

## Architecture notes

- **REST**: login, profile, admin CRUD, queries/reports
- **WebSocket**: ops intents and backend-driven `COMMAND_CODE` push for UI next steps
- Schema changes: add new Liquibase **SQL** changesets under `db/changelog/changesets/`, then include them from `db/changelog/db.changelog-master.yaml`
