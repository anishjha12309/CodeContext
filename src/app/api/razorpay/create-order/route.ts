import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { createAdminSupabase, isConnectionError } from "@/lib/supabase";
import { z } from "zod";

const bodySchema = z.object({
  amount: z.number().int().min(10).max(10000),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Amount must be an integer between ₹10 and ₹10,000" }, { status: 400 });
    }
    const { amount } = parsed.data;

    const amountInPaise = amount * 100; // amount is already validated as an integer
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

    // Ensure the users row exists before inserting the transaction (FK to
    // users(id)). The layout's background syncUser() can race with this money
    // path — especially right after an account switch — so provision inline.
    const clerkUser = await currentUser();
    const { error: userError } = await supabase.from("users").upsert(
      {
        id: userId,
        image_url: clerkUser?.imageUrl,
        first_name: clerkUser?.firstName,
        last_name: clerkUser?.lastName,
        email_address: clerkUser?.emailAddresses[0]?.emailAddress ?? "",
      },
      { onConflict: "id" },
    );
    if (userError) {
      console.error("create-order: failed to provision user:", userError);
      if (isConnectionError(userError)) {
        return NextResponse.json(
          { error: "Database unreachable. Please try again shortly." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Failed to provision user" }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: userId,
      razorpay_order_id: order.id,
      amount: amountInPaise,
      credits,
      status: "PENDING",
    });
    if (insertError) {
      console.error("create-order: failed to record transaction:", insertError);
      return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 });
    }

    return NextResponse.json({ orderId: order.id, amount: amountInPaise, credits });
  } catch (err) {
    console.error("create-order error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
