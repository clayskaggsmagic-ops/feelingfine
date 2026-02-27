# Deployment Notes — Lessons Learned

> Quick-reference for every deployment gotcha we've hit.
> Update this file every time you discover something new.

---

## 🖥 RUN LOCALLY (for daily development)

Open **two terminal tabs** and run one command in each:

**Tab 1 — Frontend** (hot reloads on save, no rebuild needed):
```bash
cd /Users/clayskaggs/Developer/feelingfine/frontend-web && npm run dev
```
→ Opens at `http://localhost:3000`

**Tab 2 — Backend**:
```bash
cd /Users/clayskaggs/Developer/feelingfine/backend && npm run dev
```
→ Runs at `http://localhost:3001`

That's it. Edit code → save → browser updates instantly.

---

## 🚀 DEPLOY TO PRODUCTION (copy-paste these)

### Deploy everything (backend + frontend + admin):
```bash
# 1. Backend → Cloud Run
cd /Users/clayskaggs/Developer/feelingfine/backend && \
gcloud run deploy feelingfine-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=feelingfine-b4106,CORS_ALLOWED_ORIGINS=https://feelingfine.org;https://www.feelingfine.org;https://feelingfine-web.web.app;https://admin.feelingfine.org;https://feelingfine-admin.web.app,RESEND_API_KEY=re_ULaTvF1D_79SjjRKKXYmDSrToDNwpTbFv,FROM_EMAIL=Art <art@feelingfine.org>,GEMINI_API_KEY=AIzaSyCCfWXXcStIocOaXvx6B_3rtdJMMfJE0qY" && \
cd ..

# 2. Frontend-web → Firebase Hosting
cd /Users/clayskaggs/Developer/feelingfine/frontend-web && \
npm run build && \
cd .. && \
firebase deploy --only hosting:web --project feelingfine-b4106

# 3. Frontend-admin → Firebase Hosting
cd /Users/clayskaggs/Developer/feelingfine/frontend-admin && \
npm run build && \
cd .. && \
firebase deploy --only hosting:admin --project feelingfine-b4106
```

### Deploy just the frontend-web:
```bash
cd /Users/clayskaggs/Developer/feelingfine/frontend-web && npm run build && cd .. && firebase deploy --only hosting:web --project feelingfine-b4106
```

### Deploy just the frontend-admin:
```bash
cd /Users/clayskaggs/Developer/feelingfine/frontend-admin && npm run build && cd .. && firebase deploy --only hosting:admin --project feelingfine-b4106
```

### Deploy just the backend:
```bash
cd /Users/clayskaggs/Developer/feelingfine/backend && \
gcloud run deploy feelingfine-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=feelingfine-b4106,CORS_ALLOWED_ORIGINS=https://feelingfine.org;https://www.feelingfine.org;https://feelingfine-web.web.app;https://admin.feelingfine.org;https://feelingfine-admin.web.app,RESEND_API_KEY=re_ULaTvF1D_79SjjRKKXYmDSrToDNwpTbFv,FROM_EMAIL=Art <art@feelingfine.org>,GEMINI_API_KEY=AIzaSyCCfWXXcStIocOaXvx6B_3rtdJMMfJE0qY"
```

### Deploy just the schema (Data Connect):
```bash
cd /Users/clayskaggs/Developer/feelingfine && firebase deploy --only dataconnect --project feelingfine-b4106
```

---

## How Deployment Works

### Frontend-Web (Firebase Hosting — target: `web` → site: `feelingfine-web`)
- Uses Next.js static export (`output: 'export'`) → builds to `frontend-web/out/`
- Firebase Hosting is **NOT auto-deploy** from git push
- `git push` alone does **nothing** for the live site
- You must manually build and deploy
- `NEXT_PUBLIC_*` env vars are **baked into JavaScript at build time**
- Changing `.env.production` requires a full rebuild + redeploy
- The live site serves whatever was last deployed, regardless of git

### Frontend-Admin (Firebase Hosting — target: `admin` → site: `feelingfine-admin`)
- Same as frontend-web: Next.js static export → `frontend-admin/out/`
- Deployed separately: `firebase deploy --only hosting:admin`

