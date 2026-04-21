import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Get the exact URL the user is currently on so we can send them back here
    const url = new URL(req.url);
    const returnUrl = `${url.protocol}//${url.host}`;

    // 2. Check if we already have a Stripe Customer ID for this user
    const userSub = await prisma.userSubscription.findUnique({
      where: { userId: userId },
    });

    let stripeCustomerId = userSub?.stripeCustomerId;

    // 3. Create a Stripe Checkout Session
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: `${returnUrl}?success=true`, // Where to send them if they pay
      cancel_url: `${returnUrl}?canceled=true`, // Where to send them if they back out
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: stripeCustomerId ? undefined : undefined, // Clerk handles emails usually, we'll keep it simple
      customer: stripeCustomerId || undefined,
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // The $10/mo product!
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId, // CRITICAL: This tells us WHO paid when Stripe pings us back
      },
    });

    // 4. Return the secure URL to the frontend
    return NextResponse.json({ url: stripeSession.url });

  } catch (error: any) {
    console.error("STRIPE CHECKOUT ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
