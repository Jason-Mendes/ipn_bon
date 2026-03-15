"use client";

/**
 * @fileoverview Payment form component for capturing P2P payment details.
 *
 * This component provides the user interface for initiating a P2P payment.
 * It handles:
 * - Auto-generation of the client reference (displayed but not editable)
 * - Client-side validation using the shared Zod schema
 * - Form submission to the mock API endpoint
 * - Loading state and double-submission prevention
 * - Accessible form fields with proper labels and error messages
 */

import { useState, useCallback, useId } from "react";
import type { P2PPaymentResponse } from "@/lib/types";
import { paymentRequestSchema } from "@/lib/validation";
import { generateClientReference } from "@/utils/reference";

/**
 * Props for the PaymentForm component.
 *
 * @param onResult - Callback fired when the API responds (success or failure)
 */
interface PaymentFormProps {
  onResult: (response: P2PPaymentResponse, clientReference: string) => void;
}

/** Shape of per-field validation errors displayed inline. */
interface FieldErrors {
  senderAccountNumber?: string;
  receiverAccountNumber?: string;
  amount?: string;
  reference?: string;
}

/**
 * Payment form for capturing P2P payment details.
 *
 * Features:
 * - Auto-generated client reference (REF-YYYYMMDD-XXXXX format)
 * - Currency locked to NAD (read-only)
 * - Inline validation errors per field
 * - Loading state with disabled submit button
 * - Double-submission prevention
 *
 * @param props - Component props
 * @param props.onResult - Callback when API responds
 */
