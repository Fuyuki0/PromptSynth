// prototype.js
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------
// 1. DUMMY AI: Simulates what the LLM will eventually do
// ---------------------------------------------------------
function callDummyAI(prompt) {
  console.log(`🤖 AI is analyzing prompt: "${prompt}"...`);
  
  // If the prompt asks for a "dark bass", return this recipe
  if (prompt.includes('dark') && prompt.includes('bass')) {
    return {
      category: "bass",
      // Values normalized between 0.0 and 1.0 for easier mapping
      filterCutoff: 0.3,     // Low cutoff for dark sound
      filterResonance: 0.1,  // Low resonance
      envAttack: 0.05,       // Punchy but not clicking
      envDecay: 0.4,
      envSustain: 0.2,
      envRelease: 0.3,
      osc1Transpose: -12,    // Pitch down 1 octave
      osc1Volume: 1.0,
      osc2Transpose: -12,
      osc2Volume: 0.5        // Subtler second oscillator
    };
  }

  // Default fallback recipe
  return {
    category: "pluck",
    filterCutoff: 0.8,
    filterResonance: 0.5,
    envAttack: 0.0,
    envDecay: 0.2,
    envSustain: 0.0,
    envRelease: 0.2,
    osc1Transpose: 0,
    osc1Volume: 1.0,
    osc2Transpose: 0,
    osc2Volume: 0.0
  };
}

// ---------------------------------------------------------
// 2. THE MAPPER: Translates our Recipe to Vital's JSON Schema
// ---------------------------------------------------------
function injectRecipeIntoVital(recipe, vitalJsonString) {
  console.log("⚙️ Mapping AI recipe into Vital JSON structure...");
  
  // Parse the template
  let preset = JSON.parse(vitalJsonString);
  
  // Vital stores parameter values inside the "settings" object.
  // Note: Vital uses specific naming conventions for its parameters.
  
  // 1. Map Envelope 1 (Amplitude)
  preset.settings.env_1_attack = recipe.envAttack;
  preset.settings.env_1_decay = recipe.envDecay;
  preset.settings.env_1_sustain = recipe.envSustain;
  preset.settings.env_1_release = recipe.envRelease;

  // 2. Map Filter 1
  // Vital's cutoff is usually represented as a MIDI note number (0 to 128) internally.
  // We'll map our 0.0-1.0 value to approximately 20 (sub) to 100 (high).
  preset.settings.filter_1_cutoff = 20 + (recipe.filterCutoff * 80); 
  preset.settings.filter_1_resonance = recipe.filterResonance;
  preset.settings.filter_1_on = true;
  preset.settings.filter_1_blend = 1.0; // Mix at 100%

  // 3. Map Oscillators
  preset.settings.osc_1_transpose = recipe.osc1Transpose;
  preset.settings.osc_1_level = recipe.osc1Volume;
  
  preset.settings.osc_2_transpose = recipe.osc2Transpose;
  preset.settings.osc_2_level = recipe.osc2Volume;
  preset.settings.osc_2_on = recipe.osc2Volume > 0; // Turn on if volume > 0

  return preset;
}

// ---------------------------------------------------------
// 3. MAIN RUNNER
// ---------------------------------------------------------
function generatePreset(prompt, templatePath, outputPath) {
  try {
    // 1. Read the base template
    const templateRaw = fs.readFileSync(templatePath, 'utf-8');
    
    // 2. Get the recipe from Dummy AI
    const recipe = callDummyAI(prompt);
    
    // 3. Map values and generate new JSON object
    const newPresetData = injectRecipeIntoVital(recipe, templateRaw);
    
    // 4. Write to a new .vital file
    fs.writeFileSync(outputPath, JSON.stringify(newPresetData, null, 2));
    
    console.log(`✅ Success! Generated new Vital preset at: ${outputPath}`);
    
  } catch (err) {
    console.error("❌ Error generating preset:", err.message);
  }
}

// Execute the test
const TEMPLATE_FILE = path.join(__dirname, 'init.vital');
const OUTPUT_FILE = path.join(__dirname, 'output_dark_bass.vital');
const TEST_PROMPT = "make me a dark bass for trap music";

generatePreset(TEST_PROMPT, TEMPLATE_FILE, OUTPUT_FILE);
