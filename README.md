# TruckFlow – CDL Profit Tracker

A production-ready, single-user trucking income verification and analytics system built with React, Vite, TailwindCSS, and Base44 cloud database.

---

## Features

- 📊 **Dashboard** – KPI cards showing Today / Week / Month / Year earnings, plus performance metrics
- 🚛 **Loads** – Add, edit, delete loads with weekly grouping and summary stats
- 💸 **Expenses** – Track business expenses by category with breakdowns
- 📈 **Analytics** – Line, pie, and area charts for revenue trends and broker distribution
- ⚙️ **Settings** – Configurable earning profiles, dark mode, export/import data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | TailwindCSS + shadcn/ui components |
| Data Fetching | @tanstack/react-query |
| Charts | recharts |
| Dates | moment.js |
| Animations | framer-motion |
| Icons | lucide-react |
| Backend | Base44 cloud database (`@base44/sdk`) |
| Routing | react-router-dom |

---

## Setup

### Prerequisites

- Node.js 18+
- npm 9+
- A [Base44](https://base44.dev) account and App ID

### 1. Clone and install

```bash
git clone <repo-url>
cd cdlprofit
npm install
```

### 2. Configure Base44

Copy the environment example and add your App ID:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_BASE44_APP_ID=your-actual-app-id
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Base44 Configuration

1. Create a free account at [base44.dev](https://base44.dev)
2. Create a new app
3. In the app's entity schema, create these entities:
   - **Load** with fields: `load_id`, `broker_name`, `pickup_city`, `pickup_state`, `delivery_city`, `delivery_state`, `pickup_date`, `delivery_date`, `loaded_miles`, `deadhead_miles`, `gross_amount`, `notes`, `status`
   - **Expense** with fields: `title`, `amount`, `category`, `date`, `notes`
   - **AppSettings** with fields: `earning_profile`, `rate_per_mile`, `percentage_rate`, `dark_mode`, `driver_name`, `company_name`
4. Copy your App ID from the dashboard into `.env`

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Folder Structure

```
src/
├── api/
│   ├── base44Client.js          ← Base44 SDK client initialization
│   └── entities/
│       ├── Load.js              ← Load entity wrapper
│       ├── Expense.js           ← Expense entity wrapper
│       └── AppSettings.js       ← App settings entity wrapper
├── components/
│   ├── Layout.jsx               ← Sidebar navigation + responsive mobile menu
│   ├── ui/                      ← Reusable UI components (shadcn-style)
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── dialog.jsx
│   │   ├── input.jsx
│   │   ├── select.jsx
│   │   ├── tabs.jsx
│   │   ├── badge.jsx
│   │   ├── switch.jsx
│   │   ├── sheet.jsx
│   │   ├── toast.jsx
│   │   ├── toaster.jsx
│   │   └── use-toast.js
│   └── trucking/
│       ├── StatCard.jsx         ← KPI card with icon, label, value
│       ├── LoadForm.jsx         ← Add/Edit load dialog
│       ├── ExpenseForm.jsx      ← Add/Edit expense dialog
│       ├── RecentLoadsTable.jsx ← Recent loads summary table
│       ├── useSettings.js       ← Custom hook for AppSettings
│       └── calcUtils.js         ← Earning calculation utilities
├── lib/
│   └── utils.js                 ← Tailwind class merging utility
├── pages/
│   ├── Dashboard.jsx            ← Main dashboard with KPIs
│   ├── Loads.jsx                ← Loads management with weekly grouping
│   ├── Expenses.jsx             ← Expenses management
│   ├── Analytics.jsx            ← Charts and analytics
│   └── Settings.jsx             ← Settings + data export/import
├── App.jsx                      ← Root component with routing
├── main.jsx                     ← React entry point
└── index.css                    ← Tailwind imports + global styles
```

---

## Earning Profiles

| Profile | Calculation |
|---------|------------|
| Owner Operator | Full gross amount |
| Solo – Per Mile | `loaded_miles × rate_per_mile` |
| Solo – Percentage | `gross_amount × (percentage_rate / 100)` |
| Team – Per Mile | `loaded_miles × rate_per_mile` |
| Team – Percentage | `gross_amount × (percentage_rate / 100)` |

Configure your profile in the **Settings** page.
