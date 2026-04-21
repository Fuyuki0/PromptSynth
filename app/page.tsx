"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Loader2, Wand2, Download, SlidersHorizontal, Library, Music, Zap } from "lucide-react";

export default function Home() {
	const [prompt, setPrompt] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [recipe, setRecipe] = useState<any>(null);
	const { isLoaded, isSignedIn } = useAuth();
	const [showPaywall, setShowPaywall] = useState(false);
	const [credits, setCredits] = useState<number | null>(null);
	const [isPro, setIsPro] = useState(false);
	const [loadingText, setLoadingText] = useState("Synthesizing Patch...");

	const handleGenerate = async () => {
		if (!prompt) return;

		setIsGenerating(true);
		setDownloadUrl(null);
		setRecipe(null);
		setShowPaywall(false);

		// Array of cool statuses to show the user what is happening
		const statuses = [
			"Analyzing prompt...",
			"Programming oscillators...",
			"Routing modulation matrix...",
			"Applying OTT compression...",
			"Compiling .vital file..."
		];

		let i = 0;
		setLoadingText(statuses[0]);

		// Change the text every 2.5 seconds
		const statusInterval = setInterval(() => {
			i = (i + 1) % statuses.length;
			setLoadingText(statuses[i]);
		}, 2500);

		try {
			const response = await fetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt }),
			});

			if (response.status === 403) {
				setShowPaywall(true);
				return;
			}

			if (!response.ok) {
				if (response.status === 503) {
					alert("The AI is currently experiencing very high demand. Please wait a few seconds and try generating again!");
				} else {
					alert("Oops! Something went wrong while generating the sound.");
				}
				return;
			}


			const data = await response.json();
			const blob = new Blob([data.vitalFileContent], { type: "application/json" });
			const url = URL.createObjectURL(blob);

			setDownloadUrl(url);
			setRecipe(data.recipe);
			// Tell the Sidebar to refresh its credit count!
			window.dispatchEvent(new Event("credits-updated"));
		} catch (error) {
			console.error(error);
			alert("Something went wrong during generation.");
		} finally {
			clearInterval(statusInterval); // Stop the text animation
			setIsGenerating(false);
		}
	};

	const handleModalUpgrade = async () => {
		try {
			const response = await fetch("/api/stripe/checkout", { method: "POST" });
			const data = await response.json();
			if (data.url) window.location.href = data.url;
		} catch (error) {
			alert("Checkout is currently unavailable.");
		}
	};

	const fetchCredits = async () => {
		if (!isSignedIn) return;
		try {
			const res = await fetch("/api/user");
			const data = await res.json();
			setCredits(data.credits);
			setIsPro(data.isPro);
		} catch (error) {
			console.error("Failed to fetch credits");
		}
	};

	useEffect(() => {
		fetchCredits();
	}, [isSignedIn]);

	return (
		<div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-purple-500/30">
			<div className="max-w-3xl mx-auto space-y-8">

				{/* Header */}
				<header className="flex items-center justify-between space-y-2 border-b border-zinc-800 pb-6">
					<div>
						<div className="flex items-center space-x-3 text-purple-400">
							<SlidersHorizontal size={28} />
							<h1 className="text-3xl font-bold tracking-tight text-white">PromptSynth</h1>
						</div>
						<p className="text-zinc-400 text-lg mt-1">
							AI Sound Designer for Vital.
						</p>
					</div>
				</header>

				{/* Generator Box */}
				<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
					<textarea
						rows={4}
						placeholder="Describe your perfect synth sound..."
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all"
					/>
					<button
						onClick={handleGenerate}
						disabled={isGenerating || !prompt}
						className="w-full mt-4 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center transition-colors shadow-lg"
					>
						{isGenerating ? <><Loader2 className="animate-spin mr-2" size={20} /> {loadingText}</> : <><Wand2 className="mr-2" size={20} /> Generate</>}
					</button>
				</div>

				{/* Minimal Results Box */}
				{recipe && downloadUrl && (
					<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
						<div className="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
							<div>
								<span className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1 block">Success</span>
								<h2 className="text-2xl font-bold capitalize text-white">{recipe.mood} {recipe.category}</h2>
							</div>
							<a
								href={downloadUrl}
								download={`PromptSynth-${recipe.category}.vital`}
								className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-emerald-900/20"
							>
								<Download className="mr-2" size={20} />
								Download .vital
							</a>
						</div>
					</div>
				)}
				{/* THE PRO PAYWALL MODAL */}
				{showPaywall && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-300">
						<div className="bg-zinc-900 border border-purple-500/30 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">

							{/* Background Glow */}
							<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-purple-600/20 blur-3xl rounded-full"></div>

							<div className="relative z-10 flex flex-col items-center text-center">
								<div className="w-16 h-16 bg-purple-900/50 text-purple-400 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30">
									<Wand2 size={32} />
								</div>

								<h2 className="text-3xl font-bold text-white mb-2">Out of Credits!</h2>
								<p className="text-zinc-400 mb-8 leading-relaxed">
									You've used all 5 of your free sound generations. Upgrade to <span className="text-purple-400 font-bold">PromptSynth Pro</span> to unlock unlimited AI sound design.
								</p>

								<button
									onClick={handleModalUpgrade}
									className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02]"
								>
									Upgrade to Pro - $10/mo
								</button>

								<button
									onClick={() => setShowPaywall(false)}
									className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 font-medium"
								>
									Maybe later
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
