"use client";

import { useState, useRef, useEffect } from "react";
import { Music, Play, Square, ArrowLeft, Download, Trash2, ArrowDown, Repeat, PlusCircle, Settings2 } from "lucide-react";
import Link from "next/link";
import MidiWriter from "midi-writer-js";

// --- CHORD MUSIC THEORY MATH ---
const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BASE_MIDI = 60; // Middle C (C4)

const CHORD_TYPES = [
  { name: "Major", intervals: [0, 4, 7] },
  { name: "Minor", intervals: [0, 3, 7] },
  { name: "Fifth (Power)", intervals: [0, 7] },
  { name: "Sus2", intervals: [0, 2, 7] },
  { name: "Sus4", intervals: [0, 5, 7] },
  { name: "Maj7", intervals: [0, 4, 7, 11] },
  { name: "Min7", intervals: [0, 3, 7, 10] },
  { name: "Diminished", intervals: [0, 3, 6] },
];

const getChord = (root: string, typeName: string) => {
  const type = CHORD_TYPES.find(t => t.name === typeName)!;
  const rootIndex = ROOTS.indexOf(root);
  return { root, type: typeName, notes: type.intervals.map(i => BASE_MIDI + rootIndex + i) };
};

// --- STOCK PROGRESSIONS ---
const PRESET_PACKS = [
  { name: "EDM Anthem", mood: "Energetic", chords: [getChord("A", "Min7"), getChord("F", "Maj7"), getChord("C", "Major"), getChord("G", "Major")] },
  { name: "Dark Trap", mood: "Eerie", chords: [getChord("C#", "Minor"), getChord("A", "Major"), getChord("G#", "Minor"), getChord("C#", "Minor")] },
  { name: "Lo-Fi Chill", mood: "Jazzy", chords: [getChord("D", "Min7"), getChord("G", "Major"), getChord("C", "Maj7"), getChord("A", "Min7")] },
  { name: "Cinematic", mood: "Epic", chords: [getChord("C", "Sus2"), getChord("A#", "Sus2"), getChord("G#", "Sus2"), getChord("G", "Sus2")] }
];

