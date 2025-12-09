# FireFetch Dashboard

Server monitoring and service management dashboard for the AI Homebase.

## Quick Start

```bash
# Development
cd /home/ubuntu/ai/dashboard
npm install
npm run dev

# Production
docker compose up -d --build
```

## Access

- **Production:** https://dashboard.firefetch.org
- **Local Dev:** http://localhost:3002

## Features

- Real-time system metrics (CPU, RAM, disk, network)
- Service status monitoring
- Docker container monitoring
- Uptime Kuma integration
- Dark mode UI

## Tech Stack

- Next.js 14
- React
- Tailwind CSS
- TypeScript

## Configuration

Copy `.env.local.example` to `.env.local` and configure:
- Appwrite credentials (for settings persistence)
- Uptime Kuma API token

## Service Management

```bash
# Check status
docker ps | grep dashboard

# View logs
docker logs dashboard

# Restart
docker compose restart
```

## Documentation

- **Full docs:** See `CLAUDE.md`
- **Integrations:** See `APPWRITE_SETUP.md`, `UPTIME_KUMA_SETUP.md`
- **Archived docs:** `docs/archive/`

## Links

- **Dashboard:** https://dashboard.firefetch.org
- **Uptime Kuma:** https://status.firefetch.org
- **Appwrite Console:** https://backend.firefetch.org/console
