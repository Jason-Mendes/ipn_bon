"use client";

/**
 * @fileoverview Main page for the IPN P2P Payment application.
 *
 * Orchestrates the two main views:
 * 1. Payment Form — captures and validates payment details
 * 2. Transaction Result — displays the API response
 *
 * Uses a simple state machine: "form" → (submit) → "result" → (reset) → "form"
 */

import { useState, useCallback } from "react";
import type { P2PPaymentResponse } from "@/lib/types";
import PaymentForm from "@/components/PaymentForm";
import TransactionResult from "@/components/TransactionResult";

/** The two views this page can show. */
type View = "form" | "result";

export default function Home() {
  const [view, setView] = useState<View>("form");
  const [lastResponse, setLastResponse] = useState<P2PPaymentResponse | null>(
    null
  );
  const [lastClientReference, setLastClientReference] = useState("");

  /** Called when the form receives an API response. */
  const handleResult = useCallback(
    (response: P2PPaymentResponse, clientReference: string) => {
      setLastResponse(response);
      setLastClientReference(clientReference);
      setView("result");
    },
    []
  );

  /** Called when the user wants to make another payment. */
  const handleReset = useCallback(() => {
    setLastResponse(null);
    setLastClientReference("");
    setView("form");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-ipn-navy text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            {/* IPN Logo Placeholder */}
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                Instant Payments Namibia
              </h1>
              <p className="text-sm text-white/70">
                P2P Payment Portal
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white border border-ipn-border rounded-xl shadow-sm p-6 md:p-8">
          {/* Section Title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-ipn-navy">
              {view === "form"
                ? "Person-to-Person Payment"
                : "Transaction Result"}
            </h2>
            <p className="text-sm text-ipn-muted mt-1">
              {view === "form"
                ? "Enter the payment details below to initiate a P2P transfer in NAD."
                : "Your payment has been processed. See the details below."}
            </p>
          </div>

          {/* Form or Result */}
          {view === "form" ? (
            <PaymentForm onResult={handleResult} />
          ) : lastResponse ? (
            <TransactionResult
              response={lastResponse}
              clientReference={lastClientReference}
              onReset={handleReset}
            />
          ) : null}
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-ipn-muted mt-8 pb-4">
          <p>IPN Developer Integration Challenge — Mock Implementation</p>
          <p className="mt-1">
            This is a simulated environment. No real payments are processed.
          </p>
        </footer>
      </main>
    </div>
  );
}
