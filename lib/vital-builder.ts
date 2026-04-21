import fs from 'fs';
import path from 'path';
import { VitalRecipe } from './vital-schema';

export function buildVitalPreset(recipe: VitalRecipe): string {
  try {
    const templatePath = path.join(process.cwd(), 'assets', 'init.vital');
    const templateRaw = fs.readFileSync(templatePath, 'utf-8');
    const preset = JSON.parse(templateRaw);
    // It probably looks like one of these:

    preset.preset_name = `PromptSynth - ${recipe.mood || 'Custom'} ${recipe.category || 'Sound'}`;

    // Set Custom Macro Names
    preset.macro1 = recipe.macro_1_name || "Macro 1";
    preset.macro2 = recipe.macro_2_name || "Macro 2";

    const s = preset.settings;

    // 1. Envelopes
    s.env_1_attack = recipe.env_1_attack ?? 0.01;
    s.env_1_decay = recipe.env_1_decay ?? 0.5;
    s.env_1_sustain = recipe.env_1_sustain ?? 0.5;
    s.env_1_release = recipe.env_1_release ?? 0.5;

    s.env_2_attack = recipe.env_2_attack ?? 0.1;
    s.env_2_decay = recipe.env_2_decay ?? 0.5;
    s.env_2_sustain = recipe.env_2_sustain ?? 0.0;
    s.env_2_release = recipe.env_2_release ?? 0.5;

    // 2. LFO 1
    s.lfo_1_frequency = recipe.lfo_1_frequency ?? 2;
    s.lfo_1_sync = recipe.lfo_1_sync ?? 0;
    s.lfo_1_tempo = recipe.lfo_1_tempo ?? 7;

    // 3. Filter
    s.filter_1_on = recipe.filter_1_on ?? 1;
    s.filter_1_cutoff = recipe.filter_1_cutoff ?? 60;
    s.filter_1_resonance = recipe.filter_1_resonance ?? 0;
    s.filter_1_drive = recipe.filter_1_drive ?? 0;

    // 4. Oscillators
    s.osc_1_on = recipe.osc_1_on ?? 1;
    s.osc_1_level = recipe.osc_1_level ?? 1;
    s.osc_1_transpose = recipe.osc_1_transpose ?? 0;
    s.osc_1_unison_voices = recipe.osc_1_unison_voices ?? 1;
    s.osc_1_unison_detune = recipe.osc_1_unison_detune ?? 0;

    s.osc_2_on = recipe.osc_2_on ?? 0;
    s.osc_2_level = recipe.osc_2_level ?? 0;
    s.osc_2_transpose = recipe.osc_2_transpose ?? 0;
    s.osc_2_unison_voices = recipe.osc_2_unison_voices ?? 1;
    s.osc_2_unison_detune = recipe.osc_2_unison_detune ?? 0;

    // 5. FX Rack
    s.distortion_on = recipe.distortion_on ?? 0;
    s.distortion_drive = recipe.distortion_drive ?? 0;
    s.compressor_on = recipe.compressor_on ?? 0;
    s.compressor_mix = 1; // Vital OTT defaults to fully wet
    s.chorus_on = recipe.chorus_on ?? 0;
    s.chorus_dry_wet = recipe.chorus_dry_wet ?? 0.2;
    s.delay_on = recipe.delay_on ?? 0;
    s.delay_dry_wet = recipe.delay_dry_wet ?? 0.3;
    s.reverb_on = recipe.reverb_on ?? 0;
    s.reverb_dry_wet = recipe.reverb_dry_wet ?? 0;

    // ==========================================
    // 6. THE MATRIX (This routes the movement!)
    // ==========================================

    s.modulation_1_source = "env_2";
    s.modulation_1_destination = "filter_1_cutoff";
    s.modulation_1_amount = recipe.mod_env_2_to_filter_cutoff ?? 0;
    s.modulation_1_bipolar = 0;

    s.modulation_2_source = "lfo_1";
    s.modulation_2_destination = "filter_1_cutoff";
    s.modulation_2_amount = recipe.mod_lfo_1_to_filter_cutoff ?? 0;
    s.modulation_2_bipolar = 1;

    s.modulation_3_source = "macro_control_1";
    s.modulation_3_destination = "filter_1_cutoff";
    s.modulation_3_amount = recipe.mod_macro_1_to_filter_cutoff ?? 0;
    s.modulation_3_bipolar = 1;

    s.modulation_4_source = "macro_control_2";
    s.modulation_4_destination = "osc_1_unison_detune";
    s.modulation_4_amount = recipe.mod_macro_2_to_osc_detune ?? 0;
    s.modulation_4_bipolar = 0;

    return JSON.stringify(preset, null, 2);

  } catch (error) {
    console.error("Failed to build Vital preset:", error);
    throw new Error("Preset compilation failed.");
  }
}