// Helper for generating warm distortion
const makeDistortionCurve = (amount: number) => {
  if (amount === 0) return null;
  const k = amount * 4; 
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

export default function ChordsPage() {
  // Transport State
  const [bpm, setBpm] = useState(120);
  const [timelineLength, setTimelineLength] = useState<4 | 8>(4);
  const [timeline, setTimeline] = useState<any[]>(Array(4).fill(null));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [currentSlot, setCurrentSlot] = useState(-1);
  
  // FX Vibe State
  const [fx, setFx] = useState({ semitone: 0, brightness: 2000, dirt: 0, echo: 0 });
  
  // Palette State
  const [selectedRoot, setSelectedRoot] = useState("C");
  const [selectedType, setSelectedType] = useState(CHORD_TYPES[0]);

  // Engine Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isPlayingRef = useRef(false);
  const isLoopingRef = useRef(true);
  const timelineRef = useRef(timeline);
  const timelineLenRef = useRef(timelineLength);
  const fxRef = useRef(fx);
  const bpmRef = useRef(bpm);

  // Sync refs with state for the lookahead scheduler
  useEffect(() => { timelineRef.current = timeline; }, [timeline]);
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);
  useEffect(() => { timelineLenRef.current = timelineLength; }, [timelineLength]);
  useEffect(() => { fxRef.current = fx; }, [fx]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  useEffect(() => { return () => stopPlayback(); }, []);

  const rootIndex = ROOTS.indexOf(selectedRoot);
  const currentMidiNotes = selectedType.intervals.map((interval) => BASE_MIDI + rootIndex + interval);
  const currentChordData = { root: selectedRoot, type: selectedType.name, notes: currentMidiNotes };

  // --- LENGTH TOGGLE ---
  const handleLengthChange = (newLen: 4 | 8) => {
    setTimelineLength(newLen);
    setTimeline(prev => {
      if (newLen === 4) return prev.slice(0, 4);
      return [...prev, ...Array(4).fill(null)].slice(0, 8);
    });
  };

  // --- DRAG AND DROP ---
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify(currentChordData));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (data) {
      const newTimeline = [...timeline];
      newTimeline[index] = JSON.parse(data);
      setTimeline(newTimeline);
    }
  };

  const loadPreset = (presetChords: any[]) => {
    const newTimeline = Array(timelineLength).fill(null);
    presetChords.forEach((chord, i) => { if (i < timelineLength) newTimeline[i] = chord; });
    setTimeline(newTimeline);
  };

  const updateFx = (key: string, val: number) => {
    setFx(prev => ({ ...prev, [key]: val }));
  };

  const clearSlot = (index: number) => {
    const newTimeline = [...timeline];
    newTimeline[index] = null;
    setTimeline(newTimeline);
  };

  // --- AUDIO ENGINE ---
  const stopPlayback = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentSlot(-1);
    
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const playSequence = () => {
    if (isPlayingRef.current) return;
    setIsPlaying(true);
    isPlayingRef.current = true;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    // Build Master FX Bus
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.6; // Headroom
    
    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = "lowpass";
    
    const masterDist = ctx.createWaveShaper();
    masterDist.oversample = '4x';

    const masterDelay = ctx.createDelay();
    const delayFeedback = ctx.createGain();
    const delayLevel = ctx.createGain();

    // Route Master Bus
    masterGain.connect(masterFilter);
    masterFilter.connect(masterDist);
    masterDist.connect(ctx.destination); // Dry signal

    // Parallel Delay Routing
    masterDist.connect(masterDelay);
    masterDelay.connect(delayFeedback);
    delayFeedback.connect(masterDelay);
    masterDelay.connect(delayLevel);
    delayLevel.connect(ctx.destination);

    let currentStep = 0;
    let nextNoteTime = ctx.currentTime + 0.05; 
    const scheduleAheadTime = 0.1; 

    const scheduler = () => {
      if (!isPlayingRef.current) return;

      while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
        const slotIndex = currentStep;
        const timeToPlay = nextNoteTime;
        const chordDuration = (60 / bpmRef.current) * 4; 
        
        const chord = timelineRef.current[slotIndex];
        const v = fxRef.current;

        // Live-update Master Bus Parameters
        masterFilter.frequency.setValueAtTime(v.brightness, timeToPlay);
        masterDist.curve = makeDistortionCurve(v.dirt);
        masterDelay.delayTime.setValueAtTime((60 / bpmRef.current) * 0.75, timeToPlay); // Dotted 8th delay
        delayFeedback.gain.setValueAtTime(v.echo > 0 ? 0.3 : 0, timeToPlay);
        delayLevel.gain.setValueAtTime(v.echo, timeToPlay);

        // Schedule UI Update
        const uiTimeout = setTimeout(() => {
          if (isPlayingRef.current) setCurrentSlot(slotIndex);
        }, Math.max(0, (timeToPlay - ctx.currentTime) * 1000));
        timeoutsRef.current.push(uiTimeout);

        // Play Notes
        if (chord) {
          chord.notes.forEach((midiNote: number) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();

            // Apply Semitone shift to playback
            const shiftedMidi = midiNote + v.semitone;
            const freqHz = 440 * Math.pow(2, (shiftedMidi - 69) / 12);
            
            osc.frequency.setValueAtTime(freqHz, timeToPlay);
            osc.type = "triangle"; 

            noteGain.gain.setValueAtTime(0, timeToPlay);
            noteGain.gain.linearRampToValueAtTime(0.4, timeToPlay + 0.05);
            noteGain.gain.exponentialRampToValueAtTime(0.001, timeToPlay + chordDuration);

            osc.connect(noteGain);
            noteGain.connect(masterGain); // Send to master bus

            osc.start(timeToPlay);
            osc.stop(timeToPlay + chordDuration);
          });
        }

        nextNoteTime += chordDuration;
        currentStep++;

        if (currentStep >= timelineLenRef.current) {
          if (!isLoopingRef.current) {
            const stopT = setTimeout(stopPlayback, (timeToPlay + chordDuration - ctx.currentTime) * 1000);
            timeoutsRef.current.push(stopT);
            return;
          }
          currentStep = 0; 
        }
      }
      const timerID = setTimeout(scheduler, 25);
      timeoutsRef.current.push(timerID);
    };

    scheduler();
  };

  // --- EXPORT MIDI (With Semitone Shift!) ---
  const generateMidiURI = () => {
    const track = new MidiWriter.Track();
    track.setTempo(bpm);
    
    timeline.forEach(chord => {
      if (!chord) {
        track.addEvent(new MidiWriter.NoteEvent({ pitch: [0], duration: '1', velocity: 0 }));
      } else {
        // Shift exported MIDI notes to match the user's Vibe knob!
        const shiftedNotes = chord.notes.map((n: number) => n + fx.semitone);
        track.addEvent(new MidiWriter.NoteEvent({ pitch: shiftedNotes, duration: '1', velocity: 80 }));
      }
    });
    return new MidiWriter.Writer(track).dataUri();
  };

  const gridClass = timelineLength === 4 ? "grid-cols-4" : "grid-cols-4 md:grid-cols-8";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        
        <header className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div className="flex items-center space-x-3 text-purple-400">
            <Music size={28} />
            <h1 className="text-3xl font-bold tracking-tight text-white">MIDI Sequencer Studio</h1>
          </div>
          <Link href="/" className="flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="mr-2" size={16} /> Back to Generator
          </Link>
        </header>

        {/* TOP: THE TIMELINE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h2 className="font-bold text-lg text-zinc-300">Progression Timeline</h2>
            
            <div className="flex items-center space-x-4">
              <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                <button onClick={() => handleLengthChange(4)} className={`px-4 py-1 rounded-md text-sm font-bold transition-all ${timelineLength === 4 ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>4 Bars</button>
                <button onClick={() => handleLengthChange(8)} className={`px-4 py-1 rounded-md text-sm font-bold transition-all ${timelineLength === 8 ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>8 Bars</button>
              </div>
              <button onClick={() => setTimeline(Array(timelineLength).fill(null))} className="text-sm text-red-400 hover:text-red-300 flex items-center">
                <Trash2 size={14} className="mr-1" /> Clear
              </button>
            </div>
          </div>
          
          <div className={`grid gap-3 mb-2 h-8 ${gridClass}`}>
            {timeline.map((_, index) => (
              <div key={`arrow-${index}`} className="flex justify-center items-end">
                {currentSlot === index && <ArrowDown className="text-purple-500 animate-bounce" size={28} />}
              </div>
            ))}
          </div>

          <div className={`grid gap-3 ${gridClass}`}>
            {timeline.map((chord, index) => (
              <div 
                key={index} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, index)}
                className={`relative h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                  currentSlot === index ? "border-purple-500 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105 z-10" 
                  : chord ? "border-zinc-700 bg-zinc-800" : "border-dashed border-zinc-800 bg-zinc-950/50"
                }`}
              >
                {chord ? (
                  <>
                    <span className="text-xl font-bold text-white">{chord.root}</span>
                    <span className="text-xs text-zinc-400 font-medium">{chord.type}</span>
                    <button onClick={() => clearSlot(index)} className="absolute top-1 right-1 text-zinc-500 hover:text-red-400 opacity-0 hover:opacity-100 transition-opacity">
                      <Square size={12} />
                    </button>
                  </>
                ) : <span className="text-xs text-zinc-600">Drop Here</span>}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800 mt-6">
            <div className="flex items-center space-x-6">
              <button
                onClick={isPlaying ? stopPlayback : playSequence}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${isPlaying ? "bg-red-500 hover:bg-red-400" : "bg-purple-600 hover:bg-purple-500"}`}
              >
                {isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>
              
              <button onClick={() => setIsLooping(!isLooping)} className={`flex flex-col items-center justify-center transition-colors ${isLooping ? "text-purple-400" : "text-zinc-600"}`}>
                <Repeat size={24} />
                <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Loop</span>
              </button>

              <div className="h-8 w-[1px] bg-zinc-800 mx-2"></div>
              
              <div className="flex flex-col">
                <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Tempo</label>
                <div className="flex items-center space-x-3">
                  <input type="range" min="60" max="200" step="1" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} className="w-32 accent-purple-500" />
                  <span className="font-mono text-zinc-300 w-16">{bpm} BPM</span>
                </div>
              </div>
            </div>

            <a href={generateMidiURI()} download={`Progression_${bpm}BPM.mid`} className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 font-semibold py-3 px-6 rounded-xl flex items-center transition-all border border-emerald-900/50 shadow-lg">
              <Download className="mr-2" size={20} /> Export .mid
            </a>
          </div>
        </div>

        {/* MIDDLE: THE CHORD BUILDER */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="font-bold text-lg text-zinc-300 mb-6">Chord Builder Palette</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">1. Root Note</label>
              <div className="flex flex-wrap gap-2">
                {ROOTS.map(root => (
                  <button key={root} onClick={() => setSelectedRoot(root)} className={`w-12 h-10 rounded-lg font-bold text-sm transition-all ${selectedRoot === root ? "bg-zinc-200 text-zinc-900 shadow-md" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                    {root}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">2. Category</label>
              <div className="grid grid-cols-2 gap-2">
                {CHORD_TYPES.map(type => (
                  <button key={type.name} onClick={() => setSelectedType(type)} className={`px-3 py-2 rounded-lg font-medium text-xs transition-all text-left ${selectedType.name === type.name ? "bg-zinc-200 text-zinc-900 shadow-md" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 flex flex-col items-center justify-center border-l border-zinc-800 pl-8">
              <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider text-center">3. Drag this to timeline</label>
              <div draggable onDragStart={handleDragStart} className="w-32 h-32 bg-zinc-800 border-2 border-zinc-600 rounded-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:border-purple-400 transition-all group">
                <span className="text-3xl font-bold text-white group-hover:text-purple-400 transition-colors">{selectedRoot}</span>
                <span className="text-sm text-zinc-400 font-medium">{selectedType.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* THE VIBE RACK (FX) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-50"></div>
          <div className="flex items-center mb-6">
            <Settings2 className="text-purple-400 mr-2" />
            <h2 className="font-bold text-lg text-zinc-200">Synth Vibe Rack</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3"><label>Semitone</label><span className="text-purple-400">{fx.semitone > 0 ? `+${fx.semitone}` : fx.semitone}</span></div>
              <input type="range" min="-12" max="12" step="1" value={fx.semitone} onChange={(e) => updateFx("semitone", parseInt(e.target.value))} className="w-full accent-purple-500" />
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3"><label>Cutoff</label><span className="text-blue-400">{fx.brightness} Hz</span></div>
              <input type="range" min="200" max="5000" step="10" value={fx.brightness} onChange={(e) => updateFx("brightness", parseInt(e.target.value))} className="w-full accent-blue-500" />
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3"><label>Distortion</label><span className="text-orange-400">{fx.dirt}%</span></div>
              <input type="range" min="0" max="100" step="1" value={fx.dirt} onChange={(e) => updateFx("dirt", parseInt(e.target.value))} className="w-full accent-orange-500" />
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3"><label>Echo Delay</label><span className="text-emerald-400">{Math.round(fx.echo * 100)}%</span></div>
              <input type="range" min="0" max="1" step="0.05" value={fx.echo} onChange={(e) => updateFx("echo", parseFloat(e.target.value))} className="w-full accent-emerald-500" />
            </div>
          </div>
        </div>

        {/* BOTTOM: STOCK PROGRESSIONS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="font-bold text-lg text-zinc-300 mb-6">Stock Progressions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRESET_PACKS.map((pack) => (
              <div key={pack.name} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white text-lg">{pack.name}</h3>
                    <span className="text-xs font-bold text-purple-400 bg-purple-900/30 px-2 py-1 rounded-full uppercase tracking-wider">{pack.mood}</span>
                  </div>
                  <div className="flex space-x-2 text-sm text-zinc-400 overflow-hidden">
                    {pack.chords.map((c, i) => (
                      <span key={i} className="bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700 whitespace-nowrap">{c.root} {c.type}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => loadPreset(pack.chords)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center transition-colors border border-zinc-700">
                  <PlusCircle size={16} className="mr-2 text-purple-400" /> Load to Timeline
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
