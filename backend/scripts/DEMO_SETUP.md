# Demo Account Setup Guide

## Overview

This guide explains how to set up and use the Grovio presentation demo account. The demo provides a complete, realistic dataset for demonstrating the Grovio inventory and billing system.

## Prerequisites

- Node.js 18+
- MongoDB Atlas cluster access (or self-hosted MongoDB)
- Access to the backend codebase

## Setup Instructions

### 1. Configure Environment

Ensure `MONGODB_URI` is set in your `.env` file. The seed script uses the same database as the backend server. This is a safety requirement.

```bash
# In backend/.env
MONGODB_URI=mongodb+srv://your-user:your-password@cluster.mongodb.net/grovio?retryWrites=true&w=majority
```

### 2. Run the Seed Script

From the `backend/` directory:

```bash
npm run seed:demo
```

Or directly:

```bash
node scripts/seed-demo.mjs
```

### 3. Use the Demo Credentials

After the script completes, it prints login credentials:

```
═══════════════════════════════════════════════════════════
🎉 Demo seed completed in ~40 seconds
═══════════════════════════════════════════════════════════
Store: Grovio Presentation Demo
Email: demo@grovio-demo.local
Password: Demo123!
───────────────────────────────────────────────────────────
Sign in at: https://grovio-ten.vercel.app/
═══════════════════════════════════════════════════════════
```

Use these credentials to sign in to the frontend at `https://grovio-ten.vercel.app/`.

## What's Included

The demo creates a complete grocery store with:

| Module       | Count | Details                                  |
|-------------|-------|------------------------------------------|
| Categories  | 10    | Staples, Rice, Pulses, Oils, Dairy, etc. |
| Suppliers   | 6     | Sharma Wholesalers, Amul, ITC, etc.      |
| Products    | 43    | Realistic Indian grocery items           |
| Customers   | 12    | With varying opening balances & tags     |
| Team        | 3     | Owner, Manager, Cashier                  |
| Purchases   | 11    | 9 received, 1 partial, 1 pending         |
| Bills       | 14    | Cash, UPI, Card, Credit, Split payments  |
| Returns     | 3     | Damaged goods, spoiled items, exchange   |
| Payments    | 5     | Customer + supplier payments             |

### Data Flow (Reconciliation)

All demo data is interconnected and reconciled:

1. **Purchases → Inventory**: 9 purchase orders have been received, adding stock to products. 1 is partially received (PO-1010), and 1 is pending (PO-1011).
2. **Bills → Inventory**: 14 bills have decremented product stock when sold. Each bill's totals are calculated from actual product prices, discounts, and GST rates.
3. **Returns → Inventory**: 3 returns have either restocked products (RET-0001, RET-0003) or marked them as spoiled (RET-0002, not restocked).
4. **Payments → Financials**: Payments are linked to bills and purchases, ensuring financial reconciliation. Credit bills show outstanding balances.

### Sample Scenarios to Demonstrate

- **Low stock alerts**: Several products are below their minimum stock threshold.
- **Expiry tracking**: Products like Atta have expiry dates for demonstration.
- **Credit billing**: GRV-1006 and GRV-1009 are credit bills with outstanding balances.
- **Partial payments**: GRV-1014 has a partial payment (balance due).
- **Partial purchase receipts**: PO-1010 is partially received.
- **Supplier dues**: Some suppliers have outstanding balances.
- **GST reporting**: Tax calculations across 0%, 5%, and 18% GST rates.
- **Customer loyalty**: Customers have tags and purchase history.

## Idempotency

The seed script is **idempotent** — running it multiple times is safe:

1. It deletes all existing demo store data before creating new data.
2. The password is fixed (`Demo123!`), so credentials remain the same across runs.
3. Sequence numbers are reset to ensure consistent invoice IDs (GRV-1001, PO-1001, RET-0001).

## Safety Features

- **Environment guard**: Script refuses to run if `NODE_ENV=production`.
- **Database guard**: Script requires `MONGODB_DEMO_URI` and validates it contains `grovio_demo`.
- **Data isolation**: All demo data lives in the `grovio_demo` database, separate from production.

## Project Structure

```
backend/
  scripts/
    seed-demo.mjs          # Seed script (this file)
  src/
    models/                # Mongoose models for all entities
    services/              # Business logic services
    lib/
      money.js             # Paise/rupee utilities
```

## Scripts Reference

| Script              | Description              |
|---------------------|--------------------------|
| `npm run seed:demo` | Run the demo seed script |