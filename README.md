# Pulse — Social Media Dashboard

A full-stack social media dashboard: user profiles with media uploads, real-time messaging, likes/comments/follows, an engagement analytics dashboard, and Redis-powered real-time notifications.

**Stack:** MongoDB · Express.js · React (Vite) · Node.js · Socket.IO · Redis · Cloudinary

## Features

- **Auth** — JWT-based register/login, httpOnly cookie + bearer token support
- **Profiles** — bio, avatar upload (Cloudinary), follow/unfollow
- **Posts** — image/video upload, likes, comments, paginated feed
- **Real-time messaging** — 1:1 conversations over Socket.IO, typing indicators, read receipts, online presence
- **Notifications** — Redis pub/sub fan-out so notifications reach a user regardless of which server instance they're connected to (horizontally scalable), with a Redis-cached unread badge count and recent-notifications list
- **Analytics dashboard** — MongoDB aggregation pipelines for engagement over time and top posts, cached in Redis (5 min TTL)

## Project structure

```
social-dashboard/
├── backend/                 Express API + Socket.IO server
│   ├── config/               MongoDB, Redis, Cloudinary connections
│   ├── controllers/          Route handlers
│   ├── middleware/           Auth, error handling, uploads
│   ├── models/                Mongoose schemas
│   ├── routes/                Express routers
│   ├── sockets/                Socket.IO event handlers + Redis adapter
│   ├── utils/                   Notification service, seed script
│   └── server.js
├── frontend/                React app (Vite + Tailwind)
│   └── src/
│       ├── components/       Shared UI (Shell, PostCard, PostComposer, NotificationPanel)
│       ├── context/            AuthContext, SocketContext
│       ├── pages/               Feed, Messages, Analytics, Profile, Login, Register
│       └── services/            api.js (axios), socket.js (socket.io-client)
└── docker-compose.yml       MongoDB + Redis for local dev
```

## Getting started

### 1. Start MongoDB and Redis

The easiest path is Docker:

```bash
docker compose up -d
```

Or run local installations of MongoDB (27017) and Redis (6379) yourself.

### 2. Backend

```bash
cd backend
cp .env.example .env     # then fill in JWT_SECRET and Cloudinary keys
npm install
npm run seed              # optional: creates 3 demo users + posts
npm run dev                # starts on http://localhost:5000
```

Demo login after seeding: `ava@example.com` / `password123`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:5000` (see `vite.config.js`).

## Environment variables (backend/.env)

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing auth tokens |
| `CLOUDINARY_*` | Cloudinary credentials for media uploads |
| `CLIENT_URL` | Frontend origin, for CORS |

See `backend/.env.example` for the full list.

## How the Redis notification system works

1. An action (like, comment, follow) calls `createNotification()` in `backend/utils/notificationService.js`.
2. The notification is persisted to MongoDB (for history/pagination) and the recipient's unread counter is incremented in Redis (`INCR`).
3. The event is published to a Redis pub/sub channel (`channel:notifications`).
4. **Every** running server instance is subscribed to that channel via `backend/sockets/index.js`, so whichever instance the recipient's socket happens to be connected to delivers the `notification:new` event in real time — this is what makes the system work correctly behind a load balancer with multiple Node processes.
5. Socket.IO itself also uses a Redis adapter (`@socket.io/redis-adapter`) so that messaging and presence events broadcast correctly across instances too.

## Notes on this deliverable

This repository is structured as a genuine, runnable full-stack project. A few things to configure before deploying:

- Add real Cloudinary credentials (or swap in S3/another provider — the upload logic is isolated in `middleware/upload.js` and the controllers).
- Set a strong, unique `JWT_SECRET`.
- For production, run MongoDB/Redis as managed services (Atlas, Upstash/Elasticache) rather than local containers.
- The frontend calls `/api/...` — set up a reverse proxy (Nginx, etc.) or update `services/api.js`'s `baseURL` when frontend and backend are deployed separately.

## License

MIT — see `LICENSE`.
