# Deployment Notes — Lessons Learned

> Quick-reference for every deployment gotcha we've hit.
> Update this file every time you discover something new.

---

## � RUN LOCALLY (for daily development)

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

## 🚀 DEPLOY TO PRODUCTION (copy-paste this)

### Deploy everything:
```bash
cd /Users/clayskaggs/Developer/feelingfine/frontend-web && npm run build && firebase deploy --only hosting && cd ../backend && gcloud run deploy feelingfine-api --source . --region us-central1 --platform managed --allow-unauthenticated && cd ..
```

### Deploy just the frontend:
```bash
cd /Users/clayskaggs/Developer/feelingfine/frontend-web && npm run build && firebase deploy --only hosting
```

### Deploy just the backend:
```bash
cd /Users/clayskaggs/Developer/feelingfine/backend && gcloud run deploy feelingfine-api --source . --region us-central1 --platform managed --allow-unauthenticated
```

### Deploy just the schema:
```bash
cd /Users/clayskaggs/Developer/feelingfine && firebase deploy --only dataconnect
```

## How Deployment Works

### Frontend (Firebase Hosting — MANUAL deploy)
- Firebase Hosting is **NOT auto-deploy** from git push
- `git push` alone does **nothing** for the live site
- You must manually build and deploy:

```bash
cd frontend-web
npm run build
firebase deploy --only hosting
```

- `NEXT_PUBLIC_*` env vars are **baked into JavaScript at build time**
- Changing `.env.production` requires a full rebuild + redeploy
- The live site serves whatever was last deployed, regardless of git

### Backend (Cloud Run — MANUAL deploy)
```bash
cd backend
gcloud run deploy feelingfine-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "FIREBASE_PROJECT_ID=feelingfine-b4106" \
  --set-env-vars "RESEND_API_KEY=re_YOUR_KEY" \
  --set-env-vars "FROM_EMAIL=Art <art@feelingfine.org>"
```

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
**Fix**: Run `npm run build && firebase deploy --only hosting` from `frontend-web/`.

### 4. .env.production has duplicate keys
**Cause**: If a key appears twice, the **first** value wins in Next.js.  
**Fix**: Never have duplicate keys. Always check with `cat .env.production`.

### 5. `.env.local` overrides `.env.production` during builds
**Cause**: Next.js priority is: `.env.local` > `.env.production`. If `NEXT_PUBLIC_API_URL` is in both files, `.env.local` wins — even for production builds.  
**Fix**: Never put `NEXT_PUBLIC_API_URL` in `.env.local`. The code defaults to `localhost:3001` for dev automatically. Only set it in `.env.production` for the Cloud Run URL.

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

## Quick Deploy Cheatsheet

```bash
# Deploy frontend
cd frontend-web
npm run build
firebase deploy --only hosting

# Deploy backend
cd backend
gcloud run deploy feelingfine-api --source . --region us-central1

# Deploy admin
cd frontend-admin
npm run build
firebase deploy --only hosting:admin

# Deploy schema changes
cd dataconnect
firebase deploy --only dataconnect
```

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
