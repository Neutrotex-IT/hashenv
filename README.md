# HashEnv

Secure environment-variable and secrets manager. Stores `.env` files, standalone secrets, and associated service accounts with layered encryption, organization-based access control, audit logging, and API tokens for CI/CD.

## Quick start

```bash
# Backend
cd backend && npm install && cp env.example .env
# Edit .env — see docs/SETUP-AND-USAGE.md
npm run dev

# Frontend (separate terminal)
cd frontend && npm install
# Create frontend/.env with NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

All documentation lives in **[docs/](./docs/)**:

- **[Setup and usage](./docs/SETUP-AND-USAGE.md)** — day-to-day guide
- **[Production checklist](./docs/PRODUCTION-CHECKLIST.md)** — deploy to production
- **[CLI](./docs/CLI.md)** — `hashenv pull` / `hashenv run`
- **[Docs index](./docs/README.md)** — full list

## Project structure

```
hashenv/
├── backend/     Express API (port 3001)
├── frontend/    Next.js app (port 3000)
├── cli/         HashEnv CLI
└── docs/        Documentation
```
