"use client";

import { api } from "@/trpc/react";
import { useRefetch } from "@/hooks/use-refetch";
import { toast } from "sonner";
import { CreditCard, Zap } from "lucide-react";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

const PACKAGES = [
  { credits: 50, amount: 50, label: "Starter" },
  { credits: 100, amount: 100, label: "Builder", popular: true },
  { credits: 500, amount: 500, label: "Pro" },
  { credits: 1000, amount: 1000, label: "Scale" },
];

export default function BillingPage() {
  const { data: credits } = api.project.getMyCredits.useQuery();
  const refetch = useRefetch();
  const [loading, setLoading] = useState<number | null>(null);

  async function handlePurchase(pkg: (typeof PACKAGES)[number]) {
    setLoading(pkg.amount);
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pkg.amount }),
      });
      const { orderId, amount } = await res.json() as { orderId: string; amount: number };

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);

      await new Promise((resolve) => (script.onload = resolve));

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: "INR",
        name: "CodeContext",
        description: `${pkg.credits} credits`,
        order_id: orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          if (verifyRes.ok) {
            toast.success(`${pkg.credits} credits added!`);
            await refetch();
          } else {
            toast.error("Payment verification failed.");
          }
        },
        theme: { color: "#7c3aed" },
      });

      rzp.open();
    } catch {
      toast.error("Failed to create order.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-zinc-500 text-sm mt-1">Purchase credits to create projects and ask questions.</p>
      </div>

      {/* Current balance */}
      <div className="glass-strong inline-flex items-center gap-3 rounded-2xl px-6 py-4">
        <Zap className="h-5 w-5 text-sky-400" />
        <div>
          <p className="text-xs text-zinc-500">Current balance</p>
          <p className="text-2xl font-bold text-white">{credits ?? 0} <span className="text-sm font-normal text-zinc-500">credits</span></p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.amount}
            className={`relative glass rounded-2xl p-5 transition-all ${
              pkg.popular ? "border-sky-500/40 glow-sky" : ""
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-3 py-0.5 text-xs font-semibold text-white">
                Popular
              </div>
            )}

            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{pkg.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">
              ₹{pkg.amount}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {pkg.credits} credits
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">1 INR = 1 credit</p>

            <button
              onClick={() => handlePurchase(pkg)}
              disabled={loading === pkg.amount}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600/80 py-2.5 text-sm font-medium text-white transition-all hover:bg-sky-600 disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              {loading === pkg.amount ? "Processing…" : "Buy now"}
            </button>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-4 text-xs text-zinc-600 space-y-1">
        <p>• 50 credits to create a project</p>
        <p>• 1 credit per Q&A question</p>
        <p>• New accounts start with 150 free credits</p>
        <p>• Credits never expire</p>
      </div>
    </div>
  );
}
