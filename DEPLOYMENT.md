# Deploying SkyChat

## Option A — Docker Compose on a single server (fastest path to production)

This is the same `docker-compose.yml` used for local development; the only things that change for a real
deployment are TLS and a couple of environment values.

1. **Provision a server** (any VPS with Docker + Docker Compose installed - 1 vCPU / 1GB RAM is enough to start).
2. **Point a domain at it** (an A record for `chat.example.com`).
3. **Clone the project and configure it:**

   ```bash
   git clone <your-repo-url> skychat && cd skychat
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env`:
   - `JWT_ACCESS_SECRET` → `openssl rand -hex 64`
   - `CLIENT_URL` → `https://chat.example.com`
   - `COOKIE_SECURE` → `true`
   - `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` → real SMTP credentials (SES, SendGrid, Mailgun,
     Postmark, or even a Gmail app password) so verification/reset emails actually deliver.

4. **Put TLS in front of it.** The simplest approach is adding a small Nginx (or Caddy/Traefik) reverse proxy on
   the host in front of the `frontend` container, terminating HTTPS and forwarding to `localhost:80`. Example
   host Nginx server block (assuming Certbot has already issued certs for the domain):

   ```nginx
   server {
       listen 443 ssl http2;
       server_name chat.example.com;

       ssl_certificate     /etc/letsencrypt/live/chat.example.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/chat.example.com/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-Proto https;
       }

       location /socket.io/ {
           proxy_pass http://127.0.0.1:80;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_read_timeout 3600s;
       }
   }

   server {
       listen 80;
       server_name chat.example.com;
       return 301 https://$host$request_uri;
   }
   ```

   (Caddy is simpler if available - `chat.example.com { reverse_proxy localhost:80 }` gets you automatic TLS with
   no extra config.)

5. **Start it:**

   ```bash
   docker compose up -d --build
   docker compose exec backend npx prisma migrate deploy
   docker compose exec backend npm run seed   # optional
   ```

6. **Updates:** `git pull && docker compose up -d --build && docker compose exec backend npx prisma migrate deploy`.

---

## Option B — Bare-metal / VPS without Docker

1. Install Node.js 18+, PostgreSQL 14+, Redis 6+, and Nginx on the server.
2. Create the database and a role for the app: `createuser skychat -P && createdb -O skychat skychat`.
3. Deploy the backend:

   ```bash
   cd backend
   npm ci --omit=dev
   npx prisma migrate deploy
   ```

   Run it under a process manager so it restarts on crash/reboot - either **PM2**:

   ```bash
   npm install -g pm2
   pm2 start src/server.js --name skychat-backend
   pm2 save && pm2 startup
   ```

   or a systemd unit (`/etc/systemd/system/skychat-backend.service`):

   ```ini
   [Unit]
   Description=SkyChat backend
   After=network.target postgresql.service redis.service

   [Service]
   WorkingDirectory=/opt/skychat/backend
   ExecStart=/usr/bin/node src/server.js
   Restart=always
   EnvironmentFile=/opt/skychat/backend/.env
   User=skychat

   [Install]
   WantedBy=multi-user.target
   ```

4. Build the frontend as static files and let Nginx serve them directly:

   ```bash
   cd frontend
   npm ci
   VITE_API_URL=/api npm run build
   ```

   Copy `frontend/dist/*` to e.g. `/var/www/skychat`, and use an Nginx server block equivalent to
   `frontend/nginx.conf` (serve the static files, proxy `/api` and `/socket.io` to `http://127.0.0.1:5000`), with
   TLS via Certbot the same way as Option A.

---

## Option C — Managed platforms (Railway, Render, Fly.io, etc.)

The two services deploy independently:

- **Backend**: deploy `backend/` as a Node web service (`npm start`, with `npm run postinstall` already wired to
  run `prisma generate`). Add a managed Postgres and Redis add-on, and set `DATABASE_URL` / `REDIS_URL` from
  what the platform gives you. Run `npx prisma migrate deploy` as a one-off/release command after each deploy.
  Make sure the platform's persistent disk (or an attached volume) is mounted at the path in `UPLOAD_DIR` if you
  want avatar uploads to survive redeploys - otherwise swap `backend/src/utils/imageStorage.js` for an
  S3-compatible bucket.
- **Frontend**: deploy `frontend/` as a static build (`npm run build`, publish `dist/`) on the same platform or a
  static host (Vercel/Netlify/Cloudflare Pages). Set `VITE_API_URL` and `VITE_SOCKET_URL` to the backend's public
  URL at build time, since there's no shared reverse proxy giving you same-origin requests in this topology.
  Update the backend's `CLIENT_URL` to the frontend's public URL so CORS and email links are correct.

---

## Scaling notes

- The backend is stateless aside from the Socket.IO Redis adapter, which is already wired in
  (`backend/src/sockets/index.js`) — you can run multiple backend replicas behind a load balancer and real-time
  events still reach the right connected clients across instances. Make sure the load balancer supports
  WebSocket upgrades and (ideally) sticky sessions for lower reconnect overhead.
- Redis is also used for rate limiting and presence, so all backend replicas must point at the same Redis
  instance.
- For avatar storage at scale, move from local disk to S3/R2/Spaces (see `imageStorage.js`) so uploads are shared
  across replicas instead of pinned to one instance's disk.

## Backups

- **Database**: `docker compose exec postgres pg_dump -U skychat skychat > backup.sql` (or point standard
  `pg_dump`/managed-Postgres backup tooling at the `postgres_data` volume / your managed instance).
- **Uploads**: back up the `uploads_data` volume (Docker) or your object storage bucket.
- **Per-user data**: users can self-serve a full export any time from Settings → Chat backup, or you can call
  `GET /api/backup/export` on their behalf with a valid access token.
