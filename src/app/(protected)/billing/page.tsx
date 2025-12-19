"use client";

import { useState } from "react";
import {
  CreditCard,
  ArrowRight,
  Check,
  X,
  Coins,
  Sparkles,
  TrendingUp,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Credit packages
const CREDIT_PACKAGES = [
  { amount: 50, credits: 50, popular: false },
  { amount: 100, credits: 100, popular: true },
  { amount: 500, credits: 500, popular: false },
  { amount: 1000, credits: 1000, popular: false },
];

export default function BillingPage() {
  const [selectedPackage, setSelectedPackage] = useState(1); // Default to 100
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showDecline, setShowDecline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [creditsAdded, setCreditsAdded] = useState<number>(0);

  const { data: credits, refetch: refetchCredits } = api.project.getMyCredits.useQuery();
  const utils = api.useUtils();

  const selectedPkg = CREDIT_PACKAGES[selectedPackage]!;

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selectedPkg.amount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create order");
      }

      const { orderId, amount: orderAmount, currency } = await response.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderAmount,
        currency: currency,
        name: "CodeContext",
        description: `Purchase ${selectedPkg.credits} Credits`,
        order_id: orderId,
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            const verifyResponse = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyResponse.ok) {
              const result = await verifyResponse.json();
              setCreditsAdded(result.credits);
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 5000);
              // Refetch credits
              await refetchCredits();
              await utils.project.getMyCredits.invalidate();
            } else {
              throw new Error("Verification failed");
            }
          } catch {
            setShowDecline(true);
            setTimeout(() => setShowDecline(false), 5000);
          }
        },
        theme: {
          color: "#18181b",
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function () {
        setShowDecline(true);
        setTimeout(() => setShowDecline(false), 5000);
      });
      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      setShowDecline(true);
      setTimeout(() => setShowDecline(false), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="min-h-screen p-4 md:p-8">
        {/* Notification Alerts */}
        <div className="pointer-events-none fixed top-6 right-0 left-0 z-50 flex justify-center">
          <AnimatePresence mode="wait">
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="pointer-events-auto flex items-center gap-3 rounded-xl border bg-card px-6 py-3 shadow-xl"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Payment Successful!</p>
                  <p className="text-xs text-muted-foreground">
                    +{creditsAdded} credits added
                  </p>
                </div>
              </motion.div>
            )}

            {showDecline && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="pointer-events-auto flex items-center gap-3 rounded-xl border bg-card px-6 py-3 shadow-xl"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-white">
                  <X className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Payment Failed</p>
                  <p className="text-xs text-muted-foreground">
                    Please try again
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
            <p className="text-muted-foreground">
              Manage your credits and subscription
            </p>
          </div>

          {/* Credit Balance Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Current Balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight">
                  {credits ?? 0}
                </span>
                <span className="text-xl text-muted-foreground">credits</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>50 credits per project</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>1 credit per question</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Packages */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Buy Credits</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {CREDIT_PACKAGES.map((pkg, index) => (
                <motion.div
                  key={pkg.amount}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      "relative cursor-pointer transition-all",
                      selectedPackage === index
                        ? "border-2 border-primary ring-2 ring-primary/20"
                        : "hover:border-primary/50"
                    )}
                    onClick={() => setSelectedPackage(index)}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                          <Sparkles className="h-3 w-3" />
                          Popular
                        </span>
                      </div>
                    )}
                    <CardContent className="p-4 pt-6 text-center">
                      <div className="mb-2 text-3xl font-bold">
                        {pkg.credits}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        credits
                      </div>
                      <div className="mt-3 text-lg font-semibold">
                        ₹{pkg.amount}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Purchase Button */}
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-lg font-semibold">
                  {selectedPkg.credits} Credits
                </p>
                <p className="text-sm text-muted-foreground">
                  ₹{selectedPkg.amount} • Instant delivery
                </p>
              </div>
              <Button
                size="lg"
                onClick={handlePayment}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Purchase
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Security Footer */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>Secured by Razorpay • PCI DSS Compliant</span>
          </div>
        </div>
      </div>
    </>
  );
}
