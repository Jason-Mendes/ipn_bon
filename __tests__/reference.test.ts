/**
 * @fileoverview Unit tests for reference generators.
 *
 * Tests format correctness and uniqueness guarantees for:
 * - generateClientReference(): REF-YYYYMMDD-XXXXX
 * - generateTransactionId(): TXN-YYYYMMDDHHMMSS-NNNN
 */

import { describe, it, expect } from "vitest";
import {
  generateClientReference,
  generateTransactionId,
} from "@/utils/reference";

describe("generateClientReference", () => {
  it("returns a string starting with REF-", () => {
    const ref = generateClientReference();
    expect(ref).toMatch(/^REF-/);
  });

  it("matches the expected format REF-YYYYMMDD-XXXXX", () => {
    const ref = generateClientReference();
    expect(ref).toMatch(/^REF-\d{8}-[a-f0-9]{5}$/);
  });

  it("includes today's date in the reference", () => {
    const ref = generateClientReference();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const expectedDate = `${year}${month}${day}`;
    expect(ref).toContain(expectedDate);
  });

  it("generates unique references across multiple calls", () => {
    const refs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      refs.add(generateClientReference());
    }
    // With 5 hex chars (1M possibilities), 100 calls should all be unique
    expect(refs.size).toBe(100);
  });
});

describe("generateTransactionId", () => {
  it("returns a string starting with TXN-", () => {
    const txn = generateTransactionId();
    expect(txn).toMatch(/^TXN-/);
  });

  it("matches the expected format TXN-YYYYMMDDHHMMSS-NNNN", () => {
    const txn = generateTransactionId();
    expect(txn).toMatch(/^TXN-\d{14}-\d{4}$/);
  });

  it("generates sequential counter values", () => {
    const txn1 = generateTransactionId();
    const txn2 = generateTransactionId();

    // Extract counter portion (last 4 digits)
    const counter1 = parseInt(txn1.split("-").pop()!, 10);
    const counter2 = parseInt(txn2.split("-").pop()!, 10);

    expect(counter2).toBe(counter1 + 1);
  });
});
