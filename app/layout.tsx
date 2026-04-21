import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PromptSynth",
  description: "AI Sound Designer for Vital",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 1. ClerkProvider MUST wrap the entire application
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* THE SLEDGEHAMMER: Bypasses Next.js and forces the browser to refresh on Alt+Left */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.onpageshow = function(event) {
                  if (event.persisted) {
                    window.location.reload();
                  }
                };
              `,
            }}
          />
        </head>
        {/* 2. Apply the Inter font to the body */}
        <body className={inter.className}>
          <div className="flex min-h-screen bg-zinc-950 text-white">
            {/* 3. Your Sidebar goes here so it shows on every page */}
            <Sidebar />
            
            {/* 4. The main content area (pushed to the right of the fixed 64px/16rem sidebar) */}
            <main className="flex-1 ml-64">
              {children}
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
