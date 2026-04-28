# TruckFlow – CDL Profit Tracker

A production-ready, single-user trucking income verification and analytics system built with React, Vite, TailwindCSS, and Firebase.

---

## Features

- 📊 **Dashboard** – KPI cards showing Today / Week / Month / Year earnings, plus performance metrics
- 🚛 **Loads** – Add, edit, delete loads with weekly grouping and summary stats
- 💸 **Expenses** – Track business expenses by category with breakdowns
- 📈 **Analytics** – Line, pie, and area charts for revenue trends and broker distribution
- ⚙️ **Settings** – Configurable earning profiles, dark mode, export/import data
- 🔐 **Auth** – Email/password login, registration, and password reset via Firebase
- 🌙 **Dark Mode** – Persistent dark mode toggle

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| Styling | TailwindCSS 3 + shadcn/ui components |
| Data Fetching | @tanstack/react-query |
| Charts | Recharts |
| Dates | dayjs |
| Animations | Framer Motion |
| Icons | lucide-react |
| Backend | Firebase (Firestore + Auth) |
| Routing | react-router-dom v6 |

---

## Setup

### Prerequisites

- Node.js 18+
- npm 9+
- A [Firebase](https://firebase.google.com) project with Firestore and Authentication enabled

### 1. Clone and install

```bash
git clone <repo-url>
cd cdlprofit
npm install
```

### 2. Configure Firebase

Copy the environment example and add your Firebase credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase project settings:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### 3. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Sign-in method: Email/Password
3. Enable **Cloud Firestore** database
4. The app uses the following data structure (auto-created per user):

```
users/{uid}/loads/{loadId}
users/{uid}/expenses/{expenseId}  
users/{uid}/settings/{settingsId}
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |

---

## Folder Structure

```
src/
├── api/
│   ├── firebase.js              ← Firebase SDK initialization
│   ├── auth.js                  ← Auth service (login, register, reset)
│   └── entities/
│       ├── Load.js              ← Load entity (Firestore CRUD)
│       ├── Expense.js           ← Expense entity (Firestore CRUD)
│       └── AppSettings.js       ← App settings entity
├── components/
│   ├── Layout.jsx               ← Sidebar navigation + responsive mobile menu
│   ├── AuthGuard.jsx            ← Auth gate (redirects to Login)
│   ├── ErrorBoundary.jsx        ← Global error boundary
│   ├── ui/                      ← Reusable UI components (shadcn-style)
│   └── trucking/
│       ├── StatCard.jsx         ← KPI card with icon, label, value
│       ├── LoadForm.jsx         ← Add/Edit load dialog
│       ├── ExpenseForm.jsx      ← Add/Edit expense dialog
│       ├── RecentLoadsTable.jsx ← Recent loads summary table
│       ├── useSettings.js       ← Custom hook for AppSettings
│       └── calcUtils.js         ← Earning calculation utilities
├── contexts/
│   ├── authContext.jsx          ← Auth context provider
│   └── useAuth.js               ← useAuth hook (single source)
├── lib/
│   ├── utils.js                 ← Tailwind class merging utility
│   └── useFirestoreQuery.js     ← Real-time Firestore hook
├── pages/
│   ├── Dashboard.jsx            ← Main dashboard with KPIs
│   ├── Loads.jsx                ← Loads management with weekly grouping
│   ├── Expenses.jsx             ← Expenses management
│   ├── Analytics.jsx            ← Charts and analytics
│   ├── Settings.jsx             ← Settings + data export/import
│   └── Login.jsx                ← Login / Register / Password Reset
├── App.jsx                      ← Root component with routing
├── main.jsx                     ← React entry point
└── index.css                    ← Tailwind imports + global styles
```

---

## Earning Profiles

| Profile | Calculation |
|---------|------------|
| Owner Operator | Full gross amount (or gross × percentage if fee set) |
| Solo – Per Mile | `loaded_miles × rate_per_mile` |
| Solo – Percentage | `gross_amount × (percentage_rate / 100)` |
| Team – Per Mile | `loaded_miles × rate_per_mile` |
| Team – Percentage | `gross_amount × (percentage_rate / 100)` |

Configure your profile in the **Settings** page.
