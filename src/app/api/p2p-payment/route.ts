/**
 * @fileoverview Mock API endpoint for P2P payment processing.
 *
 * POST /api/p2p-payment
 *
 * This simulates the IPN (Instant Payments Namibia) payment processing API.
 * In a real system, this endpoint would:
 * 1. Authenticate the request (JWT, API key, mTLS)
 * 2. Validate the payload against the schema
 * 3. Check account balances via the core banking system
 * 4. Submit the payment to the national payment switch
 * 5. Return the transaction result
 *
 * Our mock implementation validates the payload and simulates business logic
 * (insufficient funds, duplicate detection, internal errors) to exercise
 * all 6 error codes defined in the IPN spec.
 *
 * @see IPN Mock API Specification — Sections 2–10
 */

import { NextResponse } from "next/server";
import type { P2PPaymentResponse } from "@/lib/types";
import {
  ERROR_CODES,
  INSUFFICIENT_FUNDS_THRESHOLD,
  FORCE_ERROR_SUFFIX,
} from "@/lib/types";
import { paymentRequestSchema, mapZodErrorToIpnCode } from "@/lib/validation";
import { generateTransactionId } from "@/utils/reference";

// ---------------------------------------------------------------------------
// In-Memory State (Duplicate Detection)
// ---------------------------------------------------------------------------

/**
 * Tracks previously seen client references to detect duplicate submissions.
 *
 * In a real system, this would be a database table or distributed cache
 * (Redis, DynamoDB). Our in-memory Set resets when the server restarts,
 * which is acceptable for a mock implementation.
 *
 * @see ASSUMPTIONS.md — "Duplicate clientReference detection"
 */
const seenClientReferences = new Set<string>();

// ---------------------------------------------------------------------------
// Helper: Build Error Response
// ---------------------------------------------------------------------------

/**
 * Constructs a standardized IPN error response.
 *
 * @param errorCode - The IPN error code (ERR001–ERR006)
 * @param message - Optional custom message (defaults to the code's description)
 * @returns A NextResponse with the correct HTTP status and JSON body
 */
function errorResponse(
  errorCode: keyof typeof ERROR_CODES,
  message?: string
): NextResponse<P2PPaymentResponse> {
  const { httpStatus, description } = ERROR_CODES[errorCode];
  return NextResponse.json(
    {
      status: "FAILED" as const,
      errorCode,
      transactionId: null,
      message: message ?? description,
    },
    { status: httpStatus }
  );
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

/**
 * Handles POST requests to /api/p2p-payment.
 *
 * Validation order (cheapest checks first):
 * 1. Parse JSON body (malformed JSON → ERR006)
 * 2. Schema validation with Zod (→ ERR001, ERR002, ERR003, ERR004)
 * 3. Duplicate clientReference check (→ ERR001)
 * 4. Business logic: insufficient funds simulation (→ ERR005)
 * 5. Deterministic error simulation via -ERR suffix (→ ERR006)
 * 6. Success → generate transactionId and return
 *
 * @param request - The incoming HTTP request
 * @returns JSON response matching the IPN P2PPaymentResponse schema
 */
export async function POST(
  request: Request
): Promise<NextResponse<P2PPaymentResponse>> {
  // -----------------------------------------------------------------------
  // Step 1: Parse JSON body
  // -----------------------------------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("ERR006", "Invalid JSON in request body");
  }

  // -----------------------------------------------------------------------
  // Step 2: Validate against schema
  // -----------------------------------------------------------------------
  const result = paymentRequestSchema.safeParse(body);

  if (!result.success) {
    const errorCode = mapZodErrorToIpnCode(result.error.issues);
    const firstMessage = result.error.issues[0]?.message ?? "Validation failed";
    return errorResponse(errorCode, firstMessage);
  }

  const validatedData = result.data;

  // -----------------------------------------------------------------------
  // Step 3: Check for duplicate clientReference
  // -----------------------------------------------------------------------
  if (seenClientReferences.has(validatedData.clientReference)) {
    return errorResponse(
      "ERR001",
      `Duplicate client reference: ${validatedData.clientReference}`
    );
  }

  // -----------------------------------------------------------------------
  // Step 4: Business logic — insufficient funds simulation
  // Amounts over 10,000 NAD trigger ERR005.
  // See ASSUMPTIONS.md for reasoning.
  // -----------------------------------------------------------------------
  if (validatedData.amount > INSUFFICIENT_FUNDS_THRESHOLD) {
    return errorResponse(
      "ERR005",
      `Insufficient funds. Amount ${validatedData.amount.toFixed(2)} NAD exceeds available balance`
    );
  }

  // -----------------------------------------------------------------------
  // Step 5: Deterministic error simulation
  // If clientReference ends with "-ERR", simulate an internal error.
  // This allows reviewers to test ERR006 handling without randomness.
  // -----------------------------------------------------------------------
  if (validatedData.clientReference.endsWith(FORCE_ERROR_SUFFIX)) {
    return errorResponse(
      "ERR006",
      "Internal processing error — simulated failure"
    );
  }

  // -----------------------------------------------------------------------
  // Step 6: Success — record the reference and return
  // -----------------------------------------------------------------------
  seenClientReferences.add(validatedData.clientReference);

  const response: P2PPaymentResponse = {
    status: "SUCCESS",
    errorCode: null,
    transactionId: generateTransactionId(),
    message: "Payment processed successfully",
  };

  return NextResponse.json(response, { status: 200 });
}
