# British Reverse Auction Engine: Mechanics & Business Logic Specification

## 1. Executive Summary

In a procurement **British Reverse Auction**, suppliers submit descending price quotes to compete for the business of a buyer. Unlike traditional English forward auctions (where prices climb), British reverse auctions drive prices **downward**.

The core innovation of the British Auction is its **dynamic extension mechanism** balanced with a **hard immutable Forced Bid Close Time**. This ensures that buyers achieve true market price discovery by preventing last-second "bid sniping", while providing suppliers and buyers an absolute upper bound on auction duration.

---

## 2. Core Timing & Extension Formula

Every British Auction is defined by four core temporal parameters:

| Parameter | Symbol | Description |
|---|---|---|
| **Bid Start Time** | $T_{start}$ | Timestamp when suppliers can begin submitting quotes |
| **Current Bid Close Time** | $T_{close}$ | Dynamic deadline that extends upon qualifying activity |
| **Forced Close Time** | $T_{forced}$ | Hard, immutable ceiling time beyond which no extension can ever occur |
| **Trigger Window** | $W_{trigger}$ | Window in minutes immediately preceding $T_{close}$ ($[T_{close} - W_{trigger}, T_{close})$) |
| **Extension Duration** | $\Delta_{ext}$ | Duration in minutes to extend $T_{close}$ upon a qualifying event |

### The Invariant Extension Rule

$$T_{close}^{new} = \min\left(T_{close}^{current} + \Delta_{ext}, \; T_{forced}\right)$$

This mathematical inequality guarantees:
1. **Never exceed forced close**: $T_{close}^{new} \le T_{forced}$ under all circumstances.
2. **Deterministic extensions**: When $T_{close}^{current} + \Delta_{ext} > T_{forced}$, the extension is truncated to exactly $T_{forced}$.
3. **Closure Finality**: Once $now \ge T_{forced}$ (or $now \ge T_{close}$ with no qualifying bids in the trigger window), the auction transitions to `CLOSED` or `FORCE_CLOSED`, and no further bids are accepted.

---

## 3. Extension Triggers

The system supports three configurable trigger modes:

### Mode A: `BID_RECEIVED`
- **Rule**: Any valid bid placed within the trigger window $[T_{close} - W_{trigger}, T_{close})$ triggers an auction extension.
- **Use Case**: Maximum liquidity and participation. Encourages active bidding up to the final minute.

### Mode B: `RANK_CHANGE`
- **Rule**: An extension occurs only if a valid bid submitted in the trigger window causes **any shift** in the supplier leaderboard (e.g. an L3 supplier lowers their price to take L2, or a new supplier enters the ranking).
- **Use Case**: Extends only when competitive positioning shifts, filtering out bids that don't alter supplier rankings.

### Mode C: `L1_CHANGE`
- **Rule**: An extension occurs strictly when the **L1 lowest bidder changes hands** during the trigger window.
- **Example**:
  - Supplier A = ₹100,000 (L1)
  - Supplier B = ₹105,000 (L2)
  - Supplier B submits ₹98,000 in the trigger window.
  - Supplier B becomes the new L1, displacing Supplier A.
  - **Extension Triggered!**
  - Conversely, if Supplier B submits ₹101,000 (improving their quote but remaining L2 behind Supplier A's ₹100,000), no extension occurs.

---

## 4. Step-by-Step Concrete Walkthrough

Consider an auction configured as follows:
- **Bid Close Time**: 6:00 PM
- **Trigger Window**: 10 minutes (Monitored window: 5:50 PM → 6:00 PM)
- **Extension Duration**: 5 minutes
- **Forced Close Time**: 6:30 PM
- **Mode**: `L1_CHANGE`

```
Initial State:
L1: ABC Logistics     ₹100,000
L2: Fast Cargo        ₹105,000
Current Close:        6:00 PM
Trigger Window:       5:50 PM - 6:00 PM
Forced Close Ceiling: 6:30 PM
```

### Event 1: Bid submitted at 5:45 PM
- **Action**: Fast Cargo submits ₹99,000 (becomes L1).
- **Evaluation**: The bid occurred at 5:45 PM, which is **before** the trigger window (5:50 PM).
- **Result**:
  - Fast Cargo is now L1 (₹99,000).
  - **No extension occurs**. Close time remains 6:00 PM.

---

### Event 2: Bid submitted at 5:55 PM
- **Action**: ABC Logistics submits ₹96,000 (reclaims L1).
- **Evaluation**:
  - Timestamp: 5:55 PM is inside the 5:50 PM → 6:00 PM trigger window.
  - L1 changed from Fast Cargo back to ABC Logistics.
  - Trigger condition (`L1_CHANGE`) satisfied!
- **Calculation**:
  $$T_{close}^{new} = \min(6:00\text{ PM} + 5\text{ mins}, \; 6:30\text{ PM}) = 6:05\text{ PM}$$
- **Result**:
  - **Auction extended to 6:05 PM**.
  - New trigger window becomes 5:55 PM → 6:05 PM.

---

### Event 3: Repeated Extension at 6:02 PM
- **Action**: Fast Cargo submits ₹94,000.
- **Evaluation**:
  - Timestamp: 6:02 PM is inside the 5:55 PM → 6:05 PM window.
  - Fast Cargo becomes L1.
- **Calculation**:
  $$T_{close}^{new} = \min(6:05\text{ PM} + 5\text{ mins}, \; 6:30\text{ PM}) = 6:10\text{ PM}$$
- **Result**:
  - **Auction extended to 6:10 PM**.

---

### Event 4: Hitting the Forced Close Ceiling at 6:28 PM
Assume competitive bidding continues and the close time has repeatedly extended to **6:27 PM**.
- **Action**: At 6:26 PM, a new qualifying bid is submitted.
- **Calculation**:
  $$T_{close}^{new} = \min(6:27\text{ PM} + 5\text{ mins}, \; 6:30\text{ PM}) = \min(6:32\text{ PM}, \; 6:30\text{ PM}) = 6:30\text{ PM}$$
- **Result**:
  - The extension is capped at **6:30 PM** (the Forced Close Time).
  - Activity log notes: *"Auction extended by 3m (capped exactly at Forced Close: 6:30:00 PM)"*.

---

### Event 5: Bidding after Forced Close (6:30:01 PM)
- **Action**: Supplier submits ₹90,000 at 6:30:01 PM.
- **Evaluation**: Current server time exceeds $T_{forced}$.
- **Result**:
  - Bid is **strictly rejected** with HTTP 400: *"Auction has reached its forced close time. Bidding has permanently concluded."*
  - Auction transitions to `FORCE_CLOSED`.

---

## 5. Ranking and Tie-Breaking Algorithm

1. **Total Price Calculation**:
   $$\text{Total Price} = \text{Freight Charges} + \text{Origin Charges} + \text{Destination Charges}$$
2. **Supplier Best Bid Selection**:
   Only each supplier's single lowest bid is ranked.
3. **Ascending Price Ordering**:
   Suppliers are sorted by lowest Total Price first (L1 = lowest price).
4. **Deterministic Tie-Breaking**:
   If two suppliers submit identical total quotes, the quote submitted with the **earlier server timestamp (`createdAt`)** is ranked ahead.
