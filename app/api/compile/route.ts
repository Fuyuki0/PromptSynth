import { NextResponse } from 'next/server';
import { buildVitalPreset } from '@/lib/vital-builder';

export async function POST(request: Request) {
  try {
    const recipe = await request.json();
    
    // Re-compile the file with the user's tweaked slider values
    const vitalFileContent = buildVitalPreset(recipe);
    
    return NextResponse.json({ vitalFileContent });
  } catch (error: any) {
    console.error("Compile Error:", error);
    return NextResponse.json({ error: "Failed to compile preset" }, { status: 500 });
  }
}
