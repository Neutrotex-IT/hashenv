# Root Key Rotation Runbook

This document describes how to rotate the `ROOT_ENCRYPTION_KEY` in HashEnv.

## Overview

The ROOT_ENCRYPTION_KEY is the master secret that protects the instance key. The instance key in turn protects all organization and project encryption keys. Root key rotation re-wraps the instance key with a new root key without touching any other encryption layers.

**What changes:**
- Instance key wrapper

**What stays the same:**
- Organization DEKs
- Project DEKs
- All encrypted data (env files, secrets, accounts)

## Prerequisites

- Access to the current `ROOT_ENCRYPTION_KEY`
- Access to the MongoDB database
- Ability to update environment variables on all server instances
- Ability to restart server instances

## Procedure

### 1. Generate a New Root Key

Generate a new random key (at least 32 characters):

```bash
# Using openssl
openssl rand -base64 32

# Using node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Store this securely - you'll need it to update your environment.

### 2. Run the Rotation Script

From the backend directory:

```bash
# Ensure environment is loaded
export MONGODB_URI="your-mongodb-uri"
export ROOT_ENCRYPTION_KEY="your-current-key"

# Run rotation
npx ts-node scripts/rotate-root-key.ts "your-new-key-here"
```

The script will:
1. Connect to MongoDB
2. Verify the current instance key exists
3. Unwrap the instance key using the current root key
4. Re-wrap the instance key using the new root key
5. Verify the new key works

### 3. Update Environment Variables

After successful rotation, update `ROOT_ENCRYPTION_KEY` in all environments:

**Local development:**
```bash
# Update .env file
ROOT_ENCRYPTION_KEY="your-new-key-here"
```

**Production (e.g., Render, Heroku):**
1. Go to your hosting platform's secrets/env management
2. Update `ROOT_ENCRYPTION_KEY` with the new value

### 4. Restart Servers

Restart all server instances to pick up the new key:

```bash
# Local
npm run dev

# Production - varies by platform
# Render: Deploy triggers automatic restart
# Heroku: heroku restart
```

### 5. Verify

Check the health endpoint to confirm encryption is working:

```bash
curl https://your-api-url/api/health
```

Expected response:
```json
{
  "status": "ok",
  "encryption": {
    "initialized": true,
    "hasInstanceKey": true
  }
}
```

## Rollback

If something goes wrong:

1. **Before restart:** Simply revert the `ROOT_ENCRYPTION_KEY` to the original value and restart.

2. **After failed rotation script:** The database wasn't modified. Re-run with correct parameters.

3. **After restart with wrong key:** The server will fail to start (fail-fast). Update `ROOT_ENCRYPTION_KEY` to the correct value.

## Security Notes

- Never commit root keys to version control
- Store keys in secure secret management (Vault, AWS Secrets Manager, etc.)
- Rotate keys periodically (e.g., annually) or after suspected compromise
- Keep a secure backup of the current key before rotation
- Audit who has access to rotation capability

## Troubleshooting

**"Failed to unwrap instance key"**
- The current `ROOT_ENCRYPTION_KEY` is incorrect
- Verify you're using the key that was used to create the instance key

**"No instance key found"**
- Database is empty or was reset
- New server boot will create a new instance key automatically

**Server won't start after rotation**
- `ROOT_ENCRYPTION_KEY` environment variable doesn't match what was used in rotation
- Update the environment variable to match the new key used in rotation
