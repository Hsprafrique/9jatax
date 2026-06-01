# ShopTrack

A simple, clean business management tool for Nigerian small shops and stores. Track income, expenses, inventory, and customers — all in one place. Print invoices and expense reports directly from the browser.

Built with React + Vite + Supabase + Vercel.

---

## What it does

- **Dashboard** — See income, expenses, profit, and unpaid invoices at a glance with a 6-month chart
- **Sales & Invoices** — Create invoices with line items, track payment status, print professional receipts
- **Expenses** — Log all business expenses by category, filter and print expense reports
- **Inventory** — Manage products with stock tracking, low-stock alerts, and stock adjustments
- **Customers** — Simple customer directory linked to invoices
- **Settings** — Shop profile that appears on every printed invoice

---

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| UI components | Radix UI primitives |
| Database & Auth | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Charts | Recharts |
| Print | Native browser print |

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and paste the entire contents of `supabase/schema.sql` — run it
4. Go to **Settings → API** and copy your **Project URL** and **anon public** key

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Install and run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

### 4. Deploy to Vercel

**Option A — Vercel CLI:**
```bash
npm install -g vercel
vercel
```

**Option B — Vercel Dashboard:**
1. Push your code to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click Deploy

### 5. Enable email auth in Supabase

1. Supabase Dashboard → **Authentication → Providers**
2. Make sure **Email** is enabled (it is by default)
3. Optional: Under **Email Templates**, customize the confirmation email with your shop name

---

## File structure

```
shoptrack/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── Layout.jsx          # Sidebar + topbar shell
│   ├── hooks/
│   │   └── useData.js              # Supabase query hooks
│   ├── lib/
│   │   ├── supabase.js             # Supabase client
│   │   ├── AuthContext.jsx         # Auth state + helpers
│   │   └── utils.js                # formatCurrency, formatDate, etc.
│   ├── pages/
│   │   ├── AuthPage.jsx            # Login + signup
│   │   ├── Dashboard.jsx
│   │   ├── Expenses.jsx
│   │   ├── Invoices.jsx
│   │   ├── Inventory.jsx
│   │   ├── Customers.jsx
│   │   └── Settings.jsx
│   ├── App.jsx                     # Router setup
│   ├── main.jsx
│   └── index.css
├── supabase/
│   └── schema.sql                  # Run this in Supabase SQL editor
├── .env.example
├── vercel.json
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Extending the app

**Add more expense categories:** Edit the `CATEGORIES` array in `src/pages/Expenses.jsx`

**Change currency:** Go to Settings in the app and pick your currency — it applies everywhere

**Add more pages:** Create a new file in `src/pages/`, add a route in `App.jsx`, and a nav link in `Layout.jsx`

**Custom invoice template:** Edit the `printInvoice()` function in `src/pages/Invoices.jsx` — it's plain HTML/CSS injected into a print window

---

## License

MIT — build on it, sell it, use it. Go make money.
