# Production Deployment Checklist

## Hardcoded values review

### Good — critical values use environment variables

The codebase uses environment variables for all critical configuration. A few fallback values remain worth reviewing.

### Items to review

1. **Next.js CSP header (`frontend/next.config.ts`)**
   - Was hardcoded to localhost; now uses `NEXT_PUBLIC_API_URL` dynamically.
   - Status: fixed.

2. **Email fallback (`backend/src/lib/email.ts`)**
   - Falls back to `noreply@hashenv.com` if `SMTP_FROM` is not set.
   - Impact: low — configure `SMTP_FROM` for production.

3. **Health check log (`backend/src/index.ts`)**
   - Logs localhost URL in development only.
   - Status: acceptable.

---

## Required environment variables for production

### Critical — backend (`backend/.env`)

| Variable | Notes |
|----------|--------|
| `PORT` | Default `3001`; hosting platforms often set this automatically |
| `FRONTEND_URL` | **Critical** — production frontend URL with `https://` (CORS, email links) |
| `MONGODB_URI` | **Critical** — production MongoDB connection string |
| `JWT_SECRET` | **Critical** — new 32+ char secret; do not reuse dev |
| `ROOT_ENCRYPTION_KEY` | **Critical** — new 32-byte base64 key; **losing it loses all encrypted data** |
| `NODE_ENV` | **Critical** — set to `production` |
| `SMTP_*` | Host, port, user, password, `SMTP_FROM` for your domain |
| `CORS_ORIGINS` or `FRONTEND_URL` | Restrict CORS to production frontend |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Critical — frontend (`frontend/.env`)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

Must include `/api` and use `https://` in production.

---

## Security checklist

- [ ] Generate new `JWT_SECRET` for production (min 32 chars)
- [ ] Generate new `ROOT_ENCRYPTION_KEY` for production
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Update `MONGODB_URI` to production database
- [ ] Update `NEXT_PUBLIC_API_URL` to production API
- [ ] Set `NODE_ENV=production`
- [ ] Configure production SMTP credentials
- [ ] Set `SMTP_FROM` to your domain email
- [ ] Enable HTTPS on frontend and API
- [ ] Verify CORS allows only production frontend URL(s)
- [ ] Test auth flows (register, login, verify, reset)
- [ ] Backup `ROOT_ENCRYPTION_KEY` securely (see [ROOT-KEY-ROTATION.md](./ROOT-KEY-ROTATION.md))

---

## Deployment steps

1. **Backend** — set env vars, `npm run build`, `npm start`
2. **Frontend** — set `NEXT_PUBLIC_API_URL`, `npm run build`, `npm start`
3. **Database** — verify network access and TLS from hosting to MongoDB Atlas
4. **Email** — test SMTP; configure SPF/DKIM for your domain

---

## Notes

- Store secrets in your platform's secrets manager, not in the repo.
- Never commit `.env` files.
- MongoDB TLS is enabled automatically when `NODE_ENV=production` (see `backend/src/index.ts`).
