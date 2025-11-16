"use client";

import { useState, type ChangeEvent } from "react";
import { CreditCard, Calendar, Lock, ArrowRight, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BillingPage() {
  const [amount, setAmount] = useState<number>(50);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showDecline, setShowDecline] = useState<boolean>(false);
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardName, setCardName] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [cvv, setCvv] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

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
    if (value.length <= 5) {
      setExpiry(value);
    }
  };

  const handleCvvChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (value.length <= 3 && /^\d*$/.test(value)) {
      setCvv(value);
    }
  };

  const handlePayment = (): void => {
    setIsDialogOpen(false);
    const success = Math.random() > 0.3;
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } else {
      setShowDecline(true);
      setTimeout(() => setShowDecline(false), 4000);
    }
  };

  const calculateProcessingFee = (baseAmount: number): string => {
    return (baseAmount * 0.029).toFixed(2);
  };

  const calculateTotal = (baseAmount: number): string => {
    return (baseAmount * 1.029).toFixed(2);
  };

  const presetAmounts: number[] = [25, 50, 100, 250];

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4 text-black">
      <div className="w-full max-w-2xl">
        {/* Success/Decline Alerts */}
        {showSuccess && (
          <Alert className="mb-6 border-black/20 bg-black/10 backdrop-blur-sm">
            <Check className="h-4 w-4" />
            <AlertDescription className="text-black">
              Payment processed successfully! Transaction ID: #
              {Math.floor(Math.random() * 1000000)}
            </AlertDescription>
          </Alert>
        )}

        {showDecline && (
          <Alert className="mb-6 border-black/20 bg-black/10 backdrop-blur-sm">
            <X className="h-4 w-4" />
            <AlertDescription className="text-black">
              Payment declined. Please check your card details and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <div className="rounded-3xl border border-zinc-300 bg-gradient-to-br from-zinc-100 to-white p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-black">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-bold">Payment Portal</h1>
            <p className="text-zinc-600">Complete your transaction securely</p>
          </div>

          {/* Amount Slider */}
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-600">
                Payment Amount
              </label>
              <span className="text-3xl font-bold">${amount}</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              value={amount}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setAmount(parseInt(e.target.value))
              }
              className="slider-thumb h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200"
              style={{
                background: `linear-gradient(to right, black 0%, black ${((amount - 10) / 490) * 100}%, rgb(228 228 231) ${((amount - 10) / 490) * 100}%, rgb(228 228 231) 100%)`,
              }}
            />
            <div className="mt-2 flex justify-between text-xs text-zinc-500">
              <span>$10</span>
              <span>$500</span>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="mb-8 grid grid-cols-4 gap-3">
            {presetAmounts.map((preset: number) => (
              <button
                key={preset}
                onClick={() => setAmount(preset)}
                className={`rounded-xl px-4 py-3 font-medium transition-all ${
                  amount === preset
                    ? "bg-black text-white"
                    : "bg-zinc-200 text-black hover:bg-zinc-300"
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>

          {/* Payment Summary */}
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-100/50 p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-zinc-600">Subtotal</span>
              <span className="font-medium">${amount}</span>
            </div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-zinc-600">Processing Fee</span>
              <span className="font-medium">
                ${calculateProcessingFee(amount)}
              </span>
            </div>
            <div className="my-4 border-t border-zinc-200"></div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold">
                ${calculateTotal(amount)}
              </span>
            </div>
          </div>

          {/* Payment Button with Modal */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button className="group flex w-full items-center justify-center gap-2 rounded-xl bg-black py-4 text-lg font-semibold text-white transition-all hover:bg-zinc-800">
                Proceed to Payment
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-zinc-300 bg-zinc-100 text-black">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  Enter Payment Details
                </DialogTitle>
                <DialogDescription className="text-zinc-600">
                  Complete your ${calculateTotal(amount)} payment securely
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Card Number */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="1234 5678 9012 3456"
                      className="w-full rounded-lg border border-zinc-300 bg-zinc-200 px-4 py-3 text-black focus:ring-2 focus:ring-black focus:outline-none"
                    />
                    <CreditCard className="absolute top-3.5 right-3 h-5 w-5 text-zinc-500" />
                  </div>
                </div>

                {/* Card Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCardName(e.target.value)
                    }
                    placeholder="JOHN DOE"
                    className="w-full rounded-lg border border-zinc-300 bg-zinc-200 px-4 py-3 text-black uppercase focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                      Expiry Date
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={expiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full rounded-lg border border-zinc-300 bg-zinc-200 px-4 py-3 text-black focus:ring-2 focus:ring-black focus:outline-none"
                      />
                      <Calendar className="absolute top-3.5 right-3 h-5 w-5 text-zinc-500" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                      CVV
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cvv}
                        onChange={handleCvvChange}
                        placeholder="123"
                        className="w-full rounded-lg border border-zinc-300 bg-zinc-200 px-4 py-3 text-black focus:ring-2 focus:ring-black focus:outline-none"
                      />
                      <Lock className="absolute top-3.5 right-3 h-5 w-5 text-zinc-500" />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <button
                  onClick={handlePayment}
                  disabled={!cardNumber || !cardName || !expiry || !cvv}
                  className="w-full rounded-lg bg-black py-3 font-semibold text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Pay ${calculateTotal(amount)}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500">
            <Lock className="h-4 w-4" />
            <span>Secured by 256-bit SSL encryption</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: black;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: black;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
