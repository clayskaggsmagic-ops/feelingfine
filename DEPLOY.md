# Feeling Fine — Deployment Guide

> Complete step-by-step instructions for deploying all three services
> and connecting the `feelingfine.org` domain via GoDaddy DNS.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Backend Deployment (Cloud Run)](#2-backend-deployment)
3. [Frontend-Web Deployment (Firebase Hosting)](#3-frontend-web-deployment)
4. [Frontend-Admin Deployment (Firebase Hosting)](#4-frontend-admin-deployment)
5. [GoDaddy DNS Setup](#5-godaddy-dns-setup)
6. [Resend Email DNS (art@feelingfine.org)](#6-resend-email-dns)
7. [Environment Variables Reference](#7-environment-variables)
8. [Post-Deploy Smoke Test](#8-smoke-test)

---

## 1. Prerequisites

Before you start, make sure you have:

- [ ] **Firebase CLI** installed: `npm install -g firebase-tools`
- [ ] **gcloud CLI** installed: [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install)
- [ ] Logged in to both: `firebase login` and `gcloud auth login`
- [ ] Firebase project selected: `firebase use feelingfine-b4106`
- [ ] GoDaddy account with `feelingfine.org` domain
- [ ] Resend account at [resend.com](https://resend.com)

---

## 2. Backend Deployment

### Option A: Google Cloud Run (recommended)

```bash
# From the /backend directory:
cd backend

# Build and deploy to Cloud Run
gcloud run deploy feelingfine-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "FIREBASE_PROJECT_ID=feelingfine-b4106" \
  --set-env-vars "RESEND_API_KEY=re_YOUR_KEY_HERE" \
  --set-env-vars "FROM_EMAIL=Art <art@feelingfine.org>" \
  --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_KEY"
```

After deploy, Cloud Run gives you a URL like:
`https://feelingfine-api-XXXX-uc.a.run.app`

**Save this URL** — you'll need it for the frontend env vars.

### Option B: Firebase App Hosting

```bash
firebase apphosting:backends:create --project feelingfine-b4106
# Follow prompts to connect your repo and set up the backend
```

---

## 3. Frontend-Web Deployment

```bash
cd frontend-web

# Set the production API URL in .env.production
echo "NEXT_PUBLIC_API_URL=https://feelingfine-api-XXXX-uc.a.run.app" > .env.production
echo "NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_KEY" >> .env.production
echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=feelingfine-b4106.firebaseapp.com" >> .env.production
echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=feelingfine-b4106" >> .env.production

# Build
npm run build

# Deploy to Firebase Hosting (default site)
firebase deploy --only hosting:web
```

Your site will be live at: `https://feelingfine-b4106.web.app`
(Custom domain setup in Step 5 below)

---

## 4. Frontend-Admin Deployment

```bash
cd frontend-admin

# Same pattern — create .env.production
echo "NEXT_PUBLIC_API_URL=https://feelingfine-api-XXXX-uc.a.run.app" > .env.production
echo "NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_KEY" >> .env.production
echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=feelingfine-b4106.firebaseapp.com" >> .env.production
echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=feelingfine-b4106" >> .env.production

# Build and deploy to a separate Firebase Hosting site
npm run build
firebase deploy --only hosting:admin
```

Your admin will be at: `https://admin-feelingfine-b4106.web.app`
(Or `admin.feelingfine.org` after DNS setup)

---

## 5. GoDaddy DNS Setup

### 5.1 Get Firebase Hosting verification records

```bash
# Add custom domain to Firebase Hosting
firebase hosting:channel:deploy live --only web
firebase hosting:sites:update default --site feelingfine-b4106

# Or via Firebase Console:
# → Hosting → Add custom domain → feelingfine.org
```

Firebase will give you **two things**:
1. A **TXT record** for ownership verification
2. **A record IPs** for the domain

### 5.2 Log into GoDaddy DNS Manager

1. Go to [dcc.godaddy.com](https://dcc.godaddy.com)
2. Click **feelingfine.org** → **DNS** → **DNS Records**
3. Add the following records:

### DNS Records to Add

| Type  | Name                | Value                                      | TTL    |
|-------|---------------------|--------------------------------------------|--------|
| **A** | `@`                 | `151.101.1.195`                           | 600    |
| **A** | `@`                 | `151.101.65.195`                          | 600    |
| **CNAME** | `www`           | `feelingfine-b4106.web.app`               | 3600   |
| **CNAME** | `admin`         | `admin-feelingfine-b4106.web.app`         | 3600   |
| **TXT** | `@`               | *(Firebase verification string)*          | 3600   |

> **⚠️ IMPORTANT**: The A record IPs above are examples. Use the **exact IPs**
> Firebase gives you in the Console when you add your custom domain.

### 5.3 Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com) → Hosting
2. Click **Add custom domain** → enter `feelingfine.org`
3. Firebase will check your DNS records (may take 10-30 minutes)
4. Once verified, it auto-provisions an **SSL certificate** (free)
5. Repeat for `www.feelingfine.org` and `admin.feelingfine.org`

### 5.4 API Subdomain (optional)

If you want `api.feelingfine.org` to point to your Cloud Run backend:

| Type    | Name  | Value                                     | TTL  |
|---------|-------|-------------------------------------------|------|
| CNAME   | `api` | `feelingfine-api-XXXX-uc.a.run.app`      | 3600 |

Then in Cloud Run:
```bash
gcloud run domain-mappings create \
  --service feelingfine-api \
  --domain api.feelingfine.org \
  --region us-central1
```

---

## 6. Resend Email DNS (art@feelingfine.org)

This is required so that emails actually deliver from `art@feelingfine.org`
instead of being rejected as spam.

### 6.1 Add Domain in Resend

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain** → enter `feelingfine.org`
3. Resend will show you **3 DNS records** to add:

### 6.2 Add DNS Records in GoDaddy

Resend will give you records like these (use their **exact values**):

| Type  | Name                              | Value                                        | TTL  |
|-------|-----------------------------------|----------------------------------------------|------|
| **TXT** | `@`                             | `v=spf1 include:_spf.resend.com ~all`       | 3600 |
| **CNAME** | `resend._domainkey`           | `(Resend gives you this value)`              | 3600 |
| **TXT** | `_dmarc`                        | `v=DMARC1; p=none; rua=mailto:art@feelingfine.org` | 3600 |

### Step-by-Step in GoDaddy:

1. Log into GoDaddy → DNS Records for `feelingfine.org`
2. **SPF Record** (may need to merge with existing TXT):
   - Type: TXT
   - Name: `@`
   - Value: `v=spf1 include:_spf.resend.com ~all`
3. **DKIM Record**:
   - Type: CNAME
   - Name: `resend._domainkey`
   - Value: *(copy exact value from Resend dashboard)*
4. **DMARC Record**:
   - Type: TXT
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:art@feelingfine.org`

### 6.3 Verify in Resend

1. Back in Resend dashboard, click **Verify DNS**
2. Wait 5-30 minutes for DNS propagation
3. Once verified, you'll see a green ✅ next to each record
4. Your `RESEND_API_KEY` env var on Cloud Run will now work

### 6.4 Set the Environment Variable

```bash
# Add to Cloud Run
gcloud run services update feelingfine-api \
  --set-env-vars "RESEND_API_KEY=re_XXXXX" \
  --region us-central1
```

---

## 7. Environment Variables

### Backend (.env / Cloud Run env vars)

| Variable              | Description                        | Example                              |
|-----------------------|------------------------------------|--------------------------------------|
| `PORT`                | Server port                        | `3001`                               |
| `NODE_ENV`            | Environment                        | `production`                         |
| `FIREBASE_PROJECT_ID` | Firebase project                   | `feelingfine-b4106`                 |
| `RESEND_API_KEY`      | Resend email API key               | `re_xxxxx`                          |
| `FROM_EMAIL`          | Sender email address               | `Art <art@feelingfine.org>`         |
| `GEMINI_API_KEY`      | Google Gemini API key              | `AIzaSy...`                         |

### Frontend (.env.production)

| Variable                          | Description                    | Example                              |
|-----------------------------------|--------------------------------|--------------------------------------|
| `NEXT_PUBLIC_API_URL`             | Backend API URL                | `https://api.feelingfine.org`       |
| `NEXT_PUBLIC_FIREBASE_API_KEY`    | Firebase web API key           | `AIzaSy...`                         |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`| Firebase auth domain           | `feelingfine-b4106.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID            | `feelingfine-b4106`                |

---

## 8. Post-Deploy Smoke Test

After everything is deployed and DNS is connected, run through this checklist:

- [ ] `https://feelingfine.org` loads the landing/login page
- [ ] Sign up with email/password works
- [ ] Google Sign-In works
- [ ] Onboarding survey completes and redirects to dashboard
- [ ] Dashboard shows Daily Dose, Feeling Score, Daily Dos
- [ ] Complete a do → it saves and shows completed state
- [ ] Report page shows charts
- [ ] Community page loads all tabs
- [ ] Settings page saves preferences
- [ ] `https://admin.feelingfine.org` loads admin portal
- [ ] Admin passcode verification works
- [ ] Admin can create/edit doses, dos, surveys
- [ ] Admin user list shows all users
- [ ] Send test email → arrives at test address from `art@feelingfine.org`
- [ ] Password reset email sends
- [ ] Account deletion works (double confirm → data removed)

---

## DNS Propagation Note

DNS changes can take **10 minutes to 48 hours** to fully propagate worldwide.
You can check propagation status at:
- [dnschecker.org](https://dnschecker.org)
- [whatsmydns.net](https://www.whatsmydns.net)

If Firebase Hosting shows "Needs setup" after 30+ minutes, verify your
GoDaddy records match exactly what Firebase specifies.

---

*Last updated: February 27, 2026*
