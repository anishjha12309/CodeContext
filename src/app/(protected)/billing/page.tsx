"use client";

import { api } from "@/trpc/react";
import { useRefetch } from "@/hooks/use-refetch";
import { toast } from "sonner";
import { CreditCard, Zap, CheckCircle } from "lucide-react";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

const PACKAGES = [
  { credits: 50, amount: 50, label: "Starter", perks: ["50 credits", "~1 project"] },
  { credits: 100, amount: 100, label: "Builder", popular: true, perks: ["100 credits", "~2 projects"] },
  { credits: 500, amount: 500, label: "Pro", perks: ["500 credits", "~10 projects"] },
  { credits: 1000, amount: 1000, label: "Scale", perks: ["1000 credits", "~20 projects"] },
];

export default function BillingPage() {
  const { data: credits } = api.project.getMyCredits.useQuery();
  const refetch = useRefetch();
  const [loading, setLoading] = useState<number | null>(null);

  async function handlePurchase(pkg: (typeof PACKAGES)[number]) {
    setLoading(pkg.amount);
    try {
      const res = await fetch("/api/razorpay/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: pkg.amount }) });
      const { orderId, amount } = (await res.json()) as { orderId: string; amount: number };
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
      await new Promise((resolve) => (script.onload = resolve));
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, amount, currency: "INR",
        name: "CodeContext", description: `${pkg.credits} credits`, order_id: orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/razorpay/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(response) });
          if (verifyRes.ok) { toast.success(`${pkg.credits} credits added!`); await refetch(); }
          else toast.error("Payment verification failed.");
        },
        theme: { color: "#0ea5e9" },
      });
      rzp.open();
    } catch { toast.error("Failed to create order."); } finally { setLoading(null); }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Billing</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-white/40">Purchase credits to create projects and ask questions.</p>
      </div>

      {/* Balance */}
      <div className="glass-app-strong inline-flex items-center gap-4 rounded-2xl px-6 py-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-white/6">
          <Zap className="h-6 w-6 text-zinc-500 dark:text-white/50" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/40">Current balance</p>
          <p className="mt-0.5 text-3xl font-bold text-zinc-900 dark:text-white">
            {credits ?? 0}<span className="ml-1.5 text-sm font-normal text-zinc-500 dark:text-white/40">credits</span>
          </p>
        </div>
      </div>

      {/* Packages */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PACKAGES.map((pkg) => (
          <div key={pkg.amount} className={`glass-app relative rounded-2xl p-5 transition-all ${pkg.popular ? "border-zinc-300 dark:border-white/20 ring-1 ring-zinc-200 dark:ring-white/10" : ""}`}>
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-white px-3 py-0.5 text-xs font-semibold text-white dark:text-black">Popular</div>
            )}
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-white/40">{pkg.label}</p>
            <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-white">₹{pkg.amount}</p>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-white/60">{pkg.credits} credits</p>
            <ul className="mt-4 space-y-1.5">
              {pkg.perks.map((p) => (
                <li key={p} className="flex items-center gap-2 text-xs text-zinc-500 dark:text-white/40">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/40" />
                  {p}
                </li>
              ))}
            </ul>
            <button onClick={() => handlePurchase(pkg)} disabled={loading === pkg.amount} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white/90 disabled:opacity-50">
              <CreditCard className="h-4 w-4" />
              {loading === pkg.amount ? "Processing…" : "Buy now"}
            </button>
          </div>
        ))}
      </div>

      <div className="glass-app rounded-xl p-4 space-y-1.5 text-xs text-zinc-500 dark:text-white/30">
        <p>• 50 credits to create a project</p>
        <p>• 1 credit per Q&amp;A question</p>
        <p>• New accounts start with 150 free credits</p>
        <p>• Credits never expire</p>
      </div>
    </div>
  );
}
