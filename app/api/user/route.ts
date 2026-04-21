import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/db';
import { processCreditRefill } from '@/lib/refill';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const userData = await processCreditRefill(userId);

    return NextResponse.json({ 
      credits: userData.freeCredits, 
      isPro: userData.isPro,
      nextRefillTime: userData.nextRefillTime
    });
	} catch (error) {
		// NEW: Print the exact error so we can see what crashed!
		console.error("USER API ERROR:", error);
		return new NextResponse("Error fetching user data", { status: 500 });
	  }
}