### Backend (Cloud Run — service: `feelingfine-api`)
- Cloud Run builds from source using `--source .` (Google buildpacks, no Dockerfile needed)
- Env vars are passed via `--set-env-vars` — they **replace ALL env vars** each time
- Always include **every** env var in the deploy command (not just new ones)
- If you just want to add/change one env var without redeploying code, use:
  ```bash
  gcloud run services update feelingfine-api --region us-central1 \
    --update-env-vars "KEY=value"
  ```
  (But this won't deploy code changes — only env vars.)

### Data Connect (Schema + Connectors)
- Schema: `dataconnect/schema/schema.gql`
- Queries: `dataconnect/connector/queries.gql`
- Mutations: `dataconnect/connector/mutations.gql`
- Deploy with: `firebase deploy --only dataconnect`
- Will show SQL migration diff and ask to confirm

---

## Current Environment Variables

### Backend — Local (`.env`)
| Variable              | Value                                        |
|-----------------------|----------------------------------------------|
| `PORT`                | `3001`                                       |
| `NODE_ENV`            | `development`                                |
| `FIREBASE_PROJECT_ID` | `feelingfine-b4106`                         |
| `CORS_ALLOWED_ORIGINS`| `http://localhost:3000,http://localhost:3002` |
| `RESEND_API_KEY`      | `re_ULaTvF1D_...`                           |
| `FROM_EMAIL`          | `Art <art@feelingfine.org>`                  |
| `GEMINI_API_KEY`      | `AIzaSyCCf...`                               |

### Backend — Production (Cloud Run `--set-env-vars`)
| Variable              | Value                                        |
|-----------------------|----------------------------------------------|
| `NODE_ENV`            | `production`                                 |
| `FIREBASE_PROJECT_ID` | `feelingfine-b4106`                         |
| `CORS_ALLOWED_ORIGINS`| `https://feelingfine.org;https://www.feelingfine.org;https://feelingfine-web.web.app;https://admin.feelingfine.org;https://feelingfine-admin.web.app` |
| `RESEND_API_KEY`      | `re_ULaTvF1D_...`                           |
| `FROM_EMAIL`          | `Art <art@feelingfine.org>`                  |
| `GEMINI_API_KEY`      | `AIzaSyCCf...`                               |

> **Note**: Cloud Run auto-sets `PORT` (usually 8080). Don't hardcode it.

### Frontend-Web — Production (`.env.production`)
| Variable                                | Value                                                     |
|-----------------------------------------|-----------------------------------------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY`          | `AIzaSyBi3niMPGl6_bETr71nOnr5AH8nWfmQPv4`               |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`      | `feelingfine-b4106.firebaseapp.com`                      |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`       | `feelingfine-b4106`                                      |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`   | `feelingfine-b4106.firebasestorage.app`                  |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `336036445684`                                        |
| `NEXT_PUBLIC_FIREBASE_APP_ID`           | `1:336036445684:web:9809306b99ac8eddbb0da1`              |
| `NEXT_PUBLIC_API_URL`                   | `https://feelingfine-api-336036445684.us-central1.run.app` |

### Frontend-Admin — Production (`.env.production`)
Same values as frontend-web (both call the same API).

---

## Common Gotchas

### 1. "Failed to fetch" / CORS errors on live site
**Cause**: Frontend is calling `localhost:3001` instead of Cloud Run.
**Fix**: Check `frontend-web/.env.production` — make sure `NEXT_PUBLIC_API_URL` points to Cloud Run, not localhost. Then **rebuild and redeploy**.
**How to verify**: Open browser DevTools → Network tab → look at the request URL. If it says `localhost`, the old build is still serving.

### 2. Google Sign-In blocked on custom domain
**Cause**: `feelingfine.org` not in Firebase Auth's authorized domains.
**Fix**: Firebase Console → Authentication → Settings → Authorized domains → Add `feelingfine.org` and `www.feelingfine.org`.

### 3. Changes not appearing on live site after git push
**Cause**: Firebase Hosting is manual deploy, not auto-deploy.
**Fix**: Run `npm run build` then `firebase deploy --only hosting:web` from the project root.

### 4. .env.production has duplicate keys
**Cause**: If a key appears twice, the **first** value wins in Next.js.
**Fix**: Never have duplicate keys. Always check with `cat .env.production`.

### 5. `.env.local` overrides `.env.production` during builds
**Cause**: Next.js priority is: `.env.local` > `.env.production`. If `NEXT_PUBLIC_API_URL` is in both files, `.env.local` wins — even for production builds.
**Fix**: Never put `NEXT_PUBLIC_API_URL` in `.env.local`. The code defaults to `localhost:3001` for dev automatically. Only set it in `.env.production` for the Cloud Run URL.

### 6. "Cannot query field" errors after adding new DB columns
**Cause**: You changed `schema.gql`, `mutations.gql`, `queries.gql`, or `dataConnect.js` locally — but didn't deploy the schema to production. The backend code references fields that don't exist in the live database yet.
**Fix**: Run `firebase deploy --only dataconnect` whenever you change any file in the `dataconnect/` folder. It will show you the SQL migration and ask to confirm.

### 7. "Firebase ID token has invalid signature" on production
**Cause**: The user's browser has a stale auth session (e.g., from a previous sign-in before redeployment). The token doesn't match the current backend.
**Fix**: Log out → clear cookies for `feelingfine.org` → sign up or log in again fresh.

### 8. Backend CORS blocks requests from production domain
**Cause**: Cloud Run backend only allows origins listed in `CORS_ALLOWED_ORIGINS` env var. If you deploy without this, it defaults to `localhost:3000` only.
**Fix**: Always include production domains in the backend deploy command (see "Deploy just the backend" above). The current list: `feelingfine.org`, `www.feelingfine.org`, `feelingfine-web.web.app`, `admin.feelingfine.org`, `feelingfine-admin.web.app`.

### 9. `--set-env-vars` replaces ALL env vars
**Cause**: Using `--set-env-vars` on Cloud Run **replaces** the entire set — any var you don't include gets deleted.
**Fix**: Always include every env var in the command. If you only want to add/change one, use `--update-env-vars` instead (but that doesn't deploy code).

### 10. Gemini API key not working
**Cause**: Key is missing or invalid in Cloud Run env vars. The local `.env` key is not used in production.
**Fix**: Ensure `GEMINI_API_KEY` is included in the `--set-env-vars` when deploying backend. Verify the key at [Google AI Studio](https://aistudio.google.com/apikey).

---

## When to Deploy What

| What you changed | What to deploy |
|------------------|---------------|
| Frontend-web code (React, CSS, pages) | `npm run build` + `firebase deploy --only hosting:web` |
| Frontend-admin code | `npm run build` + `firebase deploy --only hosting:admin` |
| Backend code (routes, services) | `gcloud run deploy feelingfine-api --source . ...` |
| Schema (`dataconnect/schema/`) | `firebase deploy --only dataconnect` |
| Mutations/queries (`dataconnect/connector/`) | `firebase deploy --only dataconnect` |
| `.env.production` (frontend) | Frontend rebuild + redeploy |
| Backend `.env` (local only) | Just restart backend locally |
| Backend env vars (Cloud Run) | Backend redeploy with `--set-env-vars` |

---

## Email Setup (Resend)

### Requirements
1. Resend account at [resend.com](https://resend.com)
2. Domain `feelingfine.org` verified in Resend
3. `RESEND_API_KEY` set in backend `.env` AND Cloud Run env vars

### DNS Records for Email (in GoDaddy)
These come from Resend when you add the domain:
- **TXT** record: `resend._domainkey` → (DKIM key from Resend)
- **MX** record: `send` → (Resend bounce server)
- **TXT** record: `send` → (SPF for Resend)
- **TXT** record: `_dmarc` → `v=DMARC1; p=none;`

### Env Var Name
The code uses `RESEND_API_KEY` (not `EMAIL_API_KEY` from `.env.example`).

---

## Firebase Auth Domains

These must be in Firebase Console → Authentication → Settings → Authorized domains:
- `localhost` (dev)
- `feelingfine-b4106.web.app`
- `feelingfine-b4106.firebaseapp.com`
- `feelingfine.org`
- `www.feelingfine.org`
- `admin.feelingfine.org`

---

## Firebase Hosting Targets

Defined in `.firebaserc`:
| Target | Firebase Site | Local Build Output |
|--------|--------------|-------------------|
| `web` | `feelingfine-web` | `frontend-web/out/` |
| `admin` | `feelingfine-admin` | `frontend-admin/out/` |

---

## DNS Records Summary (GoDaddy → feelingfine.org)

| Type  | Name               | Points To                                    | Purpose         |
|-------|--------------------|----------------------------------------------|-----------------|
| A     | @                  | (Firebase IP)                               | Main site       |
| CNAME | www                | feelingfine-web.web.app                     | www redirect    |
| CNAME | admin              | feelingfine-admin.web.app                   | Admin site      |
| TXT   | @                  | hosting-site=feelingfine-web                | Firebase verify |
| TXT   | resend._domainkey  | (DKIM key)                                  | Email auth      |
| MX    | send               | (Resend bounce)                             | Email SPF       |
| TXT   | send               | v=spf1 include:...                          | Email SPF       |
| TXT   | _dmarc             | v=DMARC1; p=none;                           | Email DMARC     |

---

*Last updated: February 27, 2026*
