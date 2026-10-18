# Gocommet British Auction in RFQ Procurement System

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.0-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-MySQL-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Realtime](https://img.shields.io/badge/Realtime-SSE-emerald?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
[![Test Suite](https://img.shields.io/badge/Tests-21%2F21%20Passing-brightgreen?style=flat)](tests/auctionEngine.test.js)

> A production-grade, full-stack **British Reverse Auction Engine** integrated into an enterprise **Logistics RFQ (Request for Quotation) Procurement Platform**. Engineered with clean architecture in Next.js (App Router, JavaScript-only), Tailwind CSS v4, Lucide Icons, Prisma ORM, and MySQL for ACID consistency and transactional integrity.

---

## 🌟 Key Highlights & British Auction Concept

In global freight procurement, buyers issue RFQs for ocean, air, and surface corridors. Carriers and freight forwarders submit quotes decomposed into base freight, origin ancillaries, and destination ancillaries.

Traditional sealed tenders often suffer from information asymmetry and last-second "bid sniping". The **British Reverse Auction** solves this with dynamic, transparent price discovery:

1. **Reverse Auction Mechanics**: Suppliers compete downward; the verified lowest valid quote holds the **L1 rank**.
2. **Sniping Prevention via Trigger Window**: If qualifying bidding activity occurs in the final $X$ minutes (**Trigger Window**) before closing time, the auction automatically extends by $Y$ minutes.
3. **Hard Ceiling (Forced Bid Close)**: To preserve buyer operational planning, the engine enforces an immutable **`forcedCloseTime`**:
   $$\text{newCloseTime} = \min(\text{currentCloseTime} + \text{extensionDuration}, \; \text{forcedCloseTime})$$
   **The auction will NEVER extend beyond the forced close time.**
4. **Three Configurable Extension Triggers**:
   - `BID_RECEIVED`: Any valid new quote in the trigger window extends the auction.
   - `RANK_CHANGE`: Any shift in supplier leaderboard standings extends the auction.
   - `L1_CHANGE`: Only an upset of the absolute lowest bidder (L1) extends the auction.

---

## 📋 Present Working Plan (Current Production Implementation)

The platform currently operates as a fully functional, end-to-end logistics procurement suite with the following modules active and tested:

### 1. Shipped Core Features
- ✅ **Dynamic British Auction Engine**:
  - Millisecond-accurate evaluation of extension conditions based on trigger windows and trigger types.
  - Strict mathematical guarantee that no extension ever exceeds `forcedCloseTime`.
  - Rejection of invalid bids (post-close bids, bids below minimum decrements, non-positive charges).
- ✅ **Real-Time Leaderboard & Tie-Breaking**:
  - Live ranking computation ($L1, L2, L3, \dots, Ln$) based on lowest `totalPrice`.
  - Deterministic tie-breaking prioritizing the earlier quote timestamp.
- ✅ **Dual Bidding Portals & Real-time Synchronization**:
  - **Buyer Command Center** (`/dashboard`, `/auctions/[id]`): Live visibility into all carrier quotes, audit timeline, rank history, and auction countdowns.
  - **Supplier Bidding Cockpit** (`/suppliers`): Tailored view for freight forwarders featuring real-time outbid warnings, rank status badges, and itemized quote submission forms.
  - **Server-Sent Events (SSE)** via `/api/auctions/[id]/stream` broadcasting real-time rank updates, countdown sync, and audit events with automatic polling fallback.
- ✅ **Persona & Authentication Simulator**:
  - Seamless navbar switcher to test as the Buyer (**Sarah Jenkins**) or global shipping carriers (**Maersk**, **Hapag-Lloyd**, **CMA CGM**, **MSC**, **Evergreen**).
- ✅ **Dual-Mode Persistence Architecture**:
  - Production-ready **MySQL with Prisma ORM** with ACID transactions and row-level locking.
  - Built-in zero-config **in-memory transaction store** fallback, allowing instant execution without requiring a local database server.
- ✅ **Comprehensive Automated Verification**:
  - 21 automated unit and integration tests covering the complete British Auction and RBAC authorization specifications (`npm test`).

### 2. Present System Architecture

```mermaid
graph TD
    subgraph ClientLayer["Frontend Layer (Next.js 16 App Router)"]
        Buyer["Buyer Dashboard (/dashboard, /auctions/[id])"]
        Supplier["Supplier Portal (/suppliers)"]
        SSEListener["Realtime SSE Hook (useAuctionStream)"]
    end

    subgraph ServiceLayer["API Gateway & Service Layer"]
        BidsRoute["POST /api/auctions/[id]/bids"]
        AuctionsRoute["GET /api/auctions, GET /api/auctions/[id]"]
        StreamRoute["GET /api/auctions/[id]/stream (SSE)"]
        ValidationLayer["Zod Validation & Business Rules (lib/validation.js)"]
    end

    subgraph CoreEngine["British Auction Engine (lib/auction-engine.js)"]
        TxLock["ACID Transaction Manager"]
        RankingCalc["L1-Ln Dynamic Leaderboard (lib/ranking.js)"]
        ExtensionEngine["British Extension Evaluator (lib/auction/extensionEngine.js)"]
        EventBus["Pub/Sub Event Bus (lib/auction/eventBus.js)"]
    end

    subgraph StorageLayer["Data Storage Layer"]
        MySQL[("MySQL 8.0+ / Prisma ORM")]
        MemStore[("Zero-Config In-Memory Transaction Store")]
    end

    Buyer -->|HTTP REST| AuctionsRoute
    Supplier -->|Submit Quote| BidsRoute
    BidsRoute --> ValidationLayer
    ValidationLayer --> CoreEngine
    CoreEngine --> TxLock
    TxLock -->|ACID Transaction| MySQL
    TxLock -.->|Zero-config local fallback| MemStore
    CoreEngine --> EventBus
    EventBus --> StreamRoute
    StreamRoute -->|Push Events| SSEListener
    SSEListener --> Buyer
    SSEListener --> Supplier
```

---

## 🗺️ Future Plan & Strategic Roadmap

The following roadmap outlines the evolution of the platform from a single-lane British auction into an enterprise-scale multimodal freight exchange:

### Phase 1: Near-Term Enhancements (Q1 - Q2)
- 🎯 **Configurable Decrement Steps (Tick Sizes)**:
  - Enforce minimum bid decrement rules (e.g., minimum ₹1,000 or 1.5% below current L1) to prevent nominal quote spamming.
- 🎯 **Multi-Container & Multi-Leg Lane Bundling**:
  - Support multi-equipment quotes (20ft Standard, 40ft High Cube, 40ft Reefer) and multi-modal transit legs (Trucking + Ocean Freight) in a single auction.
- 🎯 **Carrier Capacity Commitments**:
  - Allow suppliers to specify allocated container capacity (TEUs) per quote, enabling partial split-awards if L1 cannot fulfill total volume.
- 🎯 **Automated Post-Auction PO & Contract Generation**:
  - Instant transition from `CLOSED` auction status to auto-generated Purchase Orders and draft Master Service Agreements (MSAs).

### Phase 2: Enterprise Logistics & Scaling (Q3)
- 🚀 **Distributed Realtime with Redis Pub/Sub & WebSockets**:
  - Migrate local in-process EventBus to a distributed Redis Pub/Sub cluster to support 50,000+ concurrent carrier connections across geographic regions.
- 🚀 **Multi-Currency & Real-Time FX Hedging**:
  - Enable quotes in USD, EUR, and INR with locked benchmark exchange rates at auction creation to insulate global forwarders from intraday volatility.
- 🚀 **SSO & Role-Based Access Control (RBAC)**:
  - Enterprise SAML 2.0 / OAuth integration (Okta, Azure AD) with fine-grained permissions for Procurement Officers, Legal Auditors, and Carrier Executives.
- 🚀 **Automated Regulatory & Sanctions Screening**:
  - Real-time compliance check verifying carrier vessels and bills of lading against maritime sanction databases prior to bid acceptance.

### Phase 3: AI & Autonomous Intelligence (Q4 & Beyond)
- 🤖 **AI Dynamic Reserve Price Recommendation**:
  - Train ML models on historical spot indices (e.g., SCFI, Drewry, Freightos) to automatically calculate optimal reserve prices and trigger window parameters.
- 🤖 **Autonomous Supplier Bidding Bots (Proxy Bidding)**:
  - Allow carriers to configure automated proxy bidding rules (floor price, step decrement, target margin) that respond autonomously to outbid events in the final minutes.
- 🤖 **Predictive Fuel & Bunker Adjustment Factor (BAF) Estimators**:
  - Machine learning models forecasting bunker fuel fluctuations to dynamically adjust baseline landed freight totals.

---

## 🛠️ Tech Stack Reference

| Layer | Technologies |
|---|---|
| **Frontend Framework** | Next.js 16 (App Router, JavaScript `.js`/`.jsx` only), React 19 |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Glassmorphism design tokens |
| **Backend & Routing** | Next.js Route Handlers (`app/api/*`) with modular service layers |
| **Database & ORM** | MySQL 8.0+, Prisma ORM (`prisma/schema.prisma`) |
| **Resilience Store** | Zero-config in-memory transaction store for instant local demos |
| **Realtime Engine** | Server-Sent Events (SSE) with local pub/sub & polling safety net |
| **Schema Validation** | Zod v4 and custom business rule validators |
| **Testing Engine** | Node.js native test runner (`node:test`) |

---

## 📂 Repository Structure

```
├── app/
│   ├── api/
│   │   ├── auctions/
│   │   │   ├── route.js                  # List auctions (search, filter, sort)
│   │   │   └── [id]/
│   │   │       ├── route.js              # Auction details & computed rankings
│   │   │       ├── bids/route.js         # Place bid & list bids
│   │   │       ├── activity/route.js     # Activity timeline & audit trail
│   │   │       └── stream/route.js       # Real-time SSE event stream
│   │   ├── rfqs/
│   │   │   ├── route.js                  # Create RFQ & Auction
│   │   │   └── [id]/route.js             # RFQ details
│   │   ├── suppliers/route.js            # List suppliers with bidding stats
│   │   ├── users/route.js                # List buyers & suppliers
│   │   └── seed/route.js                 # One-click UI re-seed endpoint
│   ├── dashboard/page.js                 # Procurement Dashboard (/dashboard)
│   ├── auctions/
│   │   ├── page.js                       # Auction Listing page (/auctions)
│   │   └── [id]/page.js                  # Flagship Auction Details page (/auctions/[id])
│   ├── rfqs/
│   │   ├── page.js                       # RFQ Listing page (/rfqs)
│   │   └── new/page.js                   # Create RFQ & British Auction wizard (/rfqs/new)
│   ├── suppliers/page.js                 # Dedicated Supplier Portal & Live Bid Cockpit (/suppliers)
│   ├── docs/page.js                      # In-app Architecture & HLD guide (/docs)
│   ├── layout.js                         # Root layout with AuthProvider & Navbar
│   └── page.js                           # Root landing / Dashboard redirect
├── components/
│   ├── Navbar.js                         # Top navigation with live Persona Switcher & Seed button
│   ├── Sidebar.js                        # Collapsible navigation menu
│   ├── AuctionCountdown.js               # Reactive countdown timer with trigger alert
│   ├── LeaderboardTable.js               # L1, L2, L3 supplier standings table
│   ├── BidForm.js                        # Competitive quote submission form with live math
│   ├── ActivityTimeline.js               # Audit trail of bids, rank shifts, extensions
│   └── BritishAuctionRulesCard.js        # Engine parameters breakdown card
├── context/
│   └── AuthContext.js                    # Persona switching (Buyer vs. 5 Suppliers)
├── lib/
│   ├── prisma.js                         # Singleton Prisma client manager
│   ├── validation.js                     # Zod and business rule validation
│   ├── auction-engine.js                 # Unified auction engine exports
│   ├── ranking.js                        # Supplier leaderboard & rank differential logic
│   ├── time-utils.js                     # Auction countdown & timing utilities
│   ├── utils.js                          # Formatting and UI class helpers
│   ├── seedData.js                       # Realistic demo data generator
│   └── db/
│       ├── inMemoryStore.js              # Resilient in-memory transaction store for demo fallback
│       └── mongodb.js                    # Mongoose connection manager
├── prisma/
│   └── schema.prisma                     # Prisma schema configured for MySQL
├── docs/
│   ├── HLD.md                            # High-Level Architecture Design
│   ├── DATABASE.md                       # Comprehensive MySQL & Prisma schema reference
│   └── AUCTION-LOGIC.md                  # British Auction mathematics and worked examples
├── tests/
│   └── auctionEngine.test.js             # Automated unit tests (14 test cases)
├── scripts/
│   └── seed.js                           # Terminal seeding script (npm run seed)
├── .env.example                          # Environment variables template
└── README.md
```

---

## 🛠️ Setup & Running Locally

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MySQL**: (Optional; if not configured, the zero-config in-memory store activates seamlessly)

### 2. Installation
```bash
git clone <repo-url>
cd GoComet
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Example `.env.local`:
```env
DATABASE_URL="mysql://root:password@localhost:3306/gocommet_rfq"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup (MySQL with Prisma)
When using MySQL, generate the client and push the schema:
```bash
npx prisma generate
npx prisma db push
```

### 5. Seed Demo Data
Populate realistic logistics RFQs, active British auctions, and carrier profiles:
```bash
npm run seed
```
*(You can also click the **"Reset Demo Data"** button in the top navigation bar at any time).*

### 6. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Automated Testing

The project includes **21 automated test cases** validating British Auction invariants, mathematical clamping, ranking accuracy, concurrency, and RBAC authorization:

```bash
npm test
```

### 1. British Reverse Auction Suite (14 Assignment Verification Cases)
1. **Case 1**: Valid auction creation passes schema and timing checks.
2. **Case 2**: Invalid forced close (`forcedCloseTime <= bidCloseTime`) is strictly rejected.
3. **Case 3**: Valid quote calculation (Freight + Origin + Destination) and acceptance.
4. **Case 4**: Bid higher than or equal to current L1 is rejected with descriptive error.
5. **Case 5**: Bid placed on an already closed auction is rejected with HTTP 400.
6. **Case 6**: Bid submitted after `forcedCloseTime` is strictly rejected.
7. **Case 7**: Bid placed inside the trigger window is recognized for extension evaluation.
8. **Case 8**: Bid outside trigger window does not trigger auction extension.
9. **Case 9**: `RANK_CHANGE` trigger extension behavior verified.
10. **Case 10**: `L1_CHANGE` trigger extension behavior verified.
11. **Case 11**: Repeated extensions increment close time successively.
12. **Case 12**: Extension is strictly clamped at `forcedCloseTime` ceiling.
13. **Case 13**: Multiple concurrent bids and deterministic tie-breaking by earliest timestamp.
14. **Case 14**: Auction close transitions status to `CLOSED` and locks subsequent bids.

### 2. Role-Based Authentication & Authorization Suite (7 Cases)
1. **Spec 1**: Buyer login with verified credentials and JWT session creation.
2. **Spec 2**: All 5 demo carriers login and verify `SUPPLIER` role authorization.
3. **Spec 3**: Invalid password rejection.
4. **Spec 4**: Unauthenticated session token verification failure.
5. **Spec 5**: Supplier role authorization blocks unauthorized RFQ creation.
6. **Spec 6**: Supplier role authorization blocks unauthorized Auction creation.
7. **Spec 7**: Buyer role authorization blocks unauthorized bid submission.

---

## 🎯 Guided Demonstration & Interview Flow

1. **Procurement Dashboard (`/dashboard`)**:
   - Inspect active auctions, total bids placed, active freight corridors, and aggregate savings.
2. **Switch Persona (Top Navbar)**:
   - Toggle between **Buyer (Sarah Jenkins)** and multiple suppliers:
     - 🚢 **Maersk Line** (Capt. Rajesh Sharma)
     - 🚢 **Hapag-Lloyd Ocean Transport** (Elena Rostova)
     - 🚢 **CMA CGM Freight Solutions** (Jean-Luc Dubois)
     - 🚢 **MSC Mediterranean Shipping** (Marco Rossi)
3. **Open Flagship Auction (`/auctions/[id]`)**:
   - View the live countdown timer, trigger window status, and current L1 leader.
4. **Trigger Dynamic Extension**:
   - Switch persona to **Hapag-Lloyd**.
   - Under the trigger window, submit a lower quote (e.g., Freight `₹74,000` + Origin `₹5,000` + Destination `₹5,000` = `₹84,000`).
   - Observe:
     - Hapag-Lloyd takes **L1 rank**.
     - An **immediate extension** alert pops up.
     - New bid close time increments dynamically.
     - Activity log appends an audit event explaining the trigger.
5. **Supplier Portal (`/suppliers`)**:
   - Switch to Maersk. Notice the prominent **Outbid Warning**: *"Another supplier holds L1. Submit a lower quote to reclaim rank!"*
6. **Forced Close Invariant**:
   - Fast-forward to `forcedCloseTime`. The timer changes to `AUCTION CLOSED`.
   - Submit a bid to verify server-side rejection with HTTP 400.

---

## 📄 License & Attribution

Designed and engineered for high-stakes enterprise freight procurement. Licensed under the [MIT License](LICENSE).
