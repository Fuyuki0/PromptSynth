// lib/audio-engine.ts

export function playPreview(recipe: any) {
  // Initialize the browser's audio engine
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // 1. Determine Pitch
  // Bass sounds play C2 (MIDI 36), Leads/Plucks play C4 (MIDI 60)
  const baseMidi = recipe.category === 'bass' ? 36 : 60; 
  // Apply the transpose the AI chose
  const finalMidi = baseMidi + (recipe.osc_1_transpose || 0);
  // Convert MIDI note to exact Hz frequency
  const freqHz = 440 * Math.pow(2, (finalMidi - 69) / 12);
  osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
  
  // Use a sawtooth wave for rich harmonics that the filter can chew on
  osc.type = 'sawtooth';

  // 2. Setup the Filter
  if (recipe.filter_1_on === 1.0) {
    filter.type = 'lowpass';
    // Convert the AI's MIDI cutoff note to Hz
    const filterFreqHz = 440 * Math.pow(2, ((recipe.filter_1_cutoff || 128) - 69) / 12);
    filter.frequency.setValueAtTime(filterFreqHz, ctx.currentTime);
    // Add resonance
    filter.Q.value = (recipe.filter_1_resonance || 0) * 15; 
  }

  // 3. Apply the Amplitude Envelope (ADSR)
  const now = ctx.currentTime;
  const maxVol = recipe.osc_1_level || 0.7; // Don't blow out the user's ears
  
  // Convert 0.0-1.0 parameters to rough seconds
  const attack = Math.max(0.01, (recipe.env_1_attack || 0) * 2); 
  const decay = Math.max(0.1, (recipe.env_1_decay || 0) * 2);
  const sustainLevel = maxVol * Math.max(0, Math.min(1, recipe.env_1_sustain || 1));
  const release = Math.max(0.1, (recipe.env_1_release || 0) * 3);

  // Draw the volume automation curve
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(maxVol, now + attack); // Attack
  gain.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay); // Decay
  
  // Hold the note for 1.5 seconds, then release
  const holdTime = 1.5; 
  gain.gain.setValueAtTime(sustainLevel, now + attack + decay + holdTime);
  gain.gain.linearRampToValueAtTime(0, now + attack + decay + holdTime + release); // Release

  // 4. Wire the cables and hit play!
  osc.connect(filter);
  if (recipe.filter_1_on === 1.0) {
      filter.connect(gain);
  } else {
      osc.connect(gain); // Bypass filter if it's off
  }
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + attack + decay + holdTime + release);
}
