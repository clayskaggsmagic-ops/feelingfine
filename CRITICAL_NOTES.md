# ⚠️ CRITICAL NOTES - READ BEFORE EVERY CODING SESSION ⚠️

## 🚨 MANDATORY: USE LATEST VERSIONS OF EVERYTHING 🚨

**YOUR TRAINING DATA IS OUTDATED.** Before writing ANY code:

1. **SEARCH ONLINE** for the latest documentation
2. **VERIFY** package versions on npm/PyPI
3. **USE** the newest APIs and techniques
4. **NEVER** assume your knowledge is current

---

## 🔴 DATABASE IS PostgreSQL VIA FIREBASE DATA CONNECT — NOT FIRESTORE 🔴
- **ALL data lives in Cloud SQL PostgreSQL**, managed through Firebase Data Connect
- Schema is defined in `dataconnect/schema/schema.gql` (GraphQL → auto-generates SQL tables)
- Queries/mutations are in `dataconnect/connector/queries.gql` and `mutations.gql`
- **NEVER** import Firestore `db` for data operations — use `dataConnect.js` exclusively
- **ALL** data access goes through `backend/src/services/dataConnect.js`
- Firebase Auth (`auth`) is still used for authentication tokens — that is separate from the database
- Seed data goes to PostgreSQL via `insertMany()` — NOT Firestore `batch.set()`
- Data Connect service config: `serviceId: 'feelingfine'`, `location: 'us-east4'`

---

## 1. SEARCH BEFORE INSTALLING DEPENDENCIES
- Training data is OUTDATED
- Before adding ANY package:
  - Search npm DIRECTLY for current version
  - Read the latest documentation
  - Check for breaking changes
  - YOU SHOULD HAVE THE LATEST VERSIONS OF ALL DEPENDENCIES
- Search online for documentation also to make sure you are using best/new way

## 2. SINGLE SOURCE OF TRUTH
- ONE backend handles ALL business logic
- Frontend is a thin display layer
- All state flows through the API
- NEVER duplicate logic between frontend and backend
- If copying code, refactor into shared modules

## 3. FRONTENDS ARE FULLY INDEPENDENT & MODULAR
- **Each frontend is its own codebase**: `frontend-web` (desktop/tablet), `frontend-admin`, and future iOS app
- **Changing one frontend MUST NOT require changes to any other frontend**
- **All frontends consume the same REST API** — no shared runtime state between them
- Shared design tokens (`design-tokens.css`) are the ONLY cross-frontend dependency
- No frontend should import code from another frontend directory
- Each frontend can be deployed, updated, and versioned independently

## 4. KEEP IT SIMPLE
- Prefer fewer files with clear responsibilities
- Avoid premature abstraction
- Every file should have an obvious purpose
- If you can't explain a file in one sentence, split it

## 5. DEBUGGING IS PARAMOUNT
- Comprehensive logging at every decision point
- Structured logs on the backend
- Error boundaries with clear messages, not silent failures

## 6. TESTING IS MANDATORY
- Unit tests for critical backend logic
- Integration tests for API endpoints
- Test error handling paths
- Test frontend displays correct data

## 7. NO AI-LOOKING DESIGN
- **NO** emojis in the UI (use proper icons instead)
- **NO** clutter — white space is luxury

## 8. NEVER PUT API KEYS IN TRACKED FILES
- **NEVER** paste real API keys, tokens, or secrets into `.md`, `.js`, or ANY file tracked by git
- This repo is **PUBLIC** — anything committed is visible to the world
- Real keys go in **only two safe places**:
  1. `backend/.env` (gitignored — never committed)
  2. Cloud Run `--set-env-vars` (typed directly in terminal at deploy time)
- Tracked docs (`DEPLOY.md`, `DEPLOYMENT_NOTES.md`, etc.) must use placeholders: `YOUR_RESEND_API_KEY`, `YOUR_GEMINI_API_KEY`
- **Incident**: On Feb 27, 2025, real Resend and Gemini API keys were pasted into `DEPLOY.md` and `DEPLOYMENT_NOTES.md`, pushed to GitHub, and flagged by Google security. Both keys had to be rotated immediately.
