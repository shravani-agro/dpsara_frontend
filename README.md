# Satta Matka — Admin Panel

A full admin dashboard for the Satta Matka platform, built with **Next.js 14 (App
Router, TypeScript, Tailwind CSS)** and backed by the existing **FastAPI** API
which uses **MySQL** (async, via `aiomysql`) as its database.

*Last updated: 2026*

## Features

- Admin login (JWT bearer, stored in `localStorage`)
- Dashboard with charts: revenue, user growth, top bettors, market performance
- User management: search, enable/disable, set VIP, credit bonus, reset password, view activity
- Market management: status, timings, odds (JSON), clone, soft-delete
- Result declaration with pending-bet preview
- Withdrawal approval/rejection (single + bulk)
- Game rates (per market or global), VIP levels, notices, system settings, commission
- Audit log viewer

## Project layout

```
admin/
  app/
    layout.tsx              # root layout + AuthProvider
    login/page.tsx          # login screen
    dashboard/              # protected area (sidebar nav)
      layout.tsx            # sidebar + route guard
      page.tsx              # dashboard overview
      users/  markets/  results/  withdrawals/
      game-rates/  vip/  notices/  settings/  audit/
  components/
    AuthProvider.tsx        # auth context
    ui.tsx                  # reusable UI (Card, Button, Modal, ...)
  lib/
    api.ts                  # axios client + interceptors
    admin.ts                # typed API calls
    config.ts               # API base url
    types.ts                # TS types
```

## Prerequisites

- Node.js 18+
- Python 3.10+ (for the FastAPI backend, already present in `../backend`)

## 1. Start the backend

```bash
cd ../backend
python -m venv venv        # if not already created
.\venv\Scripts\activate
pip install -r requirements.txt
python init_db.py          # creates tables + default admin
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Default admin credentials (change after first login):
**username `admin` / password `admin123`**

## 2. Start the admin panel

```bash
cd admin
npm install
cp .env.local.example .env.local   # optional, default points to http://localhost:8000/api
npm run dev
```

Open http://localhost:3000 (or the port printed) and sign in.

## Database (MySQL)

The backend uses **MySQL** by default via the `DATABASE_URL` in `../backend/.env`:

```
DATABASE_URL=mysql+aiomysql://satta:Gameplay1234@localhost:3306/satta
```

To set up from scratch:

1. Create the database and user in MySQL:
   ```sql
   CREATE DATABASE satta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'satta'@'localhost' IDENTIFIED BY 'Gameplay1234';
   GRANT ALL PRIVILEGES ON satta.* TO 'satta'@'localhost';
   ```
2. Install the async driver (already in `requirements.txt`):
   ```bash
   pip install aiomysql
   ```
3. Run `python init_db.py` to create all tables and a default admin, then start uvicorn.

> All model `String` columns use explicit lengths so the same schema works on
> MySQL. SQLite is still supported as a fallback by changing `DATABASE_URL`.

## Production build

```bash
npm run build
npm run start
```

Set `NEXT_PUBLIC_API_BASE` to your backend URL when deploying.
