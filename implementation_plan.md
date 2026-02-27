# Feeling Fine — Phased Build Plan

> Copy each prompt below into a **new conversation** (or this one, sequentially). Each chunk is self-contained but builds on previous work. After each one, push to GitHub before starting the next.
>
> **Rule**: At the start of every prompt, the AI must read [CRITICAL_NOTES.md](file:///Users/clayskaggs/Developer/feelingfine/CRITICAL_NOTES.md) and [read.md](file:///Users/clayskaggs/Developer/feelingfine/read.md) before writing any code.

---

## Prompt 1: Project Scaffolding & Firebase Config Module

```
Read CRITICAL_NOTES.md and read.md first.

Set up the project directory structure per the spec in read.md Appendix B:
- /backend (Node.js/Express API)
- /frontend-web (Next.js 15 App Router)
- /frontend-admin (Next.js 15 App Router)
- /shared (design tokens)

For /backend:
- Initialize with npm, install Express, cors, helmet, morgan, dotenv,
  firebase-admin, and any other essentials. SEARCH NPM for latest versions
  before installing.
- Create src/index.js with a basic Express server (port 3001).
- Create src/services/firebase.js that initializes Firebase Admin SDK using
  the project config for feelingfine-b4106.
- Create a /health endpoint that returns { status: "ok" }.
- Create src/middleware/auth.js that verifies Firebase ID tokens.
- Create src/middleware/errorHandler.js with structured error logging.
- Create .env.example with all required env vars from the spec.

For /frontend-web:
- Initialize Next.js 15 with App Router (use npx, check --help first,
  non-interactive). Use vanilla CSS, no Tailwind.
- Create src/lib/firebase.js with client-side Firebase SDK config.
- Create /shared/design-tokens.css with all CSS custom properties from
  Section 12 of read.md.
- Copy design-tokens.css into both frontend-web and frontend-admin styles/.

For /frontend-admin:
- Initialize Next.js 15 the same way.
- Copy in design-tokens.css.

Verify: backend runs on port 3001, /health returns ok. Both frontends
start with `npm run dev`. Commit and push.
```

---

## Prompt 2: Backend Auth Routes & User Management

```
Read CRITICAL_NOTES.md and read.md first.

Build the authentication backend per Section 5 and Section 7 of read.md:

1. Create src/routes/auth.js with these endpoints:
   - POST /v1/auth/signup — Create Firebase Auth user + Firestore profile
   - POST /v1/auth/login — Validate Firebase token, return user profile
   - POST /v1/auth/google — Handle Google Sign-In token
   - GET /v1/auth/me — Get current user profile from Firestore
   - PATCH /v1/auth/me — Update profile (name, preferences, avatar)
   - DELETE /v1/auth/me — Delete account + all subcollections

2. The user profile document in Firestore /users/{uid} must match the
   schema in Section 5 (uid, email, displayName, joinDate, programDay,
   timezone, emailOptIn, role, preferences, etc.)

3. Create src/middleware/adminAuth.js that checks role === 'admin'.

4. Seed the admin account: when clayskaggsmagic@gmail.com signs in for
   the first time, their Firestore profile should have role: 'admin'.

5. Add comprehensive logging per CRITICAL_NOTES.md.

6. Write integration tests for signup, login, get profile, update profile.

Verify: Test each endpoint with curl or a test script. Commit and push.
```

---

## Prompt 3: Backend Content & Tracking Routes

```
Read CRITICAL_NOTES.md and read.md first.

Build content delivery and tracking per Sections 7 and 10 of read.md:

1. Create src/routes/content.js:
   - GET /v1/content/daily-dose — Returns today's dose based on user's
     programDay. Days 1-7 = fixed. Day 8+ = personalized by labels.
   - GET /v1/content/daily-dos — Returns today's dos based on programDay
     and focused cornerstone (day-of-week mapping from Section 16.1).
   - GET /v1/content/cornerstones — Returns all cornerstone definitions.

2. Create src/routes/tracking.js:
   - GET /v1/tracking/today — Today's tracking doc
   - GET /v1/tracking/history?days=30 — Historical tracking
   - POST /v1/tracking/feeling-score — Submit feeling score (1-10)
   - POST /v1/tracking/complete-do — Mark a do as completed
   - POST /v1/tracking/uncomplete-do — Unmark a do
   - POST /v1/tracking/custom-do — Add custom do
   - GET /v1/tracking/report — Aggregated trends

3. Create src/services/programService.js — Logic for selecting the right
   dose/dos based on programDay, user labels, and cornerstone focus.

4. Tracking data stored in /users/{uid}/tracking/{dateKey} subcollection.

5. Add structured logging throughout.

Verify: Test with curl. Commit and push.
```

---

## Prompt 4: Firestore Content Seeding

```
Read CRITICAL_NOTES.md and read.md first.

Create a seed script at /backend/scripts/seed.js that populates Firestore
with ALL the seed data from read.md Appendix F:

1. 7 Cornerstones (Section 16.1) into /cornerstones collection
2. 140 Daily Dos (Appendix F, 20 per cornerstone) into /dailyDos
3. 7 Week 1 Daily Doses with educational banners (Appendix F) into
   /dailyDoses
4. 10 Rotating post-program doses (Appendix F) into /dailyDoses
5. The Onboarding Survey with all 18 questions (Section 11) into /surveys
6. 7 Daily Check-In Banners for Week 1 (Section 11) into /surveys
7. Default app settings into /appSettings
8. Default email template into /emailTemplates
9. Admin passcode (bcrypt hashed "RAniMe8CXQJw5ayd") into appSettings

Run the script so the database is fully populated. Verify data appears
in the Firebase Console. Commit and push.
```

---

## Prompt 5: Frontend Auth Flow (Sign Up, Login, Onboarding)

```
Read CRITICAL_NOTES.md and read.md first.

Build the frontend auth flow in /frontend-web per Sections 5 and 12:

1. Landing page (/) — Warm, elegant hero. "Feeling Fine" branding. Big
   "Get Started" and "Sign In" buttons. Use the design tokens. NO emojis
   in the UI — use proper icons or nothing.

2. Sign Up page (/signup) — Email/password form with name field. Google
   Sign-In button. Firebase Auth client SDK. On success, call backend
   POST /v1/auth/signup to create Firestore profile, then redirect to
   onboarding.

3. Login page (/login) — Email/password + Google. On success, call
   POST /v1/auth/login to validate, redirect to /dashboard.

4. Create hooks/useAuth.js — Auth context with Firebase onAuthStateChanged,
   token management, auto-refresh. Protects authenticated routes.

5. Create services/api.js — Fetch wrapper that automatically attaches
   the Firebase ID token as Bearer header to all API calls.

6. Global layout with auth-aware navigation.

Design rules: 18px minimum body text, 48px touch targets, warm teal
palette, glassmorphic cards, Inter + Merriweather fonts. No clutter.

Verify: Full sign-up and login flow works. New user shows in Firebase
Auth console and Firestore /users. Commit and push.
```

---

## Prompt 6: Onboarding Survey UI

```
Read CRITICAL_NOTES.md and read.md first.

Build the onboarding survey at /frontend-web/onboarding per Section 11:

1. After signup, redirect to /onboarding which fetches the onboarding
   survey from GET /v1/surveys/pending.

2. Display ONE question per screen on mobile, 3-4 on desktop.

3. Support all question types: scale (1-10 with labeled endpoints),
   single_choice (radio buttons), multiple_choice (checkboxes),
   free_text (textarea), and the special Aging Attitude cards (Q17).

4. Progress indicator: "Question 3 of 18"

5. Large touch targets (48px+ radio/checkbox), large font (18px+).

6. Submit via POST /v1/surveys/{surveyId}/submit.

7. On completion, set onboardingSurveyCompleted = true on user profile
   and redirect to /dashboard.

8. Build the survey routes on the backend if not done:
   - GET /v1/surveys/pending
   - GET /v1/surveys/:surveyId
   - POST /v1/surveys/:surveyId/submit

9. After submission, compute user labels from answers (Section 11:
   needs-movement, needs-sleep, high-stress, etc.) and save to user
   profile.

Verify: Complete the full onboarding flow end-to-end. Survey response
saved in Firestore. Labels computed. Commit and push.
```

---

## Prompt 7: Dashboard — Daily Dose & Feeling Score

```
Read CRITICAL_NOTES.md and read.md first.

Build the main dashboard at /frontend-web/dashboard per Sections 13 & 16:

1. Greeting: "Good morning, [Name]" with time-aware greeting.

2. Daily Dose Card — Large, prominent card. Tap/click to reveal the
   dose message in serif typography (Merriweather, 22px). Smooth
   animation on reveal. Fetch from GET /v1/content/daily-dose.

3. Feeling Score — "How fine are you feeling today?" with 1-10 selector.
   Large numbered circles on desktop. Submit via POST /v1/tracking/
   feeling-score.

4. Pop-up Banner (Week 1 only) — Full-screen modal that appears on
   first app open each day. Contains educational paragraph + question
   from the Daily Dose. Escape button always visible. Fetch banner
   data from the daily dose response.

5. Navigation — Hamburger menu (top right) with: My Wellness (home),
   Community, My Report, Settings, Log Out.

6. Max content width 800px, centered. Cards with glassmorphic style.
   Hover lift animations. Warm palette throughout.

Verify: Dashboard displays correctly. Dose reveals. Feeling score
submits. Banner shows during Week 1. Commit and push.
```

---

## Prompt 8: Dashboard — Cornerstones & Daily Dos

```
Read CRITICAL_NOTES.md and read.md first.

Add Daily Dos and Cornerstone tracking to the dashboard per Sections 10,
13, and 16:

1. Below the Feeling Score, show today's focused Cornerstone with a
   "TODAY'S FOCUS" badge. Cornerstone name in 28px bold. Show 3-5
   Daily Dos as checkable tasks. Fetch from GET /v1/content/daily-dos.

2. Each task has a checkbox (48px target). Checking calls POST
   /v1/tracking/complete-do. Unchecking calls POST /v1/tracking/
   uncomplete-do.

3. "Add your own..." input at the bottom of the task list. Calls
   POST /v1/tracking/custom-do.

4. Below the focused cornerstone: "Show Other Cornerstones" button.
   Expands to show all 7 as collapsible accordion cards.

5. Use proper icons instead of emojis for cornerstone icons (use SVG
   icons or a lightweight icon library).

6. Cornerstone progress should show completed count vs total.

7. Track cornerstoneProgress in the tracking document.

Verify: Tasks check/uncheck and persist on reload. Custom dos work.
Other cornerstones expand. Commit and push.
```

---

## Prompt 9: Report Page & Wellness Chat

```
Read CRITICAL_NOTES.md and read.md first.

Build the Report/Progress page at /frontend-web/report per Section 16.4:

1. 30-Day bar chart showing daily completed dos. Use simple CSS-based
   bars (like the demo) or a lightweight chart library. Filterable
   by cornerstone.

2. Trend indicator — Compare last 7 days vs previous 7 days (up/down
   arrow + percentage).

3. Feeling Score trend — Line graph of daily scores over 30 days.

4. Fetch all data from GET /v1/tracking/report.

Build the AI Wellness Chat:

5. Create backend route POST /v1/ai/wellness-chat that sends user
   message + tracking context to Gemini API.

6. Create src/services/geminiService.js — Gemini 2.0 Flash integration.
   System prompt: warm wellness guide persona (NOT robotic, no "I'm an
   AI" language). Include user's recent tracking data, feeling scores,
   and labels as context.

7. Chat UI on the report page — message list + input. Simple, clean.

8. Also build POST /v1/ai/report-analysis — AI summary of tracking data.

Verify: Charts render with real tracking data. Chat sends messages and
gets Gemini responses. Commit and push.
```

---

## Prompt 10: Admin Portal — Auth & Dashboard

```
Read CRITICAL_NOTES.md and read.md first.

Build the admin portal in /frontend-admin per Section 8:

1. Passcode screen (/) — Single input: "Enter Admin Passcode". Big
   button. Clean, no-frills. Calls POST /v1/admin/verify-passcode.

2. After passcode, redirect to Google Sign-In. Must have role: 'admin'.

3. Admin Dashboard (/dashboard) — Clean home showing:
   - Total Users count
   - Active Today count
   - Current Program Day
   - Quick Action buttons: "Edit Today's Dose", "Edit Today's Dos",
     "Edit Tomorrow's Email", "View All Users", "Create New Survey"

4. Build backend admin routes:
   - POST /v1/admin/verify-passcode (compare bcrypt hash)
   - GET /v1/admin/analytics (user counts, active today)

5. Admin layout with sidebar navigation: Dashboard, Daily Doses,
   Daily Dos, Surveys, Emails, Users, Settings.

6. Large fonts (16px min body, 20px+ headers). Clear labels.
   Breadcrumbs for navigation.

Verify: Passcode + Google auth flow works. Dashboard shows live stats.
Commit and push.
```

---

## Prompt 11: Admin Portal — Content Managers (Doses, Dos, Surveys)

```
Read CRITICAL_NOTES.md and read.md first.

Build the content management pages in /frontend-admin per Section 8:

1. Daily Dose Manager (/doses):
   - Scrollable list by day number. Shows title, category, status.
   - Click to edit: day number, title, category, message, educational
     paragraph, banner question, email subject, email message, active
     toggle.
   - Preview button showing dose card + banner.
   - Save with confirmation toast.
   - Backend: GET/POST/PATCH/DELETE /v1/admin/doses

2. Daily Do Manager (/dos):
   - List by day number and category.
   - Edit: day number, category, task text, difficulty, active toggle.
   - Bulk import (paste one per line).
   - Backend: GET/POST/PATCH/DELETE /v1/admin/dos

3. Survey Manager (/surveys):
   - List with trigger type and status.
   - Create/edit with question builder (type selector, options, scale
     range, required toggle).
   - Drag-and-drop reorder.
   - Preview mode.
   - Backend: GET/POST/PATCH /v1/admin/surveys

4. Large form fields, big save buttons, confirmation dialogs for
   destructive actions.

Verify: Create, edit, delete content through admin. Verify changes
appear via user-facing API. Commit and push.
```

---

## Prompt 12: Admin Portal — Users, Emails & Settings

```
Read CRITICAL_NOTES.md and read.md first.

Build remaining admin pages per Section 8:

1. User Manager (/users):
   - Searchable, paginated list of all users.
   - Click to view: profile, program day, survey responses, tracking.
   - Ability to reset program day, deactivate account.
   - Export all user data as CSV.
   - Backend: GET /v1/admin/users, GET /v1/admin/users/:uid

2. Email Manager (/emails):
   - View/edit HTML + plain text email template.
   - Preview with sample data.
   - "Send Test Email" button.
   - "Send Now" with confirmation dialog.
   - Backend: GET/PATCH /v1/admin/email-templates,
     POST /v1/admin/email/send-test, POST /v1/admin/email/send-now

3. Settings (/settings):
   - Email send time, timezone, program length, welcome message,
     maintenance mode toggle, admin passcode change.
   - Backend: GET/PATCH /v1/admin/settings

4. Build the Daily Email System (Section 9):
   - Create src/services/emailService.js using Resend API.
   - Create src/jobs/dailyEmailJob.js with node-cron.
   - Batch sends in groups of 100 with delays.
   - Unsubscribe endpoint.

Verify: User list works. Test email sends. Settings save. Commit and push.
```

---

## Prompt 13: Settings, Community & Account Pages

```
Read CRITICAL_NOTES.md and read.md first.

Build remaining user-facing pages in /frontend-web:

1. Settings page (/settings):
   - Profile: edit name, avatar upload (Firebase Storage), email.
   - Accessibility: font size multiplier (1.0x, 1.25x, 1.5x), high
     contrast toggle. Must actually scale all fonts.
   - Notifications: email opt-in/out toggle.
   - Privacy: "Download my data" and "Delete my account" buttons.

2. Community page (/community):
   - Weekly Challenge card (fetched from admin settings).
   - Friends list (stub for now — real friend system is a stretch goal).

3. Password reset flow.

4. Account deletion confirmation flow.

Verify: Font scaling works. Email opt-out persists. Account deletion
removes all data. Commit and push.
```

---

## Prompt 14: Mobile Optimization & Responsive Design

```
Read CRITICAL_NOTES.md and read.md first.

Optimize the frontend for mobile per Section 14:

1. Bottom tab bar on mobile: "My Wellness" and "More" (slide-up sheet
   with Community, Report, Settings, Log Out).

2. Full-width cards, no side margins beyond 16px.

3. Surveys: one question per screen with large "Next" button.

4. Daily Dose card takes ~40% viewport height.

5. Touch targets: audit every tappable element for 48px minimum.

6. Remove hover effects on touch devices.

7. Cornerstone cards as full-width accordions.

8. Test on multiple viewport sizes (375px, 414px, 768px, 1024px, 1440px).

9. Ensure both desktop and mobile layouts are polished and feel premium.
   No generic UI — this should look and feel like a real product.

Verify: Test on mobile viewport in browser DevTools. All touch targets
meet 48px minimum. Navigation works. Commit and push.
```

---

## Prompt 15: Final Polish, Testing & Deploy

```
Read CRITICAL_NOTES.md and read.md first.

Final pass on the entire application:

1. Error handling: ensure every API call has proper error boundaries
   and user-friendly error messages. No silent failures.

2. Loading states: skeleton screens or spinners for all async fetches.

3. Empty states: friendly messages when no data (no dos completed, no
   tracking history, etc.)

4. SEO: proper title tags, meta descriptions on every page.

5. Performance: lazy load heavy components, optimize images.

6. Security audit: verify no API keys in client code, CORS is locked
   down, rate limiting works.

7. Write remaining tests per CRITICAL_NOTES.md requirements.

8. Deploy:
   - Deploy backend to Firebase App Hosting or Cloud Run.
   - Deploy frontend-web to Firebase Hosting.
   - Deploy frontend-admin to separate Firebase Hosting site.
   - Set up custom domain DNS (instructions for GoDaddy per Section 18).

9. Smoke test the deployed app end-to-end: sign up, onboarding survey,
   view dose, complete dos, view report, admin portal.

Verify: Full end-to-end smoke test on deployed URLs. Commit and push.
```

---

## Quick Reference: What Gets Built When

| Prompt | What You Get | Key Files |
|--------|-------------|-----------|
| 1 | Project scaffolding, Firebase config, design tokens | All directory structures |
| 2 | Auth backend (signup/login/profile) | backend/src/routes/auth.js |
| 3 | Content delivery + tracking API | backend/src/routes/content.js, tracking.js |
| 4 | Seeded database (140 dos, 17 doses, surveys) | backend/scripts/seed.js |
| 5 | Frontend auth (landing, signup, login) | frontend-web/src/app/ |
| 6 | Onboarding survey UI + label computation | frontend-web/src/app/onboarding/ |
| 7 | Dashboard (dose card, feeling score, banners) | frontend-web/src/app/dashboard/ |
| 8 | Cornerstones + Daily Dos (task tracking) | frontend-web/src/components/ |
| 9 | Report charts + AI wellness chat | frontend-web/src/app/report/ |
| 10 | Admin portal (auth, dashboard) | frontend-admin/src/app/ |
| 11 | Admin content managers (doses, dos, surveys) | frontend-admin/src/app/doses/ |
| 12 | Admin users, emails, settings + email system | frontend-admin/src/app/users/ |
| 13 | User settings, community, account management | frontend-web/src/app/settings/ |
| 14 | Mobile responsive optimization | CSS across frontend-web |
| 15 | Polish, testing, deployment | All files |

> **After each prompt**: run `git add -A && git commit -m "Prompt N: description" && git push` from your terminal.
