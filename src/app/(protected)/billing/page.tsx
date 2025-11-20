"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import {
  CreditCard,
  Calendar,
  Lock,
  ArrowRight,
  Check,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for cleaner tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Backdrop = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClick}
    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/20 backdrop-blur-[2px]"
  >
    {children}
  </motion.div>
);

const Modal = ({
  handleClose,
  children,
}: {
  handleClose: () => void;
  children: React.ReactNode;
}) => (
  <Backdrop onClick={handleClose}>
    <motion.div
      onClick={(e) => e.stopPropagation()}
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: 20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-100 bg-white p-8 shadow-2xl"
    >
      {children}
    </motion.div>
  </Backdrop>
);

export default function BillingPage() {
  const [amount, setAmount] = useState<number>(50);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showDecline, setShowDecline] = useState<boolean>(false);
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardName, setCardName] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [cvv, setCvv] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // --- Logic ---

  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\s/g, "");
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(" ") : cleaned;
  };

  const handleCardNumberChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.replace(/\s/g, "");
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setCardNumber(formatCardNumber(value));
    }
  };

  const handleExpiryChange = (e: ChangeEvent<HTMLInputElement>): void => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4);
    }
    if (value.length <= 5) setExpiry(value);
  };

  const handleCvvChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (value.length <= 3 && /^\d*$/.test(value)) setCvv(value);
  };

  const handlePayment = (): void => {
    setIsModalOpen(false);
    // Simulate API call
    setTimeout(() => {
      const success = Math.random() > 0.3;
      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);
      } else {
        setShowDecline(true);
        setTimeout(() => setShowDecline(false), 4000);
      }
    }, 500);
  };

  const calculateProcessingFee = (baseAmount: number): string =>
    (baseAmount * 0.029).toFixed(2);
  const calculateTotal = (baseAmount: number): string =>
    (baseAmount * 1.029).toFixed(2);
  const presetAmounts: number[] = [25, 50, 100, 250];

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-50 p-4 text-zinc-950 selection:bg-zinc-900 selection:text-white">
      {/* Ambient Background Grid */}
      <div className="pointer-events-none absolute inset-0 h-full w-full bg-white bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-transparent to-zinc-50/80"></div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Notification Alerts */}
        <div className="pointer-events-none fixed top-6 right-0 left-0 z-50 flex justify-center">
          <AnimatePresence mode="wait">
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-6 py-3 shadow-xl shadow-zinc-200/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Payment Successful
                  </p>
                  <p className="text-xs text-zinc-500">
                    ID: #{Math.floor(Math.random() * 1000000)}
                  </p>
                </div>
              </motion.div>
            )}

            {showDecline && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-6 py-3 shadow-xl shadow-zinc-200/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
                  <X className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Payment Declined
                  </p>
                  <p className="text-xs text-zinc-500">
                    Please check card details.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="group relative overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)]"
        >
          {/* Top Decorative Line */}
          <div className="absolute top-0 h-1 w-full bg-gradient-to-r from-transparent via-zinc-950 to-transparent opacity-10"></div>

          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="mb-10 text-center">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 shadow-inner">
                <CreditCard
                  className="h-6 w-6 text-zinc-900"
                  strokeWidth={1.5}
                />
              </div>
              <h1 className="mb-2 text-3xl font-semibold tracking-tight text-zinc-950">
                Payment Portal
              </h1>
              <p className="text-sm text-zinc-500">
                Secure anonymous transaction
              </p>
            </div>

            {/* Slider Section */}
            <div className="mb-12 space-y-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold tracking-tighter text-zinc-950">
                  ${amount}
                </span>
                <span className="text-lg font-medium text-zinc-400">USD</span>
              </div>

              <div className="relative w-full">
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value))}
                  className="slider-thumb h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-100 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #18181b 0%, #18181b ${((amount - 10) / 490) * 100}%, #f4f4f5 ${((amount - 10) / 490) * 100}%, #f4f4f5 100%)`,
                  }}
                />
                <div className="mt-4 flex justify-between text-xs font-medium text-zinc-400">
                  <span>$10</span>
                  <span>$500</span>
                </div>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-4 gap-3">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200",
                      amount === preset
                        ? "border-zinc-950 bg-zinc-950 text-white shadow-lg shadow-zinc-900/20"
                        : "border-zinc-100 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
                    )}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Box */}
            <div className="mb-8 space-y-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-6">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Subtotal</span>
                <span>${amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  Processing Fee{" "}
                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-600">
                    2.9%
                  </span>
                </span>
                <span>${calculateProcessingFee(amount)}</span>
              </div>
              <div className="my-2 h-px w-full bg-zinc-200"></div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Total Due</span>
                <span className="text-xl font-bold text-zinc-900">
                  ${calculateTotal(amount)}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-zinc-950 px-8 py-4 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-all duration-300 hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/10 active:scale-[0.98]"
            >
              <span className="font-medium">Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>

            {/* Footer Security */}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Encrypted 256-bit Connection</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Custom Payment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <Modal handleClose={() => setIsModalOpen(false)}>
            <div className="relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute -top-4 -right-4 p-2 text-zinc-400 hover:text-zinc-900"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-zinc-900">
                  Card Details
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Complete your payment of{" "}
                  <span className="font-bold text-zinc-900">
                    ${calculateTotal(amount)}
                  </span>
                </p>
              </div>

              <div className="space-y-5">
                {/* Card Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                    Card Number
                  </label>
                  <div className="group relative flex items-center rounded-xl border border-zinc-200 bg-white transition-all focus-within:border-zinc-950 focus-within:ring-1 focus-within:ring-zinc-950/10 hover:border-zinc-300">
                    <div className="pl-4 text-zinc-400">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      className="h-12 w-full bg-transparent px-4 font-mono text-sm text-zinc-900 outline-none placeholder:text-zinc-300"
                    />
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                    Cardholder Name
                  </label>
                  <div className="rounded-xl border border-zinc-200 bg-white transition-all focus-within:border-zinc-950 focus-within:ring-1 focus-within:ring-zinc-950/10 hover:border-zinc-300">
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="JOHN DOE"
                      className="h-12 w-full bg-transparent px-4 text-sm text-zinc-900 uppercase outline-none placeholder:text-zinc-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Expiry */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                      Expiry
                    </label>
                    <div className="rounded-xl border border-zinc-200 bg-white transition-all focus-within:border-zinc-950 focus-within:ring-1 focus-within:ring-zinc-950/10 hover:border-zinc-300">
                      <input
                        type="text"
                        value={expiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="h-12 w-full bg-transparent px-4 text-center font-mono text-sm text-zinc-900 outline-none placeholder:text-zinc-300"
                      />
                    </div>
                  </div>
                  {/* CVV */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                      CVV
                    </label>
                    <div className="flex items-center rounded-xl border border-zinc-200 bg-white transition-all focus-within:border-zinc-950 focus-within:ring-1 focus-within:ring-zinc-950/10 hover:border-zinc-300">
                      <input
                        type="text"
                        value={cvv}
                        onChange={handleCvvChange}
                        placeholder="123"
                        className="h-12 w-full bg-transparent px-4 text-center font-mono text-sm text-zinc-900 outline-none placeholder:text-zinc-300"
                      />
                      <div className="pr-4 text-zinc-400">
                        <Lock className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handlePayment}
                  disabled={!cardNumber || !cardName || !expiry || !cvv}
                  className="w-full rounded-xl bg-zinc-950 py-4 text-sm font-semibold text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Pay ${calculateTotal(amount)}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 2px solid #18181b;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: transform 0.1s;
        }
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        .slider-thumb::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 2px solid #18181b;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: transform 0.1s;
        }
      `}</style>
    </div>
  );
}
