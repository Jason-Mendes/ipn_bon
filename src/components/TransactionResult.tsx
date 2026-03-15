"use client";

/**
 * @fileoverview Transaction result display component.
 *
 * Shows the outcome of a P2P payment transaction after the API responds.
 * Displays success (green) or failure (red) with all relevant details:
 * - Transaction status
 * - Transaction ID (success only)
 * - Client reference (always)
 * - Error code and message (failure only)
 *
 * Includes a "Make Another Payment" button to reset the form.
 */

import type { P2PPaymentResponse } from "@/lib/types";

/**
 * Props for the TransactionResult component.
 *
 * @param response - The API response to display
 * @param clientReference - The client-generated reference for this transaction
 * @param onReset - Callback to return to the payment form
 */
interface TransactionResultProps {
  response: P2PPaymentResponse;
  clientReference: string;
  onReset: () => void;
}

/**
 * Displays the outcome of a P2P payment transaction.
 *
 * Renders a success card (green) or failure card (red) based on the
 * API response status. All four response fields from the IPN spec
 * are displayed: status, transactionId, errorCode, and message.
 *
 * Uses `role="alert"` for screen reader accessibility — the result
 * is announced immediately when it appears.
 */
export default function TransactionResult({
  response,
  clientReference,
  onReset,
}: TransactionResultProps) {
  const isSuccess = response.status === "SUCCESS";

  return (
    <div role="alert" className="space-y-4">
      {/* Status Header */}
      <div
        className={`rounded-lg p-6 text-center ${
          isSuccess
            ? "bg-ipn-success-light border border-ipn-success/20"
            : "bg-ipn-error-light border border-ipn-error/20"
        }`}
      >
        {/* Status Icon */}
        <div className="flex justify-center mb-3">
          {isSuccess ? (
            <svg
              className="h-12 w-12 text-ipn-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="h-12 w-12 text-ipn-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        <h2
          className={`text-xl font-semibold ${
            isSuccess ? "text-ipn-success" : "text-ipn-error"
          }`}
        >
          Payment {isSuccess ? "Successful" : "Failed"}
        </h2>
        <p className="text-sm text-ipn-muted mt-1">{response.message}</p>
      </div>

      {/* Transaction Details */}
      <div className="bg-white border border-ipn-border rounded-lg divide-y divide-ipn-border">
        {/* Status */}
        <DetailRow label="Status" value={response.status} />

        {/* Transaction ID (success only) */}
        {response.transactionId && (
          <DetailRow label="Transaction ID" value={response.transactionId} mono />
        )}

        {/* Client Reference */}
        <DetailRow label="Client Reference" value={clientReference} mono />

        {/* Error Code (failure only) */}
        {response.errorCode && (
          <DetailRow label="Error Code" value={response.errorCode} />
        )}

        {/* Response Message */}
        <DetailRow label="Message" value={response.message} />
      </div>

      {/* Action Button */}
      <button
        onClick={onReset}
        className="w-full bg-ipn-navy hover:bg-ipn-navy/90 text-white font-medium py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ipn-navy focus:ring-offset-2"
      >
        Make Another Payment
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Row Sub-Component
// ---------------------------------------------------------------------------

/**
 * A single row in the transaction details table.
 *
 * @param label - The field label (left side)
 * @param value - The field value (right side)
 * @param mono - If true, renders the value in monospace font (for IDs/references)
 */
function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-ipn-muted">{label}</span>
      <span
        className={`text-sm font-medium ${mono ? "font-mono text-ipn-navy" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