export default function PaymentForm({ onResult }: PaymentFormProps) {
  // Unique IDs for accessible form labels
  const formId = useId();

  // Form field state
  const [senderAccountNumber, setSenderAccountNumber] = useState("");
  const [receiverAccountNumber, setReceiverAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  // UI state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Validates all form fields using the shared Zod schema and submits
   * to the mock API if validation passes.
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});
      setSubmitError(null);

      // Generate a fresh client reference for each submission
      const clientReference = generateClientReference();

      // Build the request payload
      const payload = {
        clientReference,
        senderAccountNumber: senderAccountNumber.trim(),
        receiverAccountNumber: receiverAccountNumber.trim(),
        amount: parseFloat(amount),
        currency: "NAD",
        reference: reference.trim(),
      };

      // ---- Client-side validation (UX) ----
      const validation = paymentRequestSchema.safeParse(payload);
      if (!validation.success) {
        const errors: FieldErrors = {};
        for (const issue of validation.error.issues) {
          const field = issue.path[0] as keyof FieldErrors | undefined;
          if (field && field in errors === false) {
            errors[field] = issue.message;
          }
        }
        setFieldErrors(errors);
        return;
      }

      // ---- Submit to API ----
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/p2p-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data: P2PPaymentResponse = await response.json();
        onResult(data, clientReference);
      } catch {
        setSubmitError(
          "Failed to connect to the payment server. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [senderAccountNumber, receiverAccountNumber, amount, reference, onResult]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Client Reference (auto-generated, read-only) */}
      <div>
        <label
          htmlFor={`${formId}-clientRef`}
          className="block text-sm font-medium text-ipn-muted mb-1"
        >
          Client Reference
        </label>
        <p
          id={`${formId}-clientRef`}
          className="text-sm text-ipn-muted italic bg-gray-50 border border-ipn-border rounded-lg px-4 py-2.5"
        >
          Auto-generated on submission
        </p>
      </div>

      {/* Sender Account Number */}
      <div>
        <label
          htmlFor={`${formId}-sender`}
          className="block text-sm font-medium text-ipn-navy mb-1"
        >
          Sender Account Number <span className="text-ipn-error">*</span>
        </label>
        <input
          id={`${formId}-sender`}
          type="text"
          inputMode="numeric"
          placeholder="e.g. 1234567890"
          value={senderAccountNumber}
          onChange={(e) => setSenderAccountNumber(e.target.value)}
          aria-invalid={!!fieldErrors.senderAccountNumber}
          aria-describedby={
            fieldErrors.senderAccountNumber
              ? `${formId}-sender-error`
              : undefined
          }
          className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ipn-blue ${
            fieldErrors.senderAccountNumber
              ? "border-ipn-error bg-ipn-error-light"
              : "border-ipn-border hover:border-ipn-blue"
          }`}
          disabled={isSubmitting}
        />
        {fieldErrors.senderAccountNumber && (
          <p
            id={`${formId}-sender-error`}
            className="text-sm text-ipn-error mt-1"
            role="alert"
          >
            {fieldErrors.senderAccountNumber}
          </p>
        )}
      </div>

      {/* Receiver Account Number */}
      <div>
        <label
          htmlFor={`${formId}-receiver`}
          className="block text-sm font-medium text-ipn-navy mb-1"
        >
          Receiver Account Number <span className="text-ipn-error">*</span>
        </label>
        <input
          id={`${formId}-receiver`}
          type="text"
          inputMode="numeric"
          placeholder="e.g. 0987654321"
          value={receiverAccountNumber}
          onChange={(e) => setReceiverAccountNumber(e.target.value)}
          aria-invalid={!!fieldErrors.receiverAccountNumber}
          aria-describedby={
            fieldErrors.receiverAccountNumber
              ? `${formId}-receiver-error`
              : undefined
          }
          className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ipn-blue ${
            fieldErrors.receiverAccountNumber
              ? "border-ipn-error bg-ipn-error-light"
              : "border-ipn-border hover:border-ipn-blue"
          }`}
          disabled={isSubmitting}
        />
        {fieldErrors.receiverAccountNumber && (
          <p
            id={`${formId}-receiver-error`}
            className="text-sm text-ipn-error mt-1"
            role="alert"
          >
            {fieldErrors.receiverAccountNumber}
          </p>
        )}
      </div>

      {/* Amount + Currency (side by side) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label
            htmlFor={`${formId}-amount`}
            className="block text-sm font-medium text-ipn-navy mb-1"
          >
            Amount <span className="text-ipn-error">*</span>
          </label>
          <input
            id={`${formId}-amount`}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 150.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!!fieldErrors.amount}
            aria-describedby={
              fieldErrors.amount ? `${formId}-amount-error` : undefined
            }
            className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ipn-blue ${
              fieldErrors.amount
                ? "border-ipn-error bg-ipn-error-light"
                : "border-ipn-border hover:border-ipn-blue"
            }`}
            disabled={isSubmitting}
          />
          {fieldErrors.amount && (
            <p
              id={`${formId}-amount-error`}
              className="text-sm text-ipn-error mt-1"
              role="alert"
            >
              {fieldErrors.amount}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`${formId}-currency`}
            className="block text-sm font-medium text-ipn-navy mb-1"
          >
            Currency
          </label>
          <input
            id={`${formId}-currency`}
            type="text"
            value="NAD"
            readOnly
            className="w-full border border-ipn-border bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-ipn-muted cursor-not-allowed"
            tabIndex={-1}
          />
        </div>
      </div>

      {/* Payment Reference */}
      <div>
        <label
          htmlFor={`${formId}-reference`}
          className="block text-sm font-medium text-ipn-navy mb-1"
        >
          Payment Reference <span className="text-ipn-error">*</span>
        </label>
        <input
          id={`${formId}-reference`}
          type="text"
          maxLength={50}
          placeholder="e.g. Lunch payment"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          aria-invalid={!!fieldErrors.reference}
          aria-describedby={
            fieldErrors.reference ? `${formId}-reference-error` : undefined
          }
          className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ipn-blue ${
            fieldErrors.reference
              ? "border-ipn-error bg-ipn-error-light"
              : "border-ipn-border hover:border-ipn-blue"
          }`}
          disabled={isSubmitting}
        />
        <div className="flex justify-between mt-1">
          {fieldErrors.reference ? (
            <p
              id={`${formId}-reference-error`}
              className="text-sm text-ipn-error"
              role="alert"
            >
              {fieldErrors.reference}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-ipn-muted">
            {reference.length}/50
          </span>
        </div>
      </div>

      {/* Submit Error (network failure, etc.) */}
      {submitError && (
        <div
          className="bg-ipn-error-light border border-ipn-error text-ipn-error rounded-lg px-4 py-3 text-sm"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-ipn-blue hover:bg-ipn-blue-dark text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ipn-blue focus:ring-offset-2"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing Payment...
          </span>
        ) : (
          "Submit Payment"
        )}
      </button>
    </form>
  );
}
