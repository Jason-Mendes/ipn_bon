# IPN P2P Payment Integration Challenge

A Person-to-Person (P2P) payment application built for the **Instant Payments Namibia (IPN) Developer Integration Challenge**. This application captures payment details, validates them, submits to a mock API endpoint, and displays the transaction outcome.

---

## Setup Instructions

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ipn_bon

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create production build (includes type-checking) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run unit tests |
| `npx tsc --noEmit` | Run TypeScript type-checker |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 15** (App Router) | Full-stack framework — React frontend + API routes for the mock backend |
| **TypeScript** (strict mode) | Type safety at every boundary, critical for financial data handling |
| **Tailwind CSS v4** | Professional banking UI with minimal custom CSS |
| **Zod** | Runtime validation shared between client and server — same rules, can't drift apart |
| **Vitest** | Fast unit tests for validation logic and reference generators |

---

## How the Integration Was Implemented

### Architecture

```
┌─────────────────┐     POST /api/p2p-payment     ┌──────────────────┐
│  React Frontend  │ ────────────────────────────▶ │  Next.js API      │
│                  │     JSON request body          │  Route Handler    │
│  PaymentForm     │                                │                   │
│  - Field inputs  │                                │  1. Parse JSON    │
│  - Zod validation│                                │  2. Zod validation│
│  - Submit handler│                                │  3. Duplicate chk │
│                  │                                │  4. Business logic│
│  TransactionResult◀───────────────────────────── │  5. Return result │
│  - Success/fail  │     JSON response body         │                   │
│  - Details card  │                                │                   │
└─────────────────┘                                └──────────────────┘
```

### Data Flow

1. **User fills the form** — enters sender/receiver account numbers, amount, and reference
2. **Client-side validation** — Zod schema validates all fields with inline error messages
3. **API submission** — form data + auto-generated `clientReference` sent as JSON POST
4. **Server-side validation** — same Zod schema validates again (defense in depth)
5. **Business logic** — checks for insufficient funds, duplicates, error simulation
6. **Response displayed** — success card with transaction ID, or failure card with error details

### Key Design Decisions

- **Account numbers are strings** — preserves leading zeros (e.g., `0987654321`). Converting to `number` would silently corrupt the data.
- **Shared validation schema** — client validates for UX (instant feedback), server validates for security (never trust client data). Same Zod schema ensures they can't diverge.
- **Two separate IDs** — `clientReference` (client-generated, acts as idempotency key) and `transactionId` (server-generated). This is standard in payment systems like SWIFT and Visa Direct.
- **Deterministic error simulation** — ERR005 triggers on amounts > 10,000 NAD, ERR006 triggers when `clientReference` ends with `-ERR`. Predictable and testable.

---

## Assumptions

### Error Simulation

- **ERR005 (Insufficient funds)** — Triggered when `amount > 10,000 NAD`. The spec defines this error code but not when it should fire. In a real system, this would check the sender's account balance against a core banking system. Since database persistence is out of scope, we simulate with a threshold. 10,000 NAD was chosen because it's a round number easy for reviewers to test, and it's realistic — many payment systems enforce per-transaction limits.

- **ERR006 (Internal processing error)** — Triggered deterministically when `clientReference` ends with `-ERR`. Random failures would make testing unreliable. This approach allows reviewers to test error handling on demand. In production, ERR006 would occur naturally from database timeouts or network failures.

### Validation

- **Account numbers are strings, not numbers** — The spec defines them as type `string` with "Numeric only" validation. Real bank account numbers can have leading zeros (e.g., `0987654321` from the spec's sample request). Converting to `number` would silently corrupt the data.

- **Self-transfers blocked** — The spec does not mention whether sender and receiver can be the same. We return ERR002 when `senderAccountNumber === receiverAccountNumber` because real payment systems prevent or flag self-transfers.

- **No maximum account number length** — The spec says minimum 10 digits but no maximum. We accept any length >= 10 with only digits.

- **Amount precision** — Amounts are rounded to 2 decimal places during validation to handle JavaScript IEEE 754 floating-point precision issues (e.g., `0.1 + 0.2 = 0.30000000000000004`). Real financial systems use integer cents or Decimal libraries.

### UI Decisions

- **Currency field is read-only** — Since only "NAD" is valid, the field is pre-filled and not editable. This prevents unnecessary user errors.

- **Client reference is auto-generated** — The spec says it's "generated by the client" (the application), not "entered by the user." Format: `REF-YYYYMMDD-XXXXX` (date + 5 random hex characters for stateless uniqueness).

### API Behaviour

- **Duplicate `clientReference` detection** — Tracked in an in-memory `Set` on the server. Resets when the server restarts. In production, this would use a database with a unique constraint to support idempotent retries.

- **Transaction ID format** — `TXN-YYYYMMDDHHMMSS-NNNN` (timestamp + incrementing counter). Mirrors the spec's sample format with dashes for readability. In production, distributed ID generators (Snowflake, ULID) would guarantee uniqueness across server instances.

- **Validation order** — The API validates cheapest checks first: JSON parsing → schema validation → duplicate check → business logic → success. This mirrors real payment gateway design.

---

## Project Structure

```
ipn_bon/
├── src/
│   ├── app/
│   │   ├── api/p2p-payment/route.ts  — Mock API endpoint (POST handler)
│   │   ├── page.tsx                   — Main page (form ↔ result orchestration)
│   │   ├── layout.tsx                 — Root layout with IPN metadata
│   │   └── globals.css                — IPN banking theme (navy/blue)
│   ├── components/
│   │   ├── PaymentForm.tsx            — Form with inline validation
│   │   └── TransactionResult.tsx      — Success/failure result display
│   ├── lib/
│   │   ├── types.ts                   — TypeScript types + error code constants
│   │   └── validation.ts             — Shared Zod validation schemas
│   └── utils/
│       └── reference.ts               — Client reference + transaction ID generators
├── __tests__/
│   ├── validation.test.ts             — 30 validation rule tests
│   └── reference.test.ts              — Reference format + uniqueness tests
└── README.md                          — This file
```

---

## Testing

The spec does not require tests, but they were included to verify that all validation rules and error code mappings behave correctly. Tests run at the validation boundary — where data enters the system — because that is where bugs in a payment application are most likely to cause real damage. This also makes it easy to demonstrate that each error code (ERR001–ERR006) fires under the right conditions.

Run tests with `npm test` (34 tests, all passing).

### Testing Scenarios

| Scenario | Input | Expected Result |
|---|---|---|
| Valid payment | Amount: 150, valid accounts | SUCCESS with transaction ID |
| Short account number | 9 digits | Inline error: "at least 10 digits" |
| Letters in account | "12345ABCDE" | Inline error: "numeric characters only" |
| Zero amount | 0 | Inline error: "greater than 0" |
| Wrong currency | "USD" | ERR003: Invalid currency |
| Empty reference | (blank) | Inline error: "required" |
| Reference too long | 51+ characters | Inline error: "50 characters or fewer" |
| Amount > 10,000 | 15,000 | ERR005: Insufficient funds |
| Self-transfer | Same sender & receiver | Error: "must be different" |
| Force error | clientReference ending in `-ERR` | ERR006: Internal processing error |

