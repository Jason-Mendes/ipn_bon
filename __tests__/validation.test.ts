/**
 * @fileoverview Unit tests for the P2P payment validation schema.
 *
 * Tests every validation rule from the IPN Mock API Specification (Section 5):
 * - clientReference: non-empty
 * - senderAccountNumber: numeric only, min 10 digits
 * - receiverAccountNumber: numeric only, min 10 digits, different from sender
 * - amount: must be > 0, rounded to 2 decimal places
 * - currency: must be "NAD"
 * - reference: non-empty, max 50 chars
 */

import { describe, it, expect } from "vitest";
import { paymentRequestSchema, mapZodErrorToIpnCode } from "@/lib/validation";

/** A valid request payload that passes all validations. */
const validPayload = {
  clientReference: "REF-20260315-abc12",
  senderAccountNumber: "1234567890",
  receiverAccountNumber: "0987654321",
  amount: 150.0,
  currency: "NAD",
  reference: "Lunch payment",
};

describe("paymentRequestSchema", () => {
  // -----------------------------------------------------------------------
  // Happy Path
  // -----------------------------------------------------------------------

  it("accepts a valid payment request", () => {
    const result = paymentRequestSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rounds amount to 2 decimal places", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      amount: 150.999,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(151.0);
    }
  });

  it("preserves leading zeros in account numbers", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      receiverAccountNumber: "0000000001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.receiverAccountNumber).toBe("0000000001");
    }
  });

  // -----------------------------------------------------------------------
  // clientReference
  // -----------------------------------------------------------------------

  it("rejects empty clientReference", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      clientReference: "",
    });
    expect(result.success).toBe(false);
  });

  // -----------------------------------------------------------------------
  // senderAccountNumber
  // -----------------------------------------------------------------------

  it("rejects sender account number shorter than 10 digits", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      senderAccountNumber: "123456789",
    });
    expect(result.success).toBe(false);
  });

  it("rejects sender account number with letters", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      senderAccountNumber: "12345ABCDE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects sender account number with special characters", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      senderAccountNumber: "123-456-7890",
    });
    expect(result.success).toBe(false);
  });

  it("accepts sender account number with exactly 10 digits", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      senderAccountNumber: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("accepts sender account number longer than 10 digits", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      senderAccountNumber: "12345678901234",
    });
    expect(result.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // receiverAccountNumber
  // -----------------------------------------------------------------------

  it("rejects receiver account number shorter than 10 digits", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      receiverAccountNumber: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejects receiver account number with letters", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      receiverAccountNumber: "ABCDEFGHIJ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when sender and receiver are the same", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      senderAccountNumber: "1234567890",
      receiverAccountNumber: "1234567890",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "Sender and receiver account numbers must be different"
      );
    }
  });

  // -----------------------------------------------------------------------
  // amount
  // -----------------------------------------------------------------------

  it("rejects amount of 0", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      amount: -50,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a small positive amount", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      amount: 0.01,
    });
    expect(result.success).toBe(true);
  });

  it("rejects amount as string", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      amount: "150",
    });
    expect(result.success).toBe(false);
  });

  // -----------------------------------------------------------------------
  // currency
  // -----------------------------------------------------------------------

  it("rejects currency other than NAD", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      currency: "USD",
    });
    expect(result.success).toBe(false);
  });

  it("rejects lowercase nad", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      currency: "nad",
    });
    expect(result.success).toBe(false);
  });

  it("accepts NAD", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      currency: "NAD",
    });
    expect(result.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // reference
  // -----------------------------------------------------------------------

  it("rejects empty reference", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      reference: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects reference longer than 50 characters", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      reference: "A".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("accepts reference with exactly 50 characters", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      reference: "A".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Missing fields
  // -----------------------------------------------------------------------

  it("rejects when all fields are missing", () => {
    const result = paymentRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Error Code Mapping
// ---------------------------------------------------------------------------

describe("mapZodErrorToIpnCode", () => {
  it("maps currency errors to ERR003", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      currency: "USD",
    });
    if (!result.success) {
      expect(mapZodErrorToIpnCode(result.error.issues)).toBe("ERR003");
    }
  });

  it("maps amount errors to ERR004", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      amount: -1,
    });
    if (!result.success) {
      expect(mapZodErrorToIpnCode(result.error.issues)).toBe("ERR004");
    }
  });

  it("maps account number format errors to ERR002", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      senderAccountNumber: "ABCDEFGHIJ",
    });
    if (!result.success) {
      expect(mapZodErrorToIpnCode(result.error.issues)).toBe("ERR002");
    }
  });

  it("maps missing reference to ERR001", () => {
    const result = paymentRequestSchema.safeParse({
      ...validPayload,
      reference: "",
    });
    if (!result.success) {
      expect(mapZodErrorToIpnCode(result.error.issues)).toBe("ERR001");
    }
  });
});
