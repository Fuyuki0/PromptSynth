import { prisma } from "@/lib/db";

const REFILL_HOURS = 3;
const REFILL_AMOUNT = 3;
const MAX_CREDITS = 5; // Maximum free credits a user can hold

export async function processCreditRefill(userId: string) {
  let userSub = await prisma.userSubscription.findUnique({
    where: { userId }
  });

  if (!userSub) {
    userSub = await prisma.userSubscription.create({
      data: { userId, freeCredits: MAX_CREDITS, lastCreditRefill: new Date() }
    });
  }

  const now = new Date();
  const hoursPassed = (now.getTime() - userSub.lastCreditRefill.getTime()) / (1000 * 60 * 60);

  if (hoursPassed >= REFILL_HOURS && userSub.freeCredits < MAX_CREDITS) {
    const refillCycles = Math.floor(hoursPassed / REFILL_HOURS);
    const newCredits = Math.min(userSub.freeCredits + (refillCycles * REFILL_AMOUNT), MAX_CREDITS);
    
    // Advance the refill timer precisely based on how many cycles passed
    const newRefillTime = new Date(userSub.lastCreditRefill.getTime() + (refillCycles * REFILL_HOURS * 60 * 60 * 1000));

    userSub = await prisma.userSubscription.update({
      where: { userId },
      data: { 
        freeCredits: newCredits,
        lastCreditRefill: newRefillTime
      }
    });
  }

  // Calculate when the next refill will occur
  const nextRefillDate = new Date(userSub.lastCreditRefill.getTime() + (REFILL_HOURS * 60 * 60 * 1000));
  
  return {
    ...userSub,
    nextRefillTime: userSub.freeCredits < MAX_CREDITS ? nextRefillDate.getTime() : null,
    isPro: !!(
      userSub.stripePriceId && 
      userSub.stripeCurrentPeriodEnd && 
      userSub.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now()
    )
  };
}
