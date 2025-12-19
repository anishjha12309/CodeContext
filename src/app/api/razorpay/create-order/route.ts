import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Credits per 100 INR (1 INR = 1 credit)
const CREDITS_PER_RUPEE = 1;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { amount } = await req.json();

    // Validate amount (minimum ₹10, maximum ₹10,000)
    if (!amount || amount < 10 || amount > 10000) {
      return NextResponse.json(
        { error: "Invalid amount. Must be between ₹10 and ₹10,000" },
        { status: 400 }
      );
    }

    // Amount in paise (100 paise = 1 INR)
    const amountInPaise = Math.round(amount * 100);
    const credits = amount * CREDITS_PER_RUPEE;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: user.id,
        credits: credits.toString(),
      },
    });

    // Create pending transaction in database
    await db.transaction.create({
      data: {
        razorpayOrderId: order.id,
        amount: amountInPaise,
        credits: credits,
        status: "PENDING",
        userId: user.id,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      credits: credits,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
