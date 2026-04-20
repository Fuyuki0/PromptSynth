"use client";

import { useEffect, useState } from "react";
import { Download, Library as LibraryIcon, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function Library() {
  const [presets, setPresets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/library")
      .then(res => res.json())
      .then(data => {
        setPresets(data);
        setIsLoading(false);
      });
  }, []);

  const handleDownload = (preset: any) => {
    const blob = new Blob([preset.vitalFileContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PromptSynth-${preset.category}-${preset.id.slice(0,5)}.vital`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Navigation */}
        <header className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div className="flex items-center space-x-3 text-purple-400">
            <LibraryIcon size={28} />
            <h1 className="text-3xl font-bold tracking-tight text-white">Preset Library</h1>
          </div>
          <Link 
            href="/" 
            className="flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2" size={16} /> Back to Generator
          </Link>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Loading your sound library...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && presets.length === 0 && (
          <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
            <p className="text-zinc-400 mb-4">Your library is currently empty.</p>
            <Link href="/" className="text-purple-400 hover:text-purple-300 font-medium">
              Go generate your first sound →
            </Link>
          </div>
        )}

        {/* Preset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {presets.map((preset) => (
            <div key={preset.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-full">
                    {preset.category}
                  </span>
                  <span className="text-zinc-600 text-xs font-mono">
                    {new Date(preset.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h2 className="text-xl font-bold capitalize text-white mb-2">{preset.mood}</h2>
                <p className="text-sm text-zinc-500 italic mb-6 leading-relaxed line-clamp-2">
                  "{preset.prompt}"
                </p>
              </div>

              <div className="flex mt-auto">
                <button
                  onClick={() => handleDownload(preset)}
                  className="w-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 font-semibold py-3 rounded-lg flex items-center justify-center transition-colors border border-emerald-900/50"
                >
                  <Download className="mr-2" size={18} /> Download .vital
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
