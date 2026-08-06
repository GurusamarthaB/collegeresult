# College Result Portal

This is a Node.js + Express student result portal using Supabase for data storage.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Open `.env` and set:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

4. Start the server:

```bash
npm start
```

The app will run on `http://localhost:3000` by default.

## Publishing

This app requires a Node.js server and Supabase credentials. It cannot be deployed as a purely static site.

When you publish to a host like Render, Heroku, Railway, or Vercel (Node server mode), set these environment variables in your deployment settings:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `PORT` (optional)
- `ADMIN_PASSWORD`
- `JWT_SECRET`

If `SUPABASE_URL` or `SUPABASE_KEY` are missing, the server will fail to start and print a clear error message.

## Important

- Do not commit `.env` to version control.
- Use `.env.example` as the template for deployment.
- Ensure your Supabase project has `students` and `results` tables.

## Deployment (Railway)

Recommended: connect this GitHub repository to Railway via the Railway dashboard. Railway will detect the Node app or the included `Dockerfile` and deploy.

Set the following environment variables in Railway Settings -> Variables:
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_KEY` = your Supabase anon/service key (keep service key server-side only)
- `ADMIN_PASSWORD` and `JWT_SECRET` as needed

Railway will automatically build the app. If you prefer to use Docker, the repository includes a `Dockerfile` and the GitHub Actions workflow builds a Docker image and can push it to GHCR when `CR_PAT` is configured.

## Deployment (Bolt.com)

If Bolt.com supports deploying Docker images or connecting GitHub repositories, use the `Dockerfile` or connect the repo and set the same environment variables above in Bolt's dashboard. If Bolt requires a specific deploy method, provide the details and I will add a dedicated workflow.

## GitHub

This repo includes a GitHub Actions workflow `.github/workflows/ci.yml` that runs basic checks and can build/push a Docker image to GHCR when `CR_PAT` is set as a secret.

### Secrets you should configure in GitHub (if using GHCR)
- `CR_PAT` — personal access token with `packages:write` to push to GHCR

