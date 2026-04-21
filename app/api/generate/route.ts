import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildVitalPreset } from '@/lib/vital-builder';
import { prisma } from '@/lib/db';
import { processCreditRefill } from '@/lib/refill';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    // 1. Verify the user is logged in
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // ==========================================
    // THE BOUNCER: CREDIT & SUBSCRIPTION CHECK
    // ==========================================
    
    // Process refill logic and get user info
    const userSub = await processCreditRefill(userId);
    const isPro = userSub.isPro;

    // If they aren't Pro, and they have 0 credits left, BLOCK THEM!
    if (!isPro && userSub.freeCredits <= 0) {
      return new NextResponse("FREE_TRIAL_EXPIRED", { status: 403 });
    }
    // ==========================================

    const body = await req.json();
    const prompt = body.prompt;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log(`🤖 Requesting Gemini recipe for: "${prompt}"`);

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const systemPrompt = `
    You are a world-class electronic music producer and synthesizer sound designer.
    Your job is to translate the user's prompt into exact mathematical parameters for the Vital synthesizer.

    CRITICAL PRO SOUND DESIGN RULES:
    1. THE MATRIX (MOVEMENT): Static sounds are boring.
       - If the user wants a "Pluck", "Stab", or "Perc", set env_2_attack to 0.0, env_2_decay to 0.2, and set mod_env_2_to_filter_cutoff to a high positive number (e.g., 0.6).
       - If the user wants a "Wobble", "Dubstep", or "Pulsing" sound, set lfo_1_sync to 1.0, lfo_1_tempo to 7 (1/8 note), and set mod_lfo_1_to_filter_cutoff to 0.5.
    2. UNISON & STEREO WIDTH:
       - For "Reese", "Supersaw", or "Huge" sounds: Set osc_1_unison_voices to 7 or 9, and osc_1_unison_detune to 25.0.
       - Sub basses MUST have 1 unison voice to stay mono and punchy.
    3. THE OTT (MULTIBAND COMPRESSOR):
       - If the user wants a "Modern", "EDM", "Dubstep", or "In-your-face" sound, you MUST set compressor_on to 1.0. This activates Vital's built-in OTT.
    4. MACROS:
       - Always name Macro 1 something descriptive (e.g., "Cutoff", "Wobble Speed", "Brightness") and route it using mod_macro_1_to_filter_cutoff.
       - Always name Macro 2 (e.g., "Detune Amount", "Space") and route it using mod_macro_2_to_osc_detune.
    5. FX RACK:
       - "Dreamy", "Ambient", or "Cinematic": Heavy Reverb (reverb_on: 1, reverb_dry_wet: 0.5) and Delay.
       - "Aggressive", "Dirty", "Gritty": Distortion (distortion_on: 1, distortion_drive: 0.7).

    Analyze the user prompt and generate the perfect JSON to match the sound.

    User Prompt: ${prompt}
    `;

    const result = await model.generateContent(systemPrompt);
    const recipe = JSON.parse(result.response.text());

    // ==========================================
    // CHARGE THE USER
    // ==========================================
    // If they are not pro, deduct 1 credit from their wallet
    if (!isPro) {
      await prisma.userSubscription.update({
        where: { userId: userId },
        data: { freeCredits: userSub.freeCredits - 1 }
      });
    }
    // ==========================================

    const savedGeneration = await prisma.generation.create({
      data: {
        userId: userId,
        prompt: prompt,
        category: recipe.category || "unknown",
        mood: recipe.mood || "custom",
        recipeData: JSON.stringify(recipe),
      }
    });

    const vitalFileContent = buildVitalPreset(recipe);

    return NextResponse.json({
      id: savedGeneration.id, 
      recipe,
      vitalFileContent
    });

  } catch (error: any) {
    console.error("Error generating preset:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
