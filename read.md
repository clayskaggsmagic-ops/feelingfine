# FEELING FINE — Full Production Application Specification

> **Purpose**: This document is the complete, authoritative specification for rebuilding "Feeling Fine" from a localStorage-only demo into a production-grade, multi-platform wellness application. It is written to serve as a standalone prompt for an AI coding assistant to implement the entire system from scratch.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Target Audience](#2-product-vision--target-audience)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Authentication & User Management](#5-authentication--user-management)
6. [Database Schema](#6-database-schema)
7. [Backend API](#7-backend-api)
8. [Admin Portal](#8-admin-portal)
9. [Daily Email System](#9-daily-email-system)
10. [The Program: Doses, Dos & Scheduling](#10-the-program-doses-dos--scheduling)
11. [Survey Engine](#11-survey-engine)
12. [Frontend — Shared Design System](#12-frontend--shared-design-system)
13. [Frontend — Web Desktop](#13-frontend--web-desktop)
14. [Frontend — Web Mobile](#14-frontend--web-mobile)
15. [Frontend — iOS App (Future)](#15-frontend--ios-app-future)
16. [Core Feature Specifications](#16-core-feature-specifications)
17. [Security Requirements](#17-security-requirements)
18. [Deployment & Infrastructure](#18-deployment--infrastructure)
19. [Migration from Current Demo](#19-migration-from-current-demo)
20. [Appendices](#20-appendices)

---

## 1. Executive Summary

Feeling Fine is a daily wellness platform designed for **aging adults in their 70s and 80s**. The app delivers a structured wellness program built around **7 Cornerstones of Health** (Nutrition, Movement, Sleep, Stress Management, Social Connection, Brain Health, Healthy Aging). Each day, users receive a **Daily Dose** (an inspirational message or educational concept) and a set of **Daily Dos** (small, actionable wellness tasks). The program is structured into a multi-week onboarding curriculum that gradually personalizes based on survey responses.

### What Exists Today (The Demo)

The current app (`feeling-fine-demo`) is a **Vite + React single-page application** with:

- **No backend** — all data is in `localStorage`
- **No real authentication** — user just enters their name
- **No database** — tracking data, custom acts, chat history all in browser storage
- **Hardcoded content** — Daily Doses are static quotes in `models.js`, Small Acts are static arrays
- **Mock AI service** — `GeminiService.js` returns an offline placeholder message
- **Mock community** — Friends (Sarah, Mike, Emma) are hardcoded with fake avatars and activities
- **No admin interface** — content changes require code edits
- **Single frontend** — one React app handles both mobile and desktop via responsive CSS

### What We Are Building

A **fully production-ready platform** with:

- **Secure backend** with API keys, secrets, and business logic hidden from the client
- **Real database** (PostgreSQL via Firebase Data Connect) for all user data, tracking, content, and surveys
- **Firebase Authentication** with email/password and Google Sign-In
- **Admin portal** for non-technical content management (Daily Doses, Daily Dos, emails, surveys)
- **Automated daily email system** that sends personalized Daily Dose emails to every user
- **Multi-platform frontends**: Web Desktop, Web Mobile, and iOS App — all separate codebases sharing the same design system and API
- **Structured program** with a scheduled first-week curriculum followed by personalized content
- **Survey engine** for onboarding questionnaires, daily check-ins, and periodic assessments
- **AI-powered wellness assistant** backed by Gemini with real API integration

---

## 2. Product Vision & Target Audience

### Target Users

| Attribute | Detail |
|---|---|
| **Age Range** | 70–85 years old |
| **Tech Comfort** | Low to moderate — can use a smartphone and web browser, but not power users |
| **Goals** | Maintain health, stay socially connected, keep mentally sharp, feel purposeful |
| **Challenges** | Vision limitations (need large fonts), motor limitations (need large tap targets), cognitive load (need simple interfaces), potential hearing loss |
| **Devices** | iPad, desktop computer, iPhone — roughly in that order of preference |

### Design Philosophy

1. **Simple does NOT mean ugly.** The UI must be modern, elegant, and sleek — it just can't be complicated.
2. **Nothing should look AI-generated.** No generic stock-art vibes, no "Hello! I'm your AI assistant!" language. Everything should feel human, warm, and personal.
3. **Big, clear, readable.** Minimum body text of `18px`. Headers should be prominent. Touch targets should be at least `48px`.
4. **One thing at a time.** Don't overwhelm with options. Show the daily focus prominently. Hide secondary features behind menus.
5. **Progressive disclosure.** Start simple, let users explore deeper if they choose.
6. **Warm palette.** Keep the current deep teal (`#2c7a7b`) + soft teal (`#38b2ac`) + warm coral (`#ed8936`) palette. It's calming and non-clinical.

### Key UX Mantras

- "My grandpa should be able to use this without calling me for help."
- "It should feel like a friendly daily letter, not an app."
- "If someone has to think about where to tap, we failed."

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTENDS                                 │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Web Desktop │  │ Web Mobile  │  │  iOS App (React Native) │  │
│  │  (Next.js)   │  │ (Next.js)   │  │  (Future Phase)         │  │
│  └──────┬───────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                  │                      │                │
│         └──────────────────┴──────────────────────┘                │
│                            │                                       │
│                     HTTPS / REST API                               │
│                            │                                       │
├────────────────────────────┼───────────────────────────────────────┤
│                        BACKEND                                     │
│                            │                                       │
│  ┌─────────────────────────┴─────────────────────────────────┐    │
│  │              Node.js / Express API Server                  │    │
│  │                                                            │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │    │
│  │  │ Auth     │ │ Content  │ │ Tracking │ │ Email       │  │    │
│  │  │ Routes   │ │ Routes   │ │ Routes   │ │ Service     │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │    │
│  │  │ Survey   │ │ Admin    │ │ AI/      │ │ Scheduled   │  │    │
│  │  │ Routes   │ │ Routes   │ │ Gemini   │ │ Jobs (Cron) │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │    │
│  └───────────────────────────────────────────────────────────┘    │
│                            │                                       │
├────────────────────────────┼───────────────────────────────────────┤
│                        DATA LAYER                                  │
│                            │                                       │
│  ┌──────────────┐  ┌──────┴───────┐  ┌────────────────────┐      │
│  │ Firebase     │  │  Firestore   │  │  Firebase Storage  │      │
│  │ Auth         │  │  Database    │  │  (Media/Assets)    │      │
│  └──────────────┘  └──────────────┘  └────────────────────┘      │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  External Services: Gemini API, SendGrid/Resend (Email)  │     │
│  └──────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Strict Frontend/Backend Separation.** No API keys, no business logic, no direct database access on the frontend. Ever.
2. **API-First Design.** Every feature the frontend needs is exposed through a documented REST endpoint. This ensures any frontend (web, mobile, iOS) can consume the same API.
3. **Separate Frontend Codebases.** Web Desktop, Web Mobile, and iOS are independent projects. They share a design token file and component library concept, but can be modified independently.
4. **Backend Owns All Content.** Daily Doses, Daily Dos, surveys, and program schedules live in the database. The admin portal writes to the database; the frontends read from it via the API.

---

## 4. Technology Stack

### Backend

| Component | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js 20 LTS | JavaScript ecosystem, shared language with frontend, excellent Firebase SDK support |
| **Framework** | Express.js | Lightweight, battle-tested, easy to understand and modify |
| **Authentication** | Firebase Authentication | Handles email/password + Google Sign-In out of the box, secure token verification on backend |
| **Database** | PostgreSQL via Firebase Data Connect | Relational SQL database, managed Cloud SQL instance, strong data integrity with foreign keys and joins, familiar SQL interface |
| **File Storage** | Firebase Storage | For podcast audio, avatar images, any uploaded media |
| **AI Service** | Google Gemini API (gemini-2.0-flash) | Wellness assistant, personalized recommendations, survey analysis |
| **Email Service** | Resend or SendGrid | Transactional + batch email delivery with templates |
| **Scheduled Jobs** | node-cron (self-hosted) or Cloud Scheduler + Cloud Functions | Daily email dispatch, survey scheduling |
| **Hosting (Backend)** | Cloud Run (via Firebase App Hosting) | Managed container hosting, auto-scaled, integrated with Firebase |

### Frontend — Web (Desktop & Mobile)

| Component | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Server-side rendering for SEO, file-based routing, excellent DX |
| **Styling** | Vanilla CSS with CSS Custom Properties | Maximum control, no build-tool dependencies, senior-friendly font scaling |
| **State Management** | React Context + SWR or TanStack Query | Simple data fetching with caching, no Redux overhead |
| **Hosting** | Firebase App Hosting | Native Next.js SSR support, global CDN, GitHub CI/CD, keeps entire stack under Firebase |

### Frontend — iOS App (Future Phase)

| Component | Technology | Rationale |
|---|---|---|
| **Framework** | React Native or Swift (TBD) | Code reuse vs. native performance — decision deferred |
| **Distribution** | Apple App Store | Standard distribution for the target demographic |

### Admin Portal

| Component | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 15 (same stack as user-facing web) | Reduces learning curve, shares auth patterns |
| **Hosting** | Firebase App Hosting (separate backend from user app) | Independent deploy cycle, same Firebase project |
| **Access Control** | Passcode-gated entry + Firebase Auth admin role | Simple for non-technical admin, fully secure |

---

## 5. Authentication & User Management

### User Registration Flow

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Landing     │────▶│  Sign Up     │────▶│  Onboarding     │────▶│  Dashboard   │
│  Page        │     │  (Email or   │     │  Survey         │     │  (Day 1)     │
│              │     │   Google)    │     │  (10-20 Qs)     │     │              │
└──────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
```

### Authentication Methods

1. **Email + Password**
   - Standard Firebase Auth email/password flow
   - Email verification required before accessing the app
   - Password reset via email

2. **Google Sign-In**
   - One-tap Google authentication via Firebase
   - Automatically creates user profile on first sign-in
   - Links to existing account if email matches

### User Profile Data (Created at Registration)

```
User {
  uid: string                    // Firebase Auth UID (primary key)
  email: string                  // From auth provider
  displayName: string            // Full name entered during sign-up
  avatarUrl: string | null       // Profile photo (uploaded or from Google)
  dateOfBirth: date | null       // Optional, for age-relevant content
  joinDate: timestamp            // When they created their account
  programStartDate: timestamp    // When they completed onboarding (Day 1 starts)
  programDay: number             // Calculated: days since programStartDate
  timezone: string               // For correct email delivery timing
  emailOptIn: boolean            // Whether they want daily emails (default: true)
  role: "user" | "admin"         // Access control (enforced via RLS policies)
  onboardingSurveyCompleted: boolean
  lastActiveDate: timestamp
  preferences: {
    fontSizeMultiplier: number   // Accessibility: 1.0 = default, 1.5 = large
    highContrast: boolean
    notificationsEnabled: boolean
  }
}
```

### Session Management

- Firebase Auth issues JWT tokens
- Backend validates tokens on every API request via Firebase Admin SDK
- Tokens refresh automatically on the client
- Logout clears all local session data

---

## 6. Database Schema

### PostgreSQL Tables

All tables live in a managed Cloud SQL for PostgreSQL instance provisioned through Firebase Data Connect. Foreign keys enforce referential integrity across the schema.

#### `users`
Primary key: `uid` (text, from Firebase Auth UID).
See User Profile Data above. This is the primary user document.

#### `tracking_days`
Daily tracking data for each user. Composite primary key: `(user_uid, date_key)`.
Foreign key: `user_uid` → `users.uid`.

```
TrackingDay {
  id: serial PRIMARY KEY
  user_uid: text REFERENCES users(uid)
  date_key: date                 // e.g., "2026-03-01"
  feelingScore: number | null    // 1-10 scale
  completedDos: [                // Array of completed Daily Do IDs
    { doId: string, completedAt: timestamp }
  ]
  completedCustomDos: [          // User-created custom tasks
    { text: string, completedAt: timestamp, category: string }
  ]
  cornerstoneProgress: {         // Which cornerstones had activity
    nutrition: number,           // Count of completed dos in this category
    movement: number,
    sleep: number,
    stress_management: number,
    social_connection: number,
    cognitive_health: number,
    healthy_aging: number
  }
  dailyDoseViewed: boolean       // Did they open the Daily Dose?
  dailyDoseViewedAt: timestamp | null
  surveyCompleted: string | null // ID of any survey completed this day
}
```

#### `survey_responses`
Individual survey submissions.
Foreign keys: `user_uid` → `users.uid`, `survey_id` → `surveys.id`.

```
SurveyResponse {
  id: serial PRIMARY KEY
  user_uid: text REFERENCES users(uid)
  survey_id: text REFERENCES surveys(survey_id)
  submitted_at: timestamp
  programDay: number             // What day of the program they were on
  answers: [
    { questionId: string, answer: string | number | string[] }
  ]
}
```

#### `daily_doses`
Daily Dose content managed by admin.

```
DailyDose {
  doseId: string                 // Auto-generated
  dayNumber: number              // Which program day (1, 2, 3, ..., or 0 = rotating post-program)
  title: string                  // Short title for admin reference
  category: string               // Which cornerstone this relates to
  message: string                // The actual dose text (inspirational quote, concept, etc.)
  educationalParagraph: string   // The explanatory paragraph shown in the pop-up banner
  bannerQuestion: string | null  // Optional question asked after the educational paragraph
  emailSubjectLine: string       // Subject for the daily email
  emailCustomMessage: string     // Admin-written personal message for the email
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
  createdBy: string              // Admin UID
}
```

#### `daily_dos`
Daily Do tasks managed by admin.

```
DailyDo {
  doId: string
  dayNumber: number              // Which program day (0 = available any day after program)
  category: string               // Cornerstone category ID
  text: string                   // The task description
  difficulty: "easy" | "medium" | "challenging"
  isDefault: boolean             // Part of the standard program vs. personalized
  targetSurveyProfile: object | null  // Conditions for personalized assignment
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### `surveys`
Survey definitions. Questions are stored as a JSONB column for flexibility.

```
Survey {
  surveyId: string
  title: string                  // e.g., "Welcome Survey", "Week 2 Check-In"
  description: string
  triggerType: "onboarding" | "daily" | "weekly" | "monthly" | "one-time"
  triggerDayNumber: number | null // Specific program day to trigger (null = recurring)
  triggerFrequencyDays: number | null // For recurring: every N days
  isDismissable: boolean         // Can the user skip/escape this survey?
  questions: [
    {
      questionId: string
      text: string               // The question
      type: "scale" | "multiple_choice" | "free_text" | "single_choice"
      options: string[] | null   // For choice-based questions
      scaleMin: number | null
      scaleMax: number | null
      scaleMinLabel: string | null  // e.g., "Not at all"
      scaleMaxLabel: string | null  // e.g., "Extremely"
      isRequired: boolean
      order: number
    }
  ]
  isActive: boolean
  createdAt: timestamp
}
```

#### `cornerstones`
Cornerstone definitions (largely static but admin-editable).

```
Cornerstone {
  cornerstoneId: string          // e.g., "nutrition"
  name: string                   // e.g., "Nutrition"
  icon: string                   // Emoji or icon reference
  description: string
  dayOfWeek: number              // 0=Sunday through 6=Saturday
  order: number                  // Display order
  isActive: boolean
}
```

#### `email_templates`
Email templates for daily sends.

```
EmailTemplate {
  templateId: string
  name: string                   // e.g., "Daily Dose Email"
  subject: string                // Can include {{variables}}
  htmlBody: string               // HTML email template with {{variables}}
  textBody: string               // Plain text fallback
  isActive: boolean
  updatedAt: timestamp
  updatedBy: string
}
```

#### `app_settings`
Global application settings (single-row table).

```
AppSettings {
  emailSendTime: string          // e.g., "08:00" — when daily emails go out
  emailSendTimezone: string      // e.g., "America/New_York"
  programLengthWeeks: number     // How many weeks is the structured program (default: 8)
  adminPasscode: string          // Hashed passcode for admin portal access
  welcomeMessage: string         // Shown on landing page
  maintenanceMode: boolean
}
```

---

## 7. Backend API

### Base URL Structure
```
Production:  https://api.feelingfine.org/v1
Development: http://localhost:3001/v1
```

### Authentication Middleware
Every request (except `/auth/signup`, `/auth/login`, and `/health`) must include:
```
Authorization: Bearer <firebase-id-token>
```

The backend verifies this token using Firebase Admin SDK, then queries the PostgreSQL `users` table to inject `req.user` with the full user profile.

### API Endpoints

#### Auth Routes (`/v1/auth/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Create new user (Firebase Auth + PostgreSQL profile) |
| POST | `/auth/login` | Exchange Firebase client token for session validation |
| POST | `/auth/google` | Handle Google Sign-In token exchange |
| POST | `/auth/reset-password` | Trigger password reset email |
| GET | `/auth/me` | Get current user profile |
| PATCH | `/auth/me` | Update user profile (name, preferences, avatar) |
| DELETE | `/auth/me` | Delete account and all associated data |

#### Content Routes (`/v1/content/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/content/daily-dose` | Get today's Daily Dose for the authenticated user (based on their program day) |
| GET | `/content/daily-dos` | Get today's Daily Dos for the authenticated user |
| GET | `/content/cornerstones` | Get all cornerstone definitions |
| GET | `/content/cornerstone/:id` | Get a specific cornerstone with its associated dos |

#### Tracking Routes (`/v1/tracking/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tracking/today` | Get today's tracking data |
| GET | `/tracking/history?days=30` | Get tracking history for N days |
| POST | `/tracking/feeling-score` | Submit today's feeling score |
| POST | `/tracking/complete-do` | Mark a Daily Do as completed |
| POST | `/tracking/uncomplete-do` | Unmark a Daily Do |
| POST | `/tracking/custom-do` | Add and complete a custom do |
| GET | `/tracking/report` | Get aggregated report data (trends, charts) |

#### Survey Routes (`/v1/surveys/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/surveys/pending` | Get any surveys the user needs to complete right now |
| GET | `/surveys/:surveyId` | Get a specific survey's questions |
| POST | `/surveys/:surveyId/submit` | Submit survey answers |
| POST | `/surveys/:surveyId/dismiss` | Dismiss a dismissable survey |
| GET | `/surveys/history` | Get user's past survey submissions |

#### AI Routes (`/v1/ai/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/wellness-chat` | Send a message to the wellness assistant |
| POST | `/ai/report-analysis` | Get AI analysis of user's tracking data |

#### Admin Routes (`/v1/admin/`) — Requires admin role

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/verify-passcode` | Verify admin passcode for portal access |
| GET | `/admin/users` | List all users with pagination |
| GET | `/admin/users/:uid` | Get detailed user info |
| GET | `/admin/doses` | List all Daily Doses |
| POST | `/admin/doses` | Create a new Daily Dose |
| PATCH | `/admin/doses/:doseId` | Update a Daily Dose |
| DELETE | `/admin/doses/:doseId` | Delete a Daily Dose |
| GET | `/admin/dos` | List all Daily Dos |
| POST | `/admin/dos` | Create a new Daily Do |
| PATCH | `/admin/dos/:doId` | Update a Daily Do |
| DELETE | `/admin/dos/:doId` | Delete a Daily Do |
| GET | `/admin/surveys` | List all survey definitions |
| POST | `/admin/surveys` | Create a new survey |
| PATCH | `/admin/surveys/:surveyId` | Update a survey |
| GET | `/admin/email-templates` | List email templates |
| PATCH | `/admin/email-templates/:id` | Update an email template |
| POST | `/admin/email/send-test` | Send a test email to the admin |
| POST | `/admin/email/send-now` | Trigger immediate email send to all users |
| GET | `/admin/settings` | Get app settings |
| PATCH | `/admin/settings` | Update app settings |
| GET | `/admin/analytics` | Dashboard stats (total users, active today, etc.) |

---

## 8. Admin Portal

### Purpose

The admin portal exists so that a **non-technical person** (the user's grandfather) can manage all Feeling Fine content without touching code, the database console, or Firebase directly. It must be **dead simple**.

### Access Control

1. **URL**: `https://admin.feelingfine.org` (separate deployment from user-facing app)
2. **First Gate**: A passcode screen. Just a single input field: "Enter Admin Passcode" with a big friendly button. The passcode is stored as a bcrypt hash in `admin/settings`. No username needed.
3. **Second Gate**: After passcode verification, the admin must sign in with their Google account (Firebase Auth). Their account must have `role: 'admin'` in the PostgreSQL `users` table.
4. **Session**: Standard Firebase Auth session. Auto-logout after 24 hours of inactivity.

### Pre-Configured Admin Accounts

The following admin account must be seeded into the database at launch:

| Email | Role | Notes |
|---|---|---|
| `clayskaggsmagic@gmail.com` | `admin` | Primary admin — full access to admin portal |

**Admin Portal Passcode:** `RAniMe8CXQJw5ayd`

> [!CAUTION]
> Store this passcode securely. It will be bcrypt-hashed before being saved to the `app_settings` table. The plaintext passcode above should be shared only with authorized admins and never committed to source code. Change it immediately if compromised.

### Admin Dashboard (Home)

A clean, simple home screen showing:

- **Total Users**: Number of registered users
- **Active Today**: Users who opened the app today
- **Current Program Day**: Which day of the scheduled program we're on
- **Quick Actions**: Big, clearly labeled buttons:
  - "Edit Today's Daily Dose"
  - "Edit Today's Daily Dos"
  - "Edit Tomorrow's Email"
  - "View All Users"
  - "Create New Survey"

### Daily Dose Manager

A scrollable list of all Daily Doses, organized by day number.

**List View:**
| Day | Title | Category | Message Preview | Status | Actions |
|-----|-------|----------|-----------------|--------|---------|
| 1 | Welcome to Feeling Fine | General | "The journey of a thousand..." | ✅ Active | Edit / Preview |
| 2 | Why Movement Matters | Movement | "Your body is designed to..." | ✅ Active | Edit / Preview |
| ... | ... | ... | ... | ... | ... |

**Edit Form (per dose):**
- Day Number (dropdown or number input)
- Title (text input)
- Cornerstone Category (dropdown: Nutrition, Movement, Sleep, etc.)
- Daily Dose Message (large textarea — this is the inspirational quote or educational message)
- Educational Paragraph (large textarea — shown in the pop-up banner)
- Banner Question (optional text input — e.g., "How old do you feel today?")
- Email Subject Line (text input)
- Email Custom Message (large textarea — personal note from grandpa in the daily email)
- Active/Inactive toggle
- **Preview button** that shows exactly what the user will see (dose card + banner + email)
- **Save button** (big, prominent, with confirmation toast)

### Daily Do Manager

Similar list view, organized by day number and category.

**Edit Form (per do):**
- Day Number (0 = available anytime after program)
- Cornerstone Category (dropdown)
- Task Text (text input — e.g., "Take a brisk 10-minute walk")
- Difficulty (Easy / Medium / Challenging)
- Active/Inactive toggle
- **Bulk import**: Ability to paste a list of tasks (one per line) and assign them all to a day/category

### Survey Manager

- List of all surveys with trigger type and status
- Create/edit survey with drag-and-drop question reordering
- Question builder with type selection (scale, multiple choice, free text, single choice)
- Preview mode to see what the user will see

### Email Manager

- View/edit the email template (HTML + plain text)
- Preview with sample data
- "Send Test Email" button (sends to admin's email)
- "Send Now" button (triggers immediate send to all users — with confirmation dialog)
- View email send history and delivery stats

### User Manager

- Searchable, paginated list of all users
- Click to view: profile details, program day, survey responses, tracking history
- Ability to reset a user's program day
- Ability to deactivate a user's account
- **Export**: Download all user data as CSV

### Design Guidelines for Admin Portal

- **Large fonts** (16px minimum body, 20px+ for headers)
- **Clear labels** on every form field with helper text
- **Big save buttons** with success/error feedback
- **Confirmation dialogs** for destructive actions (delete, send email to all)
- **Auto-save drafts** so nothing is lost if the browser closes
- **No jargon** — say "Daily Dose Message" not "dose.message field"
- **Breadcrumbs** for navigation so the admin always knows where they are

---

## 9. Daily Email System

### Overview

Every day, at a configured time (default: 8:00 AM Eastern), the server sends a personalized email to every active user. The email contains:

1. A **personal greeting** ("Good morning, Margaret!")
2. The **Daily Dose** message for their specific program day
3. A **personal message from the admin** (written via admin portal per-dose)
4. A **call-to-action button** linking to the app ("Open Your Daily Dose →")
5. An **unsubscribe link** (sets `emailOptIn: false` on their profile)

### How It Works

```
┌───────────────────┐
│  Scheduled Job    │  Runs daily at configured time
│  (node-cron or    │
│   Cloud Scheduler)│
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Email Service    │  1. Query all users where emailOptIn = true
│                   │  2. For each user, determine their programDay
│                   │  3. Fetch the DailyDose for that programDay
│                   │  4. Render the email template with user + dose data
│                   │  5. Send via Resend/SendGrid API
│                   │  6. Log the send in admin/emailLogs
└───────────────────┘
```

### Email Template Variables

```
{{userName}}           → "Margaret"
{{programDay}}         → 5
{{doseTitle}}          → "The Power of Connection"
{{doseMessage}}        → "Humans are social creatures..."
{{adminMessage}}       → "Hi everyone! This week we're focusing on..."
{{appUrl}}             → "https://app.feelingfine.org"
{{unsubscribeUrl}}     → "https://api.feelingfine.org/v1/email/unsubscribe?token=..."
```

### Email Personalization Logic

- Users on **Day 1–7** (Week 1): Get the fixed, scheduled dose for that day
- Users on **Day 8–56** (Weeks 2–8): Get doses customized based on survey responses
- Users on **Day 57+** (Post-program): Get rotating general wellness doses
- The admin can override any day's dose at any time via the admin portal

### Rate Limiting & Deliverability

- Batch sends in groups of 100 with 1-second delays to avoid rate limits
- Use proper DKIM/SPF/DMARC records for the sending domain
- Include both HTML and plain text versions
- Test email rendering on major clients (Gmail, Apple Mail, Outlook)

### Unsubscribe Handling

- One-click unsubscribe link in every email (required by CAN-SPAM)
- Updates `emailOptIn: false` in the user's profile
- User can re-enable emails from their account settings in the app

---

## 10. The Program: Doses, Dos & Scheduling

### Program Structure

The Feeling Fine program is a **structured, multi-phase wellness journey**:

```
PHASE 1: ONBOARDING (Day 0)
├── Account creation
├── Onboarding Survey (10-20 questions)
└── Welcome message

PHASE 2: STRUCTURED WEEK (Days 1-7)
├── Same Daily Dose for ALL users
├── Same Daily Dos for ALL users
├── Daily pop-up banner with educational paragraph + question
├── Each day focuses on a different Cornerstone:
│   ├── Day 1 (Mon): Nutrition
│   ├── Day 2 (Tue): Movement
│   ├── Day 3 (Wed): Sleep
│   ├── Day 4 (Thu): Stress Management
│   ├── Day 5 (Fri): Social Connection
│   ├── Day 6 (Sat): Brain Health
│   └── Day 7 (Sun): Healthy Aging
└── Daily email with dose + admin message

PHASE 3: PERSONALIZATION BEGINS (Days 8-14)
├── Daily Doses begin customizing based on onboarding survey
├── Daily Dos begin customizing based on tracking patterns
├── Weekly survey (5-10 questions)
└── Pop-up banners become weekly instead of daily

PHASE 4: WEEKLY SURVEYS (Days 15-56, Weeks 3-8)
├── Fully personalized Daily Doses and Dos
├── Weekly survey
├── Pop-up banner with weekly survey
└── AI wellness assistant now has enough data to give meaningful advice

PHASE 5: MONTHLY MAINTENANCE (Day 57+)
├── Personalized Daily Doses continue
├── Monthly survey
├── Rotating content from admin
└── Community features become more prominent
```

### Daily Dose — Detailed Behavior

The Daily Dose is the **hero feature** of the app. It should be front and center.

**Home Screen Experience:**
1. When the user opens the app, the **first thing they see** (after the greeting) is a large, prominent "Daily Dose" card
2. The card shows the date and a simple label: **"Today's Daily Dose"**
3. The user taps/clicks the card to **reveal** the dose
4. The dose appears with a smooth animation — the inspirational message in elegant serif typography
5. Below the dose: the day's **Daily Dos** (tasks)

**Pop-Up Banner Experience (Phase 2 — First Week):**
1. Each day during the first week, when the user opens the app, a **full-screen modal banner** appears before they see the dashboard
2. The banner contains:
   - A warm greeting
   - An **educational paragraph** (1-2 paragraphs explaining a concept — e.g., "Did you know that the age you *feel* often matters more than the age on your birth certificate? Research shows that people who feel younger than their chronological age tend to live longer, healthier lives.")
   - A **question** related to the concept (e.g., "How old do you feel today?")
   - An input for their answer (scale, free text, or multiple choice depending on the question)
   - A **"Continue to My Dose" button**
   - An **escape/close button** (X in top-right corner) — always visible, always works
3. After the first week, banners appear **weekly** (with the weekly survey)
4. After 2 months, banners appear **monthly**

**Data Model Reminder:**
- Doses are stored in the `daily_doses` table with a `day_number` column
- For days 1-7, there is exactly one dose per day
- For days 8+, the backend selects a dose based on the user's survey responses and cornerstone needs
- The admin can create doses for specific days or create "floating" doses (`dayNumber: 0`) that are assigned dynamically

### Daily Dos — Detailed Behavior

Daily Dos are the **actionable tasks** associated with each day's Cornerstone focus.

**Key Terminology Change from Demo:**
- The demo calls them "Small Acts" — **rename to "Daily Dos"**
- The demo has static lists per Cornerstone — **move to PostgreSQL `daily_dos` table, admin-managed**

**How Daily Dos Work:**

1. Each day has a **focused Cornerstone** (matches the day of the week mapping)
2. The focused Cornerstone shows **3-5 Daily Dos** prominently
3. Other Cornerstones are accessible but collapsed (tap to expand)
4. Users check off Dos as they complete them
5. Users can add **custom Dos** (free text, assigned to a category)
6. Completed Dos are tracked in the `tracking_days` table (with a JSONB `completed_dos` column or a separate `completed_dos` junction table)

**For the First Week (Days 1-7):**
- All users get the **exact same set of Dos** for each day
- These are pre-programmed by the admin in the `daily_dos` table
- Example Day 1 (Nutrition): "Drink a glass of water upon waking", "Eat a piece of whole fruit", "Cook one meal at home today"

**After the First Week:**
- Dos become **personalized** based on:
  1. Onboarding survey responses (e.g., if they said they struggle with sleep, more sleep Dos appear)
  2. Tracking history (e.g., if they consistently skip Movement, add more gentle movement Dos)
  3. Admin-configured targeting rules in `daily_dos.target_survey_profile` (JSONB column)

---

## 11. Survey Engine

### Overview

Surveys are a critical data-collection mechanism. They serve two purposes:
1. **Personalization** — Understanding the user's needs, challenges, and progress to customize their Daily Doses and Dos
2. **Engagement** — Keeping users reflective and connected to the program

### Survey Types

#### 1. Onboarding Survey (Trigger: Account Creation)

- **When**: Immediately after account creation, before the user sees the dashboard
- **Length**: 10-20 questions
- **Dismissable**: NO — must be completed to proceed
- **Purpose**: Establish baseline understanding of the user's health, lifestyle, and goals

**Sample Questions:**

| # | Question | Type | Options |
|---|----------|------|---------|
| 1 | What is your date of birth? | date_picker | — |
| 2 | How would you rate your overall health? | scale | 1 (Poor) to 10 (Excellent) |
| 3 | How many days per week do you exercise? | single_choice | 0, 1-2, 3-4, 5+ |
| 4 | On average, how many hours of sleep do you get per night? | single_choice | Less than 5, 5-6, 7-8, More than 8 |
| 5 | How often do you feel stressed? | scale | 1 (Never) to 10 (Constantly) |
| 6 | How often do you socialize with friends or family? | single_choice | Daily, Several times a week, Weekly, Monthly, Rarely |
| 7 | Do you have any dietary restrictions? | multiple_choice | Vegetarian, Vegan, Gluten-free, Dairy-free, Low-sodium, None |
| 8 | What is your primary health goal? | single_choice | More energy, Better sleep, Weight management, Stress reduction, Sharper mind, Social connection, General wellness |
| 9 | How would you describe your mobility? | single_choice | Very active, Somewhat active, Limited mobility, Wheelchair/walker |
| 10 | Do you take any daily medications? | single_choice | None, 1-3, 4-6, 7+ |
| 11 | How old do you FEEL right now? (Your "subjective age" — whatever number pops into your head) | free_text | — |
| 12 | What is the biggest barrier to your wellness? | free_text | — |
| 13 | Do you live alone or with others? | single_choice | Alone, With spouse/partner, With family, In a care facility |
| 14 | How comfortable are you with technology? | scale | 1 (Not at all) to 10 (Very comfortable) |
| 15 | What time do you usually wake up? | single_choice | Before 6 AM, 6-7 AM, 7-8 AM, 8-9 AM, After 9 AM |
| 16 | How would you describe your current diet? | single_choice | Very healthy, Mostly healthy, Mixed, Mostly processed/fast food, Poor |
| 17 | Which best describes your attitude about aging? | single_choice | (see Aging Attitude options below) |
| 18 | What activities bring you the most joy? | multiple_choice | Reading, Gardening, Walking, Cooking, Puzzles/Games, Socializing, Music, Art, Travel, Other |

**Question 17 — Aging Attitude Options (shown as cards, one at a time):**

| Option | Text |
|--------|------|
| A — Very Optimistic | "I am extremely optimistic about aging. I'd love to live to be 100, and I hope to be in surprisingly good health when I reach that age." |
| B — Optimistic | "I look forward to my older years as long as I stay in good health. I don't expect to be as productive as I am now, but I'm pleased that I'll have more time to relax and be with family and friends." |
| C — Ambivalent | "I'm ambivalent. I look forward to grandchildren and time to travel and learn. But I'm also concerned about losing friends, being alone, and the likelihood of illness." |
| D — Somewhat Pessimistic | "I'm not excited about getting older, but I guess it beats the alternative. My mind fills up with negative thoughts, but then I remember my grandmother was active until 98." |
| E — Very Pessimistic | "I'm really dreading getting old. I worry about wrinkles, dementia, falling, loneliness, and not being useful to anyone." |

> [!NOTE]
> The Aging Attitude and Subjective Age questions come from behavioral research showing that mindset about aging has a measurable effect on both lifespan and healthspan. These responses are key inputs for personalization labels.

### User Labels (Personalization Engine)

Based on onboarding survey responses, each user is assigned **5-10 labels** from a predefined set. These labels drive which Daily Doses and Dos are shown after Week 1. Labels are stored as a JSONB array on the user's profile and updated as new survey data comes in.

**Initial Label Categories:**

| Label | Derived From | Example Trigger |
|---|---|---|
| `needs-movement` | Q3 (exercise frequency) | Exercises 0 or 1-2 days/week |
| `needs-sleep` | Q4 (sleep hours) | Gets less than 6 hours |
| `high-stress` | Q5 (stress level) | Stress score ≥ 7 |
| `socially-isolated` | Q6 (socialization) | Socializes monthly or rarely |
| `poor-diet` | Q16 (diet quality) | Mostly processed/fast food or poor |
| `weight-loss-goal` | Q8 (primary goal) | Selected "Weight management" |
| `aging-pessimist` | Q17 (aging attitude) | Selected D or E |
| `aging-optimist` | Q17 (aging attitude) | Selected A or B |
| `low-mobility` | Q9 (mobility) | Limited mobility or wheelchair/walker |
| `large-age-gap` | Q11 + Q1 (subjective vs actual age) | Feels 10+ years older than actual age |

**How Labels Drive Personalization:**

- Each Daily Dose and Daily Do in the database can have a `target_labels` field (JSONB array)
- When the backend selects content for a user post-Week 1, it prioritizes items whose `target_labels` overlap with the user's labels
- Example: A user labeled `poor-diet` + `weight-loss-goal` receives the nutrition-focused dose: *"Find one healthy substitute for one unhealthy food you eat. Just one. Any one. Start with plant foods, fresh foods, foods with no added sugar."*
- Labels are updated after each weekly/monthly survey as the user progresses

#### 2. Daily Check-In Banner (Trigger: Daily, First Week Only)

- **When**: Each day during Days 1-7, as a pop-up banner when the app opens
- **Length**: 1 question (tied to the educational paragraph)
- **Dismissable**: YES — escape button always visible
- **Purpose**: Engagement + data collection in the context of learning

**Example Day-by-Day Banners:**

| Day | Educational Topic | Banner Question |
|-----|-------------------|-----------------|
| 1 | Physical Age vs. Felt Age | "How old do you feel today?" (free text) |
| 2 | The 10-Minute Rule of Movement | "Did you move for at least 10 minutes yesterday?" (yes/no) |
| 3 | Sleep Architecture & Aging | "How did you sleep last night?" (1-10 scale) |
| 4 | The Physiology of Stress | "What is your stress level right now?" (1-10 scale) |
| 5 | Loneliness as a Health Risk | "When did you last have a meaningful conversation?" (choice) |
| 6 | Neuroplasticity Never Stops | "Did you learn something new this week?" (yes/no) |
| 7 | The Blue Zones of Longevity | "What made you smile today?" (free text) |

#### 3. Weekly Survey (Trigger: Every 7 days, Weeks 2-8)

- **When**: Every 7 days after the first week, shown as a pop-up banner
- **Length**: 5-10 questions
- **Dismissable**: YES
- **Purpose**: Track progress, refine personalization

#### 4. Monthly Survey (Trigger: Every 30 days, after Week 8)

- **When**: Monthly, shown as a pop-up banner
- **Length**: 10-15 questions (similar to onboarding but tracking changes)
- **Dismissable**: YES
- **Purpose**: Long-term trend tracking, continued personalization

### Survey Display Rules

1. **Only one survey at a time.** If multiple surveys are pending, show the most important one (onboarding > daily > weekly > monthly).
2. **Always show escape button.** Every survey (except onboarding) has a clearly visible X button in the top-right corner.
3. **Progress indicator.** Show "Question 3 of 10" so users know how much is left.
4. **Large touch targets.** Radio buttons and checkboxes must be at least 48px.
5. **One question per screen on mobile.** On desktop, can show 3-4 questions at a time.
6. **Remember partial progress.** If a user dismisses a survey and comes back later, their previous answers should be preserved.

---

## 12. Frontend — Shared Design System

### Design Tokens (Shared Across ALL Frontends)

All frontends (web desktop, web mobile, iOS) share a single design token file that defines the visual language.

```css
/* design-tokens.css */

:root {
  /* ─── Color Palette ─── */
  --ff-color-bg-primary: #fdfbf7;        /* Warm off-white */
  --ff-color-bg-secondary: #ffffff;       /* Pure white */
  --ff-color-bg-tertiary: #f0faf9;       /* Teal-tinted light */

  --ff-color-text-primary: #2d3748;       /* Dark slate */
  --ff-color-text-secondary: #718096;     /* Muted gray */
  --ff-color-text-inverse: #ffffff;       /* White text on dark bg */

  --ff-color-brand-primary: #2c7a7b;      /* Deep teal */
  --ff-color-brand-secondary: #38b2ac;    /* Soft teal */
  --ff-color-brand-gradient: linear-gradient(135deg, #2c7a7b, #38b2ac);

  --ff-color-accent-warm: #ed8936;        /* Warm coral/orange */
  --ff-color-accent-gold: #ecc94b;        /* Muted gold */
  --ff-color-accent-light: rgba(237, 137, 54, 0.1);

  --ff-color-success: #48bb78;            /* Green */
  --ff-color-error: #f56565;              /* Red */
  --ff-color-warning: #ecc94b;            /* Gold/yellow */

  /* ─── Typography ─── */
  --ff-font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --ff-font-serif: 'Merriweather', Georgia, serif;

  /* Base sizes — LARGE for older users */
  --ff-font-size-xs: 14px;
  --ff-font-size-sm: 16px;
  --ff-font-size-base: 18px;             /* Body text minimum */
  --ff-font-size-lg: 22px;
  --ff-font-size-xl: 28px;
  --ff-font-size-2xl: 36px;
  --ff-font-size-3xl: 48px;

  --ff-font-weight-normal: 400;
  --ff-font-weight-medium: 500;
  --ff-font-weight-semibold: 600;
  --ff-font-weight-bold: 700;

  --ff-line-height-tight: 1.2;
  --ff-line-height-normal: 1.6;
  --ff-line-height-relaxed: 1.8;

  /* ─── Spacing ─── */
  --ff-space-xs: 0.5rem;    /* 8px */
  --ff-space-sm: 1rem;      /* 16px */
  --ff-space-md: 1.5rem;    /* 24px */
  --ff-space-lg: 2rem;      /* 32px */
  --ff-space-xl: 3rem;      /* 48px */
  --ff-space-2xl: 4rem;     /* 64px */

  /* ─── Border Radius ─── */
  --ff-radius-sm: 8px;
  --ff-radius-md: 12px;
  --ff-radius-lg: 20px;
  --ff-radius-full: 9999px;

  /* ─── Shadows ─── */
  --ff-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --ff-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --ff-shadow-lg: 0 8px 32px rgba(31, 38, 135, 0.07);

  /* ─── Glassmorphism ─── */
  --ff-glass-bg: rgba(255, 255, 255, 0.75);
  --ff-glass-border: rgba(255, 255, 255, 0.5);
  --ff-glass-blur: 8px;

  /* ─── Touch Targets ─── */
  --ff-touch-min: 48px;                   /* WCAG AA minimum for older users */

  /* ─── Transitions ─── */
  --ff-transition-fast: 150ms ease;
  --ff-transition-normal: 250ms ease;
  --ff-transition-slow: 400ms ease;
}
```

### Typography Rules

1. **Body text**: Never below `18px`. Default is `18px` on desktop, `18px` on mobile.
2. **Headers**: Use `--ff-font-size-xl` (28px) for section titles, `--ff-font-size-2xl` (36px) for page titles.
3. **Cornerstone names**: Use `--ff-font-size-xl` (28px) — they should be BIG and readable.
4. **Daily Dose text**: Use `--ff-font-serif` (Merriweather) at `--ff-font-size-lg` (22px) for the inspirational message.
5. **Buttons**: Minimum `16px` font size, `--ff-font-weight-semibold`.
6. **Accessibility multiplier**: Users can set `fontSizeMultiplier` in their profile (1.0x, 1.25x, 1.5x) which scales all font sizes.

### Component Patterns

All frontends should implement these common component patterns:

1. **Card** — Glassmorphic container with subtle blur and border
2. **Button (Primary)** — Gradient fill, large padding, subtle shadow, micro-hover animation
3. **Button (Secondary)** — Outlined, teal border, white fill
4. **Input Field** — Large (48px height minimum), clear labels above, rounded corners
5. **Modal/Banner** — Full-screen overlay with centered content, clear close button
6. **Progress Bar** — For surveys, horizontal with step indicators
7. **Feeling Score Selector** — Large numbered circles (1-10) or slider
8. **Cornerstone Card** — Expandable accordion with icon, name, and status badge
9. **Bottom Navigation** — Mobile only, 3-4 items max, always visible
10. **Dropdown Menu** — For secondary navigation items (Community, Report)

---

## 13. Frontend — Web Desktop

### Navigation Structure

```
┌──────────────────────────────────────────────────────────┐
│  FEELING FINE                          ☰ Menu  │ 👤 Profile │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Good morning, Margaret                                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                    │   │
│  │          TODAY'S DAILY DOSE                        │   │
│  │          (Tap to reveal)                           │   │
│  │                                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  How "Fine" are you feeling today?                       │
│  ① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩                                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  🧘 TODAY'S CORNERSTONE: Stress Management       │   │
│  │     TODAY'S FOCUS                                 │   │
│  │  ☐ Take 5 deep, slow breaths                     │   │
│  │  ☐ Spend 10 minutes in nature                    │   │
│  │  ☐ Write down 3 things you are grateful for      │   │
│  │  + Add your own...                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [Show Other Cornerstones ▼]                             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### ☰ Hamburger Menu (Top Right) — Contains:

- **My Wellness** (home/dashboard — default view)
- **Community** (friends, challenges, podcasts, webinars)
- **My Report** (charts, trends, wellness assistant)
- **Settings** (profile, font size, notifications, email preferences)
- **Log Out**

### Key Desktop Behaviors

- Max content width: `800px`, centered
- Generous whitespace and padding
- Cards have hover states with subtle lift animations
- Cornerstones expand inline (no page transition)
- Wellness Assistant chat appears as a panel within the Report page

---

## 14. Frontend — Web Mobile

### Navigation Structure

Bottom tab bar with **2 primary items** (keeping it simple):

```
┌─────────────────────┐
│  FEELING FINE        │
│  Good morning, Marge │
│                      │
│  [Daily Dose Card]   │
│  [Feeling Score]     │
│  [Today's Corner-    │
│   stone]             │
│  [Other Cornerstones]│
│                      │
├──────────────────────┤
│  🏠 My Wellness │ ☰ More │
└──────────────────────┘
```

**"More" tab opens a slide-up sheet with:**
- Community
- My Report
- Settings
- Log Out

### Key Mobile Behaviors

- Full-width cards, no side margins beyond `16px`
- Bottom nav fixed, always visible
- Surveys show **one question per screen** with large "Next" button
- Cornerstone cards are full-width accordions
- Daily Dose card takes up ~40% of the viewport height
- Touch targets: minimum `48px` height on all tappable elements
- No hover effects (touch-only affordances)
- Swipe gestures for navigating between cornerstone dos (pages of 4)

---

## 15. Frontend — iOS App (Future Phase)

### Separation Strategy

The iOS app will be a **completely separate codebase** from the web apps:

- **Shared**: API endpoints, design tokens (colors, spacing values translated to SwiftUI/React Native), authentication flow (Firebase Auth SDK for iOS)
- **Not shared**: UI components, navigation patterns, gesture handling — all native

### Recommended Approach

- **Option A: React Native** — faster to ship, shares more JS logic with web
- **Option B: Swift/SwiftUI** — better native feel, better for accessibility, App Store preferred

**Decision deferred** until web apps are stable and validated. The backend API is designed to support any frontend.

### iOS-Specific Considerations

- Push notifications via APNs (replace daily email for iOS users who prefer it)
- Widget support for Daily Dose on home screen
- Health app integration (import step counts, sleep data)
- Haptic feedback on task completion
- Dynamic Type support (respects iOS system font size settings)

---

## 16. Core Feature Specifications

### 16.1 The 7 Cornerstones of Health

Retained from the demo, these are the pillars of the program:

| # | Cornerstone | Icon | Day of Week | Description |
|---|-------------|------|-------------|-------------|
| 1 | Nutrition | 🍎 | Monday | Nourish your body with healthy choices |
| 2 | Movement | 🏃 | Tuesday | Keep your body active and strong |
| 3 | Sleep | 😴 | Wednesday | Rest and recharge for the day ahead |
| 4 | Stress Management | 🧘 | Thursday | Find your inner calm |
| 5 | Social Connection | 🤝 | Friday | Connect with the people who matter |
| 6 | Brain Health | 🧠 | Saturday | Keep your mind sharp and curious |
| 7 | Healthy Aging | 🌿 | Sunday | Embrace the journey of life |

**Display rules:**
- Today's cornerstone is always shown **first and expanded by default**
- It has a prominent "TODAY'S FOCUS" badge
- The cornerstone name should be displayed in **28px bold** text
- Other cornerstones are collapsed behind a "Show Other Cornerstones" button

### 16.2 Feeling Score ("How Fine Are You Feeling Today?")

- Scale: 1-10
- Desktop: Large numbered circles
- Mobile: Slider with "Not Fine" / "Super Fine" labels
- Stored in daily tracking data
- Used by AI wellness assistant for trend analysis
- Shown on the home screen below the Daily Dose card

### 16.3 Community Features

**Moved to hamburger/dropdown menu** (not a primary nav item). Features:

- **Weekly Challenge**: Admin-set group challenge (e.g., "Drink more water this week")
- **Friends List**: Real users who have connected (friend request system)
- **Chat**: In-app messaging between friends (backed by PostgreSQL with polling or a lightweight WebSocket layer)
- **Podcasts**: Audio content on wellness topics (stored in Firebase Storage)
- **Webinars**: Links to scheduled live events with registration

### 16.4 Report / My Progress

**Moved to hamburger/dropdown menu.** Features:

- **30-Day Bar Chart**: Shows daily completed Dos, filterable by cornerstone
- **Trend Indicator**: Up/down arrow comparing last 7 days vs previous 7 days
- **Feeling Score Trend**: Line graph of daily feeling scores
- **Wellness Assistant**: AI chatbot powered by Gemini, analyzing the user's data to provide personalized advice
  - The assistant should feel human and warm, NOT robotic
  - No "I'm an AI" language — frame as a "wellness guide"
  - Uses the user's tracking data, survey responses, and feeling scores as context

### 16.5 Account Settings

Accessible from the hamburger menu. Includes:

- **Profile**: Edit name, avatar, email
- **Accessibility**: Font size multiplier (1.0x, 1.25x, 1.5x), high contrast toggle
- **Notifications**: Enable/disable daily emails, push notifications (iOS)
- **Privacy**: Download my data, delete my account
- **About**: App version, terms of service, privacy policy

---

## 17. Security Requirements

### Authentication & Authorization

- Firebase Auth handles all credential storage (never store passwords in our DB)
- Backend validates Firebase ID tokens on every request
- Admin routes check `role = 'admin'` in the PostgreSQL `users` table before processing
- Admin passcode stored as bcrypt hash, never in plaintext
- Rate limiting on auth endpoints (5 attempts per minute per IP)

### Data Protection

- All traffic over HTTPS (TLS 1.3)
- PostgreSQL Row-Level Security (RLS) policies restrict row access to the owning user as a defense-in-depth layer
- API keys (Gemini, SendGrid/Resend) stored as environment variables on the server — never in client code
- User data encrypted at rest by Cloud SQL default encryption
- PII minimization: don't collect data we don't need

### HIPAA Considerations

> [!WARNING]
> This app is **NOT** a medical device and should not be marketed as one. It provides wellness suggestions, not medical advice. However, since it collects health-related data from elderly users, follow privacy best practices:

- Clear privacy policy explaining what data is collected and why
- Data deletion capability (GDPR/CCPA compliance)
- No sharing of user health data with third parties
- Audit log for admin actions

### Input Validation

- All API inputs validated and sanitized on the backend
- SQL injection prevention via parameterized queries (never concatenate user input into SQL strings) + XSS protection on all rendered content
- File upload validation (type, size limits) if avatar upload is implemented
- Content Security Policy headers on all frontend responses

---

## 18. Deployment & Infrastructure

### Backend (API Server)

| Component | Service | URL |
|-----------|---------|-----|
| API Server | Cloud Run (via Firebase App Hosting) | `api.feelingfine.org` |
| Database | PostgreSQL (Cloud SQL via Firebase Data Connect) | Firebase Console / Cloud Console |
| Auth | Firebase Authentication | Firebase Console |
| Storage | Firebase Storage | Firebase Console |
| Email | Resend or SendGrid | Via API from backend |

> [!TIP]
> By using Firebase App Hosting for everything, the entire stack lives under one Firebase project — Auth, Database, Storage, Hosting, and backend. One dashboard, one billing account, one CLI.

**Environment Variables (Backend):**
```
PORT=3001
NODE_ENV=production
FIREBASE_PROJECT_ID=feeling-fine-prod
FIREBASE_SERVICE_ACCOUNT_KEY=<base64-encoded-json>
GEMINI_API_KEY=<key>
EMAIL_API_KEY=<resend-or-sendgrid-key>
EMAIL_FROM=hello@feelingfine.org
ADMIN_PASSCODE_HASH=<bcrypt-hash>
CORS_ALLOWED_ORIGINS=https://app.feelingfine.org,https://admin.feelingfine.org
```

### Frontend — User-Facing Web App

| Component | Service | URL |
|-----------|---------|-----|
| Web App | Firebase App Hosting | `app.feelingfine.org` |

**Environment Variables (Frontend — set via `apphosting.yaml`):**
```
NEXT_PUBLIC_API_URL=https://api.feelingfine.org/v1
NEXT_PUBLIC_FIREBASE_API_KEY=<public-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=feeling-fine-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=feeling-fine-prod
```

### Frontend — Admin Portal

| Component | Service | URL |
|-----------|---------|-----|
| Admin App | Firebase App Hosting (separate backend) | `admin.feelingfine.org` |

> [!NOTE]
> Firebase Data Connect manages the Cloud SQL instance and provides auto-generated SDKs. The backend connects to PostgreSQL via the standard `pg` Node.js driver or through the Data Connect generated SDK.

### DNS & Domains (GoDaddy → Firebase)

The domain `feelingfine.org` is registered on **GoDaddy**. Firebase App Hosting requires custom domain DNS records to be configured in GoDaddy's DNS management panel.

**Subdomains:**

| Subdomain | Purpose |
|---|---|
| `feelingfine.org` | Landing/marketing page |
| `app.feelingfine.org` | User-facing web app |
| `admin.feelingfine.org` | Admin portal |
| `api.feelingfine.org` | Backend API |

**GoDaddy DNS Setup Steps:**

1. In Firebase Console → App Hosting → Custom Domains, add each subdomain above
2. Firebase will provide DNS records (typically `A` and/or `CNAME` records, plus a `TXT` record for domain verification)
3. In GoDaddy → DNS Management for `feelingfine.org`, add the records Firebase provides:
   - `TXT` record for domain ownership verification
   - `A` or `CNAME` records pointing each subdomain to Firebase
4. Wait for DNS propagation (can take up to 48 hours, typically ~1 hour)
5. Firebase will auto-provision SSL certificates once DNS is verified

> [!IMPORTANT]
> Do NOT transfer the domain away from GoDaddy — just point the DNS records to Firebase. This keeps domain management in GoDaddy and hosting in Firebase.

### CI/CD

- GitHub repository with separate directories: `/backend`, `/frontend-web`, `/frontend-admin`
- Each has its own Firebase App Hosting backend linked to its directory
- All auto-deploy via GitHub integration on push to `main`
- Firebase App Hosting provides automatic rollout preview URLs on pull requests
- Single `firebase.json` configures all backends and hosting targets

---

## 19. Migration from Current Demo

### What to Keep

| Feature | Current Implementation | New Implementation |
|---------|----------------------|-------------------|
| Color palette | CSS variables in `index.css` | Mapped to `--ff-*` design tokens |
| 7 Cornerstones | Static array in `models.js` | PostgreSQL `cornerstones` table |
| Small Acts (→ Daily Dos) | Static arrays in `models.js` | PostgreSQL `daily_dos` table |
| Daily Doses | Static array of 10 quotes in `models.js` | PostgreSQL `daily_doses` table |
| Day-of-week focus mapping | `DAY_FOCUS_MAPPING` object | Same logic, but on the backend |
| Feeling Score (1-10) | `FeelingFineInput` component | Rebuilt with larger touch targets |
| Bar chart in report | Manual div-based bars | Same approach or use a lightweight chart library |
| Mobile responsiveness | `useIsMobile` hook + responsive CSS | Separate mobile-optimized codebase |

### What to Discard

| Feature | Reason |
|---------|--------|
| localStorage for all data | Replaced by PostgreSQL via API |
| Fake friends (Sarah, Mike, Emma) | Replaced by real user connections |
| Mock Gemini service | Replaced by real Gemini API on backend |
| Consent form / Welcome screen | Replaced by proper sign-up flow |
| `IntakeQuestionnaire.jsx` (4 fields) | Replaced by 15-question onboarding survey |
| Demo day-switcher arrows | Users see only today's content (admin can preview other days) |

### Content Seeding

When the new app launches, the admin portal should be pre-seeded with:

1. **7 Cornerstones** (from current `CORNERSTONE_CATEGORIES`)
2. **140 Daily Dos** (from current `SMALL_ACTS` — 20 per cornerstone)
3. **7 Daily Doses** for Week 1 (to be written by the admin/grandpa)
4. **Onboarding Survey** (15 questions as specified in Section 11)
5. **7 Daily Check-In Banners** for Week 1
6. **Email template** (default HTML template ready to customize)

---

## 20. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Daily Dose** | The inspirational message, educational concept, or quote delivered to users each day |
| **Daily Do** | A small, actionable wellness task associated with a Cornerstone (formerly "Small Act") |
| **Cornerstone** | One of the 7 wellness categories (Nutrition, Movement, Sleep, etc.) |
| **Program Day** | The number of days since a user completed onboarding (Day 1 = first day) |
| **Banner** | A full-screen pop-up that appears when the app opens, containing educational content and/or a survey question |
| **Feeling Score** | A 1-10 self-reported daily wellness rating |
| **Small Act** | DEPRECATED term — now called "Daily Do" |

### Appendix B: File Structure (New Project)

```
feeling-fine/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Express app entry point
│   │   ├── middleware/
│   │   │   ├── auth.js              # Firebase token verification
│   │   │   ├── adminAuth.js         # Admin role check
│   │   │   ├── rateLimiter.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── content.js
│   │   │   ├── tracking.js
│   │   │   ├── surveys.js
│   │   │   ├── ai.js
│   │   │   ├── admin.js
│   │   │   └── email.js
│   │   ├── services/
│   │   │   ├── firebase.js          # Firebase Admin SDK init
│   │   │   ├── geminiService.js     # Gemini API wrapper
│   │   │   ├── emailService.js      # Resend/SendGrid wrapper
│   │   │   ├── programService.js    # Dose/Do selection logic
│   │   │   └── surveyService.js     # Survey triggering logic
│   │   ├── jobs/
│   │   │   └── dailyEmailJob.js     # Cron job for daily emails
│   │   └── utils/
│   │       ├── validators.js
│   │       └── helpers.js
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
├── frontend-web/
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── layout.js
│   │   │   ├── page.js              # Landing page
│   │   │   ├── login/page.js
│   │   │   ├── signup/page.js
│   │   │   ├── onboarding/page.js
│   │   │   ├── dashboard/page.js    # Main app (authenticated)
│   │   │   ├── community/page.js
│   │   │   ├── report/page.js
│   │   │   └── settings/page.js
│   │   ├── components/
│   │   │   ├── ui/                  # Shared UI components
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   └── ProgressBar.jsx
│   │   │   ├── DailyDoseCard.jsx
│   │   │   ├── CornerstoneTracker.jsx
│   │   │   ├── FeelingScoreInput.jsx
│   │   │   ├── SurveyModal.jsx
│   │   │   ├── BannerPopup.jsx
│   │   │   ├── WellnessChat.jsx
│   │   │   └── NavMenu.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useApi.js
│   │   │   └── useMediaQuery.js
│   │   ├── services/
│   │   │   └── api.js               # API client (fetch wrapper)
│   │   └── styles/
│   │       ├── design-tokens.css    # Shared design tokens
│   │       ├── globals.css
│   │       └── components/          # Component-specific CSS
│   ├── package.json
│   └── next.config.js
│
├── frontend-admin/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js
│   │   │   ├── page.js              # Passcode entry
│   │   │   ├── dashboard/page.js    # Admin home
│   │   │   ├── doses/page.js        # Daily Dose manager
│   │   │   ├── dos/page.js          # Daily Do manager
│   │   │   ├── surveys/page.js      # Survey manager
│   │   │   ├── emails/page.js       # Email template manager
│   │   │   ├── users/page.js        # User list
│   │   │   └── settings/page.js     # App settings
│   │   ├── components/
│   │   │   ├── AdminNav.jsx
│   │   │   ├── DoseEditor.jsx
│   │   │   ├── DoEditor.jsx
│   │   │   ├── SurveyBuilder.jsx
│   │   │   ├── EmailPreview.jsx
│   │   │   └── UserDetail.jsx
│   │   └── styles/
│   │       ├── design-tokens.css    # Same tokens as user app
│   │       └── admin.css
│   ├── package.json
│   └── next.config.js
│
├── shared/
│   └── design-tokens.css            # Single source of truth
│
├── firebase.json                     # Firebase config, storage rules
├── dataconnect/                      # Firebase Data Connect schema
│   ├── schema.gql                    # GraphQL schema (maps to PostgreSQL)
│   └── connectors/                   # Auto-generated query/mutation connectors
├── storage.rules
└── README.md
```

### Appendix C: Implementation Priority (Suggested Build Order)

| Phase | What to Build | Estimated Effort |
|-------|---------------|-----------------|
| **Phase 1** | Backend API (auth, content, tracking) + Firebase setup | 2-3 weeks |
| **Phase 2** | Frontend Web (auth flow, dashboard, cornerstones, daily dose) | 2-3 weeks |
| **Phase 3** | Survey engine (onboarding + daily banners) | 1 week |
| **Phase 4** | Admin portal (dose/do/survey management) | 1-2 weeks |
| **Phase 5** | Daily email system | 1 week |
| **Phase 6** | Community features + AI wellness assistant | 1-2 weeks |
| **Phase 7** | Mobile optimization + polish | 1 week |
| **Phase 8** | iOS app (separate project) | 3-4 weeks |

### Appendix D: Non-Functional Requirements

- **Performance**: Pages load in < 2 seconds on 3G. API responses < 500ms.
- **Uptime**: 99.9% availability. Firebase/Cloud SQL/Vercel/Railway all have SLAs for this.
- **Scalability**: Must handle 10,000+ concurrent users without architecture changes.
- **Accessibility**: WCAG AA compliance minimum. Large fonts, high contrast mode, screen reader support.
- **Browser Support**: Chrome, Safari, Firefox, Edge — last 2 versions. iOS Safari 15+.
- **Data Backup**: Cloud SQL automated backups daily. Point-in-time recovery enabled.

### Appendix E: What This Document Does NOT Cover

The following items are out of scope for this specification and should be addressed separately:

1. **Payment/subscription system** — if the program becomes paid, integrate Stripe later
2. **Push notifications for web** — consider adding via Web Push API after launch
3. **Marketing website** — `feelingfine.org` landing page is a separate project
4. **Analytics/tracking** — consider adding Plausible or PostHog for usage analytics later
5. **Internationalization** — English only for now; i18n architecture can be added later

### Appendix F: Content Seed Data

The following content should be pre-loaded into the database at launch. The admin can modify, add, or remove items at any time via the admin portal.

#### Week 1 Daily Doses (Days 1–7)

These are the fixed Daily Doses every user receives during their first week. Each includes the dose message, the educational banner paragraph, and the banner question.

**Day 1 (Monday — Nutrition):**
- **Dose**: "The journey of a thousand miles begins with a single step — and today, that step is on your plate. One small change to what you eat can change how you feel for the rest of the day."
- **Banner**: "Welcome to your first day! Here's something most people don't know: you don't have to overhaul your entire diet to feel better. Research shows that swapping just one processed food for a fresh, plant-based alternative can measurably improve your energy within days. We're not taking anything away — we're adding something good."
- **Banner Question**: "How would you describe what you ate yesterday?" (single_choice: Very healthy, Mostly healthy, Mixed, Mostly processed, I'd rather not say)

**Day 2 (Tuesday — Movement):**
- **Dose**: "Your body was designed to move. Not to run marathons — just to move. Ten minutes of walking does more for your health than most people realize."
- **Banner**: "Here's a fact that surprises most people: just 10 minutes of brisk walking per day has been shown to add years to your life. Not hours at the gym. Not fancy equipment. Just 10 minutes of moving your body in whatever way feels good. That's today's challenge."
- **Banner Question**: "Did you move for at least 10 minutes yesterday?" (yes/no)

**Day 3 (Wednesday — Sleep):**
- **Dose**: "Sleep isn't a luxury — it's when your body repairs itself, your brain consolidates memories, and your immune system recharges. Tonight, give yourself the gift of rest."
- **Banner**: "Did you know that your sleep changes as you age? It's true — but that doesn't mean poor sleep is inevitable. The biggest sleep disruptors for adults over 60 are screens before bed, caffeine after 2 PM, and inconsistent bedtimes. Tonight, try just one change: set a 'screens off' alarm for one hour before bed."
- **Banner Question**: "How did you sleep last night?" (scale: 1 = Terribly, 10 = Like a dream)

**Day 4 (Thursday — Stress Management):**
- **Dose**: "Stress isn't just in your head — it's in your shoulders, your stomach, your sleep. Five deep breaths can begin to undo what hours of worry have done."
- **Banner**: "Here's something fascinating about stress: your body can't tell the difference between real danger and imagined worry. When you stress about finances or health, your body releases the same cortisol as if a bear were chasing you. The good news? Deep breathing literally tells your nervous system to stand down. Five slow breaths — that's all it takes to start."
- **Banner Question**: "What is your stress level right now?" (scale: 1 = Very calm, 10 = Very stressed)

**Day 5 (Friday — Social Connection):**
- **Dose**: "Loneliness is as harmful to your health as smoking 15 cigarettes a day. Today, reach out to someone — not because you need something, but because connection is medicine."
- **Banner**: "This might be the most important thing you learn this week: loneliness is now recognized as a major health risk — as dangerous as obesity or smoking. But here's the hopeful part: even brief, meaningful social contact — a real conversation, a shared laugh, a heartfelt phone call — can measurably reduce that risk. Today's goal is simple: connect with one person."
- **Banner Question**: "When did you last have a meaningful conversation with someone?" (single_choice: Today, Yesterday, This week, More than a week ago, I can't remember)

**Day 6 (Saturday — Brain Health):**
- **Dose**: "Your brain never stops growing — at any age. Every time you learn something new, you're literally building new connections between brain cells. What will you learn today?"
- **Banner**: "Neuroplasticity — your brain's ability to form new connections — never stops. Not at 50, not at 70, not at 90. Every crossword puzzle, every new recipe, every conversation where you learn something new is physically changing the structure of your brain for the better. Today, do one thing that makes your brain work a little harder than usual."
- **Banner Question**: "Did you learn something new this week?" (yes/no)

**Day 7 (Sunday — Healthy Aging):**
- **Dose**: "The people who live the longest, healthiest lives share one trait: they have a reason to get up in the morning. What's yours?"
- **Banner**: "Researchers have studied 'Blue Zones' — places around the world where people regularly live past 100 in good health. They found that the longest-lived people share common habits: they move naturally, eat mostly plants, have strong social circles, and — most importantly — they have a sense of purpose. As you finish your first week, take a moment to think about what gives your life meaning."
- **Banner Question**: "What made you smile today?" (free_text)

#### Seed Daily Dos — 140 Tasks by Cornerstone

All 140 tasks below are seeded into the `daily_dos` table. During Week 1, users see 3-5 per day from the day's focused cornerstone. After Week 1, the system selects based on user labels.

**🍎 Nutrition (20 tasks):**
1. Drink a glass of water immediately upon waking.
2. Eat a serving of leafy green vegetables.
3. Replace a sugary drink with water or herbal tea.
4. Eat a piece of whole fruit instead of juice.
5. Include a source of protein with breakfast.
6. Eat a handful of raw nuts or seeds.
7. Avoid processed foods for one entire meal.
8. Cook a meal at home using fresh ingredients.
9. Eat slowly and chew your food thoroughly.
10. Stop eating when you feel 80% full.
11. Have a meat-free meal today.
12. Drink 8 glasses of water throughout the day.
13. Avoid added sugar for the entire day.
14. Eat a serving of fermented food (yogurt, kimchi, etc.).
15. Snack on raw vegetables (carrots, celery, etc.).
16. Use olive oil instead of butter or margarine.
17. Eat a serving of fatty fish or plant-based omega-3s.
18. Read the nutrition label before buying a food item.
19. Portion your meal on a smaller plate.
20. Eat a rainbow: include 3 different colored veggies in a meal.

**🏃 Movement (20 tasks):**
1. Take a brisk 10-minute walk.
2. Stand up and stretch every hour.
3. Take the stairs instead of the elevator.
4. Park further away from the store entrance.
5. Do 10 push-ups (or wall push-ups).
6. Do 10 squats while waiting for the kettle to boil.
7. Go for a walk after dinner.
8. Dance to your favorite song.
9. Do a 5-minute yoga flow.
10. Walk while talking on the phone.
11. Do some gardening or yard work.
12. Clean the house vigorously for 15 minutes.
13. Go for a bike ride.
14. Try a new physical activity or sport.
15. Balance on one leg while brushing your teeth.
16. Walk a dog (yours or a friend's).
17. Do a plank for 30 seconds.
18. Stretch your hamstrings and back.
19. Walk 5,000 steps today.
20. Walk 10,000 steps today.

**😴 Sleep (20 tasks):**
1. Go to bed 30 minutes earlier than usual.
2. Avoid screens (phone, TV) 1 hour before bed.
3. Keep your bedroom cool and dark.
4. Read a physical book before sleep.
5. Avoid caffeine after 2:00 PM.
6. Wake up at the same time as yesterday.
7. Get 15 minutes of sunlight in the morning.
8. Do a calming meditation before bed.
9. Take a warm bath or shower before sleep.
10. Write down your to-do list for tomorrow to clear your mind.
11. Use blackout curtains or an eye mask.
12. Avoid heavy meals 2 hours before bed.
13. Listen to white noise or calming music.
14. Change your bed sheets for fresh ones.
15. Practice deep breathing exercises in bed.
16. Keep your phone out of the bedroom.
17. Limit alcohol consumption in the evening.
18. Get at least 7 hours of sleep.
19. Get at least 8 hours of sleep.
20. Establish a consistent bedtime routine.

**🧘 Stress Management (20 tasks):**
1. Take 5 deep, slow breaths.
2. Spend 10 minutes in nature.
3. Write down 3 things you are grateful for.
4. Meditate for 5 minutes.
5. Laugh out loud (watch a funny video).
6. Listen to your favorite relaxing music.
7. Say 'no' to a non-essential request.
8. Unplug from social media for 2 hours.
9. Do a 'body scan' to release tension.
10. Pet a dog or cat.
11. Practice mindfulness while washing dishes.
12. Write in a journal for 10 minutes.
13. Forgive someone (or yourself) for a mistake.
14. Visualize a peaceful place.
15. Take a break and do absolutely nothing for 5 minutes.
16. Hug a loved one for 20 seconds.
17. Smile at yourself in the mirror.
18. Perform a random act of kindness.
19. Read an inspiring quote.
20. Focus on the present moment.

**🤝 Social Connection (20 tasks):**
1. Call a friend or family member just to say hi.
2. Send a text of appreciation to someone.
3. Eat a meal with someone without phones.
4. Listen actively to someone without interrupting.
5. Smile at a stranger.
6. Compliment someone genuinely.
7. Ask a colleague how their day is going.
8. Plan a get-together with friends.
9. Volunteer for a local cause.
10. Write a thank-you note.
11. Introduce yourself to a neighbor.
12. Join a club or group activity.
13. Share a funny story with someone.
14. Offer help to someone in need.
15. Reconnect with an old friend.
16. Make eye contact when speaking to people.
17. Ask someone for their advice.
18. Share a meal with a neighbor.
19. Participate in a community event.
20. Express love to your partner or family.

**🧠 Brain Health (20 tasks):**
1. Read a chapter of a book.
2. Solve a crossword or Sudoku puzzle.
3. Learn a new word and use it in a sentence.
4. Brush your teeth with your non-dominant hand.
5. Take a different route to work or the store.
6. Listen to an educational podcast.
7. Learn 5 words in a new language.
8. Play a memory game.
9. Try a new recipe.
10. Play a musical instrument (or learn to).
11. Draw, paint, or doodle.
12. Write a short poem or story.
13. Do a jigsaw puzzle.
14. Learn a new skill (e.g., juggling, knitting).
15. Engage in a debate or intellectual discussion.
16. Recall what you ate for dinner 3 days ago.
17. Memorize a phone number.
18. Teach someone something you know.
19. Avoid multitasking for 30 minutes.
20. Drink water to hydrate your brain.

**🌿 Healthy Aging (20 tasks):**
1. Wear sunscreen on your face.
2. Practice balancing on one foot.
3. Stand up straight and check your posture.
4. Moisturize your skin.
5. Get your hearing or vision checked (if due).
6. Floss your teeth.
7. Lift a light weight to maintain muscle mass.
8. Learn something new about your family history.
9. Spend time with someone of a different generation.
10. Check your blood pressure.
11. Review your medications with a doctor.
12. Clear clutter from a walkway to prevent falls.
13. Eat antioxidant-rich foods (berries, dark chocolate).
14. Stay socially active.
15. Keep your mind active with puzzles.
16. Stretch your hips and back.
17. Limit alcohol intake.
18. Quit smoking (or don't start).
19. Laugh often.
20. Reflect on your life's purpose.

#### Rotating Post-Program Daily Doses (Day 8+)

These general-purpose doses rotate for users who have completed the structured program or are assigned dynamically based on user labels:

1. "The journey of a thousand miles begins with a single step."
2. "Health is not just about what you're eating. It's also about what you're thinking and saying."
3. "Take care of your body. It's the only place you have to live."
4. "A healthy outside starts from the inside."
5. "Believe you can and you're halfway there."
6. "Consistency is the key to breakthrough."
7. "Small daily improvements are the key to staggering long-term results."
8. "Your health is an investment, not an expense."
9. "Don't wait for the perfect moment — take the moment and make it perfect."
10. "Wellness is the complete integration of body, mind, and spirit."

---

*End of specification. This document should contain sufficient detail to implement the entire Feeling Fine platform from scratch without additional requirements gathering.*


