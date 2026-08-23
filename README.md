# Purvaja Fashion — Prototype B (Atelier Editorial E-Commerce)

This is **Prototype B**, a completely independent full-stack luxury editorial e-commerce application.

---

## Architecture & Independence

Prototype B has its **own separate frontend, backend, database configuration, stores, and build pipeline**, operating with **100% independence** from Prototype A.

```
02 E-Commerce/
├── backend/          # Dedicated Express backend running on port 5001
│   ├── src/
│   │   ├── config/   # Environment config (Port 5001, CORS 5174)
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── server.ts
│   └── package.json  # @ecommerce/prototype-b-backend
│
├── frontend/         # Dedicated Vite + React 19 storefront on port 5174
│   ├── src/
│   │   ├── app/      # App root, router, config (points to :5001)
│   │   ├── components/
│   │   ├── features/ # Stores, schemas, types, seed data
│   │   ├── layouts/  # CustomerLayout, AuthLayout, CheckoutLayout
│   │   ├── pages/    # Editorial luxury pages (Atelier theme)
│   │   ├── styles/   # Cormorant Garamond + Outfit tokens
│   │   └── main.tsx
│   └── package.json  # @ecommerce/prototype-b
│
├── package.json      # Monorepo scripts
└── pnpm-workspace.yaml
```

---

## Quick Start

### 1. Run Full-Stack Prototype B (Frontend + Backend concurrently):
```bash
cd "02 E-Commerce"
pnpm dev
```
- **Frontend**: `http://localhost:5174/`
- **Backend API**: `http://localhost:5001/api/v1`

### 2. Run Only Frontend:
```bash
pnpm dev:frontend
```

### 3. Run Only Backend:
```bash
pnpm dev:backend
```

### 4. Build Production Bundles:
```bash
pnpm build
```

---

## Prototype Comparison:

| Feature | Prototype A (`01 E-Commerce`) | Prototype B (`02 E-Commerce`) |
|---|---|---|
| **Frontend Port** | `5173` | `5174` |
| **Backend Port** | `5000` | `5001` |
| **Database** | `mongodb://localhost:27017/ecommerce_dev` | `mongodb://localhost:27017/ecommerce_proto_b` |
| **CORS Origin** | `http://localhost:5173` | `http://localhost:5174` |
| **Visual Direction** | Modern Card Marketplace | Luxury Editorial Magazine ("Atelier") |
| **Typography** | `Inter` sans-serif | `Cormorant Garamond` serif + `Outfit` body |
| **Color Scheme** | Monochrome Zinc | Warm Ivory, Deep Charcoal, Aged Gold |
