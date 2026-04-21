import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/db';
import { buildVitalPreset } from '@/lib/vital-builder';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Verify the user is logged in
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Fetch ONLY the sounds belonging to this exact user
    const generations = await prisma.generation.findMany({
      where: {
        userId: userId // <-- The filter
      },
      orderBy: { createdAt: 'desc' },
    });

    const libraryWithFiles = generations.map((gen) => {
      const recipe = JSON.parse(gen.recipeData);
      return {
        id: gen.id,
        prompt: gen.prompt,
        category: gen.category,
        mood: gen.mood,
        createdAt: gen.createdAt,
        recipe: recipe,
        vitalFileContent: buildVitalPreset(recipe)
      };
    });

    return NextResponse.json(libraryWithFiles);
  } catch (error: any) {
    console.error("Library Fetch Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
