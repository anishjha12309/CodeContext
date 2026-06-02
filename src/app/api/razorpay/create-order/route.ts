import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { createAdminSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount } = await req.json() as { amount: number };

    if (!amount || amount < 10 || amount > 10000) {
      return NextResponse.json({ error: "Amount must be between ₹10 and ₹10,000" }, { status: 400 });
    }

    const amountInPaise = Math.round(amount * 100);
    const credits = amount; // 1 INR = 1 credit

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const supabase = createAdminSupabase();
    await supabase.from("transactions").insert({
      user_id: userId,
      razorpay_order_id: order.id,
      amount: amountInPaise,
      credits,
      status: "PENDING",
    });

    return NextResponse.json({ orderId: order.id, amount: amountInPaise, credits });
  } catch (err) {
    console.error("create-order error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
