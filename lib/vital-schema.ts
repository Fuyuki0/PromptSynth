import { z } from 'zod';

export const VitalRecipeSchema = z.object({
  category: z.enum(["bass", "lead", "pad", "pluck", "arp", "fx"]),
  mood: z.string(),
  
  macro_1_name: z.string(),
  macro_1_value: z.number().min(0).max(1),
  macro_2_name: z.string(),
  macro_2_value: z.number().min(0).max(1),

  env_1_attack: z.number().min(0).max(1),
  env_1_decay: z.number().min(0).max(1),
  env_1_sustain: z.number().min(0).max(1),
  env_1_release: z.number().min(0).max(1),

  env_2_attack: z.number().min(0).max(1),
  env_2_decay: z.number().min(0).max(1),
  env_2_sustain: z.number().min(0).max(1),
  env_2_release: z.number().min(0).max(1),

  lfo_1_frequency: z.number().min(0).max(128),
  lfo_1_sync: z.number().min(0).max(1),
  lfo_1_tempo: z.number().min(0).max(12),

  // THE ROUTING CABLES
  mod_env_2_to_filter_cutoff: z.number().min(-1).max(1),
  mod_lfo_1_to_filter_cutoff: z.number().min(-1).max(1),
  mod_macro_1_to_filter_cutoff: z.number().min(-1).max(1),
  mod_macro_2_to_osc_detune: z.number().min(-1).max(1),

  filter_1_on: z.number().min(0).max(1),
  filter_1_cutoff: z.number().min(0).max(128),
  filter_1_resonance: z.number().min(0).max(1),
  filter_1_drive: z.number().min(0).max(1),

  osc_1_on: z.number().min(0).max(1),
  osc_1_level: z.number().min(0).max(1),
  osc_1_transpose: z.number().min(-48).max(48),
  osc_1_unison_voices: z.number().min(1).max(16),
  osc_1_unison_detune: z.number().min(0).max(100),
  
  osc_2_on: z.number().min(0).max(1),
  osc_2_level: z.number().min(0).max(1),
  osc_2_transpose: z.number().min(-48).max(48),
  osc_2_unison_voices: z.number().min(1).max(16),
  osc_2_unison_detune: z.number().min(0).max(100),

  distortion_on: z.number().min(0).max(1),
  distortion_drive: z.number().min(0).max(1),
  compressor_on: z.number().min(0).max(1),
  chorus_on: z.number().min(0).max(1),
  chorus_dry_wet: z.number().min(0).max(1),
  delay_on: z.number().min(0).max(1),
  delay_dry_wet: z.number().min(0).max(1),
  reverb_on: z.number().min(0).max(1),
  reverb_dry_wet: z.number().min(0).max(1),
});

export type VitalRecipe = z.infer<typeof VitalRecipeSchema>;
