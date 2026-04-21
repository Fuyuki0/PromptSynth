import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    let userSub = await prisma.userSubscription.findUnique({
      where: { userId: userId }
    });

    if (!userSub) {
      userSub = await prisma.userSubscription.create({
        data: { userId: userId, freeCredits: 5 }
      });
    }

    const isPro = !!(
      userSub.stripePriceId && 
      userSub.stripeCurrentPeriodEnd && 
      userSub.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now()
    );

    return NextResponse.json({ 
      credits: userSub.freeCredits, 
      isPro: isPro 
    });
	} catch (error) {
		// NEW: Print the exact error so we can see what crashed!
		console.error("USER API ERROR:", error);
		return new NextResponse("Error fetching user data", { status: 500 });
	  }
}
