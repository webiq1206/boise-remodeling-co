"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";

// Load Stripe outside of component to avoid re-initialization
// Check both NEXT_PUBLIC_ (Next.js) and VITE_ (legacy) prefixes for compatibility
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface PaymentFormContentProps {
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  amount: number;
  description?: string;
  isFinalizing?: boolean;
  finalizationError?: string | null;
  chargedPaymentIntentId?: string | null;
  onRetryFinalization?: () => void;
}

function PaymentFormContent({
  onSuccess,
  onCancel,
  amount,
  description,
  isFinalizing,
  finalizationError,
  chargedPaymentIntentId,
  onRetryFinalization,
}: PaymentFormContentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeDone, setStripeDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "An error occurred");
        setIsProcessing(false);
        return;
      }

      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (paymentError) {
        setError(paymentError.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Always release the local processing flag once Stripe confirms,
        // so the modal can never hang on "Processing…" if the back-end
        // call that follows fails or is delayed. The parent's
        // isFinalizing prop drives the next visible state.
        setIsProcessing(false);
        setStripeDone(true);
        onSuccess(paymentIntent.id);
      } else if (paymentIntent?.status === "requires_action") {
        setError("Additional authentication required. Please complete the verification.");
        setIsProcessing(false);
      } else {
        setError("Payment could not be completed. Please try again.");
        setIsProcessing(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsProcessing(false);
    }
  };

  const showFinalizationError = stripeDone && !!finalizationError;
  const showFinalizing = stripeDone && !finalizationError && (isFinalizing ?? false);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">{description || "Payment"}</span>
          <span className="brc-display-num tabular-nums text-lg">${(amount / 100).toFixed(2)}</span>
        </div>

        {!stripeDone && (
          <PaymentElement
            options={{
              layout: "tabs",
            }}
          />
        )}
      </div>

      {error && !stripeDone && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showFinalizationError && (
        <Alert variant="destructive" data-testid="alert-finalization-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">Your card was charged successfully.</p>
            <p>
              We couldn't finish recording your purchase on our end:
              {" "}
              <span className="font-medium">{finalizationError}</span>
            </p>
            {chargedPaymentIntentId && (
              <p className="text-xs">
                Payment reference:
                {" "}
                <span className="font-mono break-all" data-testid="text-charged-payment-intent">
                  {chargedPaymentIntentId}
                </span>
              </p>
            )}
            <p className="text-xs">
              Tap retry to finish recording, or contact support with the
              reference above and we'll reconcile it for you.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        {showFinalizationError ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              data-testid="button-finalization-close"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={onRetryFinalization}
              disabled={isFinalizing || !onRetryFinalization}
              className="flex-1"
              data-testid="button-finalization-retry"
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                "Retry recording purchase"
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing || showFinalizing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || !elements || isProcessing || stripeDone}
              className="flex-1"
            >
              {showFinalizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing your purchase...
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${(amount / 100).toFixed(2)}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

interface StripePaymentFormProps {
  clientSecret: string;
  amount: number;
  description?: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  isFinalizing?: boolean;
  finalizationError?: string | null;
  chargedPaymentIntentId?: string | null;
  onRetryFinalization?: () => void;
}

export function StripePaymentForm({
  clientSecret,
  amount,
  description,
  onSuccess,
  onCancel,
  isFinalizing,
  finalizationError,
  chargedPaymentIntentId,
  onRetryFinalization,
}: StripePaymentFormProps) {
  if (!stripePromise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Payment Configuration Required
          </CardTitle>
          <CardDescription>
            Stripe has not been configured for this environment. Please contact support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              The NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set. 
              Payment processing is unavailable.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={onCancel} className="mt-4 w-full">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Payment
        </CardTitle>
        <CardDescription>
          Enter your payment details to complete your purchase
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              // Dark-only brand: Stripe's night base tuned to the BRC palette
              theme: "night",
              variables: {
                colorPrimary: "#9AA098",      /* sage accent */
                colorBackground: "#1F2321",   /* input field */
                colorText: "#E6E3DE",
                colorTextSecondary: "#9AA098",
                colorDanger: "#C77B6B",
                borderRadius: "8px",
                fontFamily: "Montserrat, system-ui, sans-serif",
              },
            },
          }}
        >
          <PaymentFormContent
            amount={amount}
            description={description}
            onSuccess={onSuccess}
            onCancel={onCancel}
            isFinalizing={isFinalizing}
            finalizationError={finalizationError}
            chargedPaymentIntentId={chargedPaymentIntentId}
            onRetryFinalization={onRetryFinalization}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}

// Loading state component
export function StripePaymentFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Payment Form...
        </CardTitle>
        <CardDescription>
          Please wait while we prepare the secure payment form
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-12 bg-muted animate-pulse rounded-md" />
          <div className="h-12 bg-muted animate-pulse rounded-md" />
          <div className="h-12 bg-muted animate-pulse rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// Success state component
export function PaymentSuccess({ message, onContinue }: { message?: string; onContinue?: () => void }) {
  return (
    <Card className="border-primary/20 dark:border-primary/30">
      <CardContent className="py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground mb-6">
          {message || "Your payment has been processed successfully."}
        </p>
        {onContinue && (
          <Button onClick={onContinue}>
            Continue
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
