"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Library, Music, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { SignInButton, UserButton, useAuth, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // --- THE TRAP SETTER ---
  const handleUpgrade = async () => {
    try {
      setIsCheckoutLoading(true);
      const response = await fetch("/api/stripe/checkout", { method: "POST" });

      if (!response.ok) throw new Error("Checkout failed");

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url; // Teleport to Stripe!

        // THE GHOST TIMEOUT:
        // This timer freezes when they leave. When they Alt+Left back, it unfreezes and unlocks the button!
        setTimeout(() => {
          setIsCheckoutLoading(false);
        }, 1000);
      }
    } catch (error) {
      alert("Checkout is currently unavailable.");
      setIsCheckoutLoading(false);
    }
	  };

  // --- THE TRAP CATCHER ---
  useEffect(() => {
    // 1. Catch Stripe's official return buttons (?success or ?canceled)
    if (searchParams.get("success") || searchParams.get("canceled")) {
      window.location.replace(pathname); 
      return; 
    }

    // 2. Just in case React wakes up normally, check the trap
    if (sessionStorage.getItem("stripe_trap") === "true") {
      sessionStorage.removeItem("stripe_trap");
      window.location.reload();
      return;
    }

    const fetchCredits = async () => {
      if (!isSignedIn) return;
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setCredits(data.credits);
        setIsPro(data.isPro);
      } catch (error) {
        console.error("Failed to fetch credits");
      }
    };

	// 3. THE GENTLE UNPAUSE LISTENER
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsCheckoutLoading(false); // Instantly unlock the button!
        fetchCredits(); // Silently get fresh credits from the database
      }
    };


    // 4. Tab Switch Listener (Fixes the stuck button if they switch tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setIsCheckoutLoading(false);
        fetchCredits();
      }
    };

    // Run once on mount
    fetchCredits();

    // Attach all the security cameras
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("credits-updated", fetchCredits);

    return () => {
      // Turn off the cameras when the component dies
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("credits-updated", fetchCredits);
    };
  }, [isSignedIn, pathname, searchParams]);

  const navLinks = [
    { name: "Generator", path: "/", icon: <SlidersHorizontal size={20} /> },
    { name: "Chords", path: "/chords", icon: <Music size={20} /> },
    { name: "My Sounds", path: "/library", icon: <Library size={20} /> },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 h-screen fixed left-0 top-0 flex flex-col p-4 z-50">
      
      {/* Brand Logo */}
      <div className="flex items-center space-x-3 text-purple-400 mb-10 mt-2 px-2">
        <SlidersHorizontal size={28} />
        <h1 className="text-2xl font-bold tracking-tight text-white">PromptSynth</h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2">
        {navLinks.map((link) => {
          if (link.name === "My Sounds" && !isSignedIn) return null; 
          
          const isActive = pathname === link.path;
          return (
            <Link
              key={link.name}
              href={link.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? "bg-purple-600/10 text-purple-400 border border-purple-500/30 shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {link.icon}
              <span className="font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>

	  {/* Footer Area (Auth & Billing) */}
      <div className="pt-4 border-t border-zinc-800 space-y-4">

        {/* 1. This shows automatically while Clerk is waking up */}
        <ClerkLoading>
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto"></div>
        </ClerkLoading>

        {/* 2. This shows automatically when Clerk is ready */}
        <ClerkLoaded>
          {!isSignedIn ? (
            <div className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl text-white font-medium transition-colors cursor-pointer text-center">
              <SignInButton mode="modal" />
            </div>
          ) : (
            <div className="flex flex-col space-y-4">

              {!isPro && credits !== null && (
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 text-sm font-medium">
                  <span className="flex items-center"><Zap size={16} className="mr-2 text-yellow-500" /> Credits</span>
                  <span className="text-white font-bold">{credits}</span>
                </div>
              )}

              <button
                onClick={handleUpgrade}
                disabled={isCheckoutLoading}
                className="w-full py-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/50 text-purple-400 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckoutLoading ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading Stripe...
                  </span>
                ) : (
                  "⚡ Get Pro"
                )}
              </button>

              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 rounded-xl">
                <span className="text-sm text-zinc-400">Account</span>
                <UserButton afterSignOutUrl="/" />
              </div>

            </div>
          )}
        </ClerkLoaded>

      </div>
    </aside>
  );
}
