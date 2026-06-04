import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { createAdminSupabase } from "@/lib/supabase";
import { z } from "zod";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    // Verify HMAC signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // Fetch transaction — select status too so we can check for idempotency
    const { data: txn } = await supabase
      .from("transactions")
      .select("credits, status, user_id")
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (!txn) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    // Guard against replayed / duplicate requests — return early if already credited
    if (txn.status === "SUCCESS") {
      return NextResponse.json({ success: true, credits: txn.credits });
    }

    // Ensure the order belongs to the authenticated user
    if (txn.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Mark transaction success first, then credit — if crediting fails the
    // status update is still recorded and the user can contact support.
    await supabase
      .from("transactions")
      .update({ razorpay_payment_id, razorpay_signature, status: "SUCCESS" })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("status", "PENDING"); // extra guard: only update if still PENDING

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
