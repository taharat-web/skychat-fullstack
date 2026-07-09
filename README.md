# SkyChat

A complete, production-ready real-time chat application — one-to-one and group messaging, friend requests,
enforced group roles (admin/moderator/member), typing indicators, delivery/seen receipts, notifications, chat
backup/export, and an audit-style activity log. Dark, WhatsApp-inspired UI in green.

```
Backend:  Node.js · Express · Socket.IO · PostgreSQL · Prisma · Redis
Frontend: React 18 · Vite · Tailwind CSS · Zustand · Socket.IO client
```

---

## 1. Features

**Auth & accounts** — sign up, mandatory email verification before login, forgot/reset password, JWT access
tokens + rotated database-backed refresh tokens in an httpOnly cookie, bcrypt password hashing.

**Messaging** — real-time one-to-one and group chat over WebSockets, typing indicators, online/offline presence
with "last seen", delivered/seen receipts, edit & delete (with moderator delete-in-group), unread counts, paginated
message history, chat backup/export to JSON.

**Social graph** — user search, friend requests (send/accept/reject/cancel), block/unblock (mutually hides users
and revokes any pending requests/friendship).

**Groups** — create groups, add/remove members, promote/demote moderators, admin ban (permanent) vs. mod/admin kick
(re-addable), automatic admin succession when an admin leaves, group info editing, group photo upload, group-scoped
activity log.

**Notifications** — persisted + real-time for new messages (when offline), friend requests, group invites,
role changes, and moderation actions.

**Security** — RBAC enforced entirely server-side, Zod input validation on every endpoint, Redis-backed rate
limiting on auth/message endpoints, Helmet + CORS + CSRF-conscious cookie scoping, strict image-only avatar
uploads re-encoded server-side, centralized error handling that never leaks internals.

---

## 2. Project structure

```
skychat/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Full data model
│   │   └── seed.js              # Demo users, friendship, DM, group
│   ├── src/
│   │   ├── config/              # env validation, Prisma client, Redis client
│   │   ├── middleware/          # auth, validation, rate limiting, uploads, errors
│   │   ├── modules/             # auth, users, friends, conversations, messages,
│   │   │                        # groups, notifications, backup, activityLog
│   │   ├── sockets/             # Socket.IO bootstrap, presence, chat/typing handlers
│   │   ├── utils/                # jwt, tokens, password, email, permissions, etc.
│   │   ├── app.js               # Express app
│   │   └── server.js            # HTTP + Socket.IO bootstrap, graceful shutdown
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                 # axios client + all endpoint calls
│   │   ├── store/                # Zustand: auth, chat, notifications
│   │   ├── context/              # Socket.IO provider
│   │   ├── components/           # layout, chat, friends, groups, notifications, common
│   │   ├── pages/                 # one file per route
│   │   └── App.jsx                # route table
│   ├── nginx.conf                # serves the SPA + proxies /api and /socket.io
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

---

## 3. Quick start (Docker Compose — recommended)

Requires Docker and Docker Compose.

```bash
cd skychat

# 1. Configure the backend environment
cp backend/.env.example backend/.env
# Open backend/.env and set:
#   JWT_ACCESS_SECRET   → a long random string (e.g. `openssl rand -hex 64`)
#   CLIENT_URL          → http://localhost (matches the Nginx frontend below)
# Leave DATABASE_URL / REDIS_URL as-is — docker-compose.yml overrides them
# to point at the "postgres" and "redis" containers automatically.
# Leave SMTP_HOST empty to have verification/reset emails logged to the
# backend console instead of actually sent (fine for local testing).

# 2. Build and start everything
docker compose up -d --build

# 3. Run database migrations (first time only)
docker compose exec backend npx prisma migrate deploy

