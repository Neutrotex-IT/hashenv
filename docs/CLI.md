# HashEnv CLI

Command-line tool for pulling secrets files and running commands with HashEnv secrets via API tokens.

## Install

From the repository root:

```bash
cd cli
npm link
```

Or run directly:

```bash
node cli/bin/hashenv.js pull --component website --file .env --env dev
```

## Configuration

| Variable | Description |
|----------|-------------|
| `HASHENV_TOKEN` | Project API token (`henv_...`) with `read` and/or `write` scope |
| `HASHENV_PROJECT` | Project ID |
| `HASHENV_COMPONENT` | Component slug or ID (required for secrets files and component-scoped secrets) |
| `HASHENV_API_URL` | API base URL (default: `http://localhost:3001/api/v1`) |

## Commands

### Pull secrets file

```bash
HASHENV_TOKEN=henv_xxx HASHENV_PROJECT=abc123 HASHENV_COMPONENT=website \
  hashenv pull --env dev --file .env --output .env
```

### Run a command with secrets file injected as env vars

```bash
HASHENV_TOKEN=henv_xxx HASHENV_PROJECT=abc123 HASHENV_COMPONENT=website \
  hashenv run --env dev --file .env -- npm start
```

### Component-scoped secrets (key-value)

```bash
HASHENV_TOKEN=henv_xxx HASHENV_PROJECT=abc123 HASHENV_COMPONENT=website \
  hashenv secret get MY_SECRET

echo "value" | HASHENV_COMPONENT=website hashenv secret set MY_SECRET --stdin
```

### Upload secrets file

```bash
HASHENV_TOKEN=henv_xxx HASHENV_PROJECT=abc123 HASHENV_COMPONENT=website \
  hashenv secrets put --env dev --file .env

cat secrets.json | HASHENV_COMPONENT=app hashenv secrets put --env prod --file secrets.json --stdin
```

## API endpoints used

- `GET /api/v1/projects/:id/components/:component/secret-files?environment=&file=`
- `PUT /api/v1/projects/:id/components/:component/secret-files`
- `GET /api/v1/projects/:id/components/:component/secrets/:name`
- `POST /api/v1/projects/:id/components/:component/secrets`
- `PUT /api/v1/projects/:id/components/:component/secrets/:name`
