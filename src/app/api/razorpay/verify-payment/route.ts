import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { createAdminSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json() as {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      };

    // Verify HMAC signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // Fetch transaction to get credits amount
    const { data: txn } = await supabase
      .from("transactions")
      .select("credits")
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (!txn) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    // Mark transaction success
    await supabase
      .from("transactions")
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: "SUCCESS",
      })
      .eq("razorpay_order_id", razorpay_order_id);

    // Add credits atomically
    await supabase.rpc("increment_credits", {
      p_user_id: userId,
      p_amount: txn.credits,
    });

    return NextResponse.json({ success: true, credits: txn.credits });
  } catch (err) {
    console.error("verify-payment error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