# 4. (Optional) Seed demo data - 3 users, a friendship, a DM, and a group
docker compose exec backend npm run seed
```

Open **http://localhost** — the frontend, API, and WebSocket are all served from that one origin via the bundled
Nginx reverse proxy.

If you seeded demo data, log in with any of:

| Email | Password | Role |
|---|---|---|
| `alice@skychat.dev` | `Password123!` | Group admin |
| `bob@skychat.dev` | `Password123!` | Group moderator |
| `carol@skychat.dev` | `Password123!` | Group member (has a pending friend request to Alice) |

To stop everything: `docker compose down` (add `-v` to also wipe the database/upload volumes).

---

## 4. Manual setup (without Docker)

Requires Node.js 18+, PostgreSQL 14+, and Redis 6+ running locally.

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL / REDIS_URL to your local instances, and set
# JWT_ACCESS_SECRET to a long random string.

npm install
npx prisma migrate dev --name init   # creates tables and generates the Prisma client
npm run seed                          # optional demo data

npm run dev     # starts on http://localhost:5000 with auto-reload
# or: npm start  for a plain production start
```

### Frontend

```bash
cd frontend
npm install
npm run dev     # starts on http://localhost:5173
```

The Vite dev server proxies `/api`, `/uploads`, and `/socket.io` to `http://localhost:5000` (see
`frontend/vite.config.js`), so no CORS configuration or extra env vars are needed for local development — just
open **<http://localhost:5173>**.

---

## 5. Environment variables

### `backend/.env`

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | |
| `REDIS_URL` | Redis connection string | presence, rate limiting, Socket.IO scaling |
| `JWT_ACCESS_SECRET` | Signs access tokens | **must** be long/random; app refuses to start without one |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | default `15m` |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | Refresh session lifetime | default `30` |
| `CLIENT_URL` | Frontend origin | used for CORS and links in emails |
| `COOKIE_SECURE` | `true` in production (HTTPS) | refresh-token cookie `Secure` flag |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Outgoing email | leave `SMTP_HOST` empty to log emails to the console instead |
| `UPLOAD_DIR` | Local avatar storage path | default `uploads` |
| `MAX_AVATAR_SIZE_MB` | Upload size limit | default `5` |
| `AUTH_RATE_LIMIT_*` / `MESSAGE_RATE_LIMIT_*` | Rate limiting tuning | see `.env.example` |

### `frontend/.env` (optional)

Both variables are optional — leave them unset to use same-origin requests, which work automatically with both
the Vite dev proxy and the bundled Nginx config.

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Only needed if the API is on a genuinely different origin (no shared reverse proxy) |
| `VITE_SOCKET_URL` | Same, for the Socket.IO connection |

---

## 6. Design decisions & assumptions

The brief left some implementation choices open. Here's what was decided and why:

- **PostgreSQL + Prisma** over a document store: the data is inherently relational (friend requests, per-recipient
  message status, group membership with roles), and Prisma gives migrations + type-safe queries out of the box.
- **Direct messages require an accepted friend request.** This makes the friend-request feature meaningful and
  mirrors how blocking is expected to work (block ⇒ can no longer message).
- **Message content is text only.** File/image attachments in messages weren't in the explicit feature list, so
  they were left out to keep scope honest; profile and group avatars *are* supported (with strict image
  validation) since that's the one file-upload path the spec's security section anticipates.
- **Group roles:** Admin has full control (edit info, delete group, ban, promote/demote). Moderators can add
  members, kick (non-permanently remove) regular members, and delete any message — "assisting with moderation" —
  but cannot ban, change roles, or edit group info. If an admin leaves, the longest-tenured moderator (or member,
  if no moderators) automatically becomes admin; if they were the last participant, the group is deleted.
- **Local disk storage for avatars** (via a Docker volume) rather than S3, to keep the stack self-contained and
  "ready to host immediately" without requiring cloud credentials. Swapping in S3-compatible storage later just
  means changing `backend/src/utils/imageStorage.js`.
- **Refresh tokens are opaque, database-backed, and rotated** on every use (not long-lived JWTs) so sessions can
  be revoked server-side — on password change/reset, and automatically if a revoked token is ever replayed.

## 7. Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for Docker Compose production notes, a bare-metal/VPS + Nginx + TLS
walkthrough, and notes on deploying to managed platforms.
