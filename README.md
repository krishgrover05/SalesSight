# SalesSight

Full-stack sales analytics app: product search, historical trends, ML-style forecasts, and ranked recommendations.

## Stack

- **Frontend:** React (Vite), Tailwind CSS, Chart.js, React Router
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT (optional), rate limiting, Swagger

## Quick start

### Backend

```bash
cd backend
cp .env.example .env   # edit if needed (MONGODB_URI, JWT_SECRET)
npm install
npm run dev
```

API: `http://localhost:4000`  
Swagger: `http://localhost:4000/api-docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000` (proxies `/api` to backend)

### MongoDB

Ensure MongoDB is running locally, or set `MONGODB_URI` in `backend/.env` (e.g. Atlas connection string).

## API routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/products/search` | Body: `{ "products": ["A","B"] }` – market trend analysis |
| POST | `/api/products/forecast` | Body: `{ "products": ["A"], "horizonMonths": 6 }` – forecast |
| GET | `/api/google-trends?keyword=X` | Search interest (simulated) |
| POST | `/api/datasets/upload` | Multipart: `file`, optional `productId` |
| POST | `/api/auth/register` | Register (email, password, name) |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Current user (Bearer token) |

## Pages

- **Home** – Hero + product search bar (comma-separated).
- **Dashboard** – Multi-product search, line charts (historical + forecast), ranked recommendations; click a product → Analysis Details.
- **Analysis Details** – Single-product view with trend, score, market share, recommendation, combined chart; “Export report” → Report Export.
- **Report Export** – Preview and download report as JSON or text.

## Features

- Rate limiting (100 req/15 min), optional JWT auth, request analytics logging to DB
- Mobile-responsive layout and nav
- All API responses are JSON
