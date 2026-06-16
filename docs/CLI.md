# HashEnv CLI

Command-line tool for pulling environment files and running commands with HashEnv secrets via API tokens.

## Install

From the repository root:

```bash
cd cli
npm link
```

Or run directly:

```bash
node cli/bin/hashenv.js pull --env dev
```

## Configuration

| Variable | Description |
|----------|-------------|
| `HASHENV_TOKEN` | Project API token (`henv_...`) with `read` and/or `write` scope |
| `HASHENV_PROJECT` | Project ID |
| `HASHENV_API_URL` | API base URL (default: `http://localhost:3001/api/v1`) |

## Commands

### Pull environment file

```bash
HASHENV_TOKEN=henv_xxx HASHENV_PROJECT=abc123 hashenv pull --env dev --output .env
```

### Run a command with env injected

```bash
HASHENV_TOKEN=henv_xxx HASHENV_PROJECT=abc123 hashenv run --env dev -- npm start
```

### Secrets (write scope required for set)

```bash
hashenv secret get MY_SECRET
echo "value" | hashenv secret set MY_SECRET --stdin
```

### Upload environment file

```bash
hashenv env put --env dev --file .env
cat .env | hashenv env put --env staging --stdin
```

## API endpoints used

- `GET /api/v1/projects/:id/env?environment=`
- `PUT /api/v1/projects/:id/env`
- `GET /api/v1/projects/:id/secrets/:name`
- `POST /api/v1/projects/:id/secrets`
- `PUT /api/v1/projects/:id/secrets/:name`
