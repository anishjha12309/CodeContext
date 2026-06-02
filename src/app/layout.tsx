import "./globals.css";
import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "sonner";
import { Playfair_Display, Inter, Roboto_Mono } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CodeContext",
  description: "AI-powered codebase intelligence",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "#0ea5e9" } }}>
      <html lang="en" className="dark scroll-smooth">
        <body
          className={`${inter.variable} ${playfair.variable} ${robotoMono.variable} min-h-screen bg-[#080808] font-sans antialiased`}
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <TRPCReactProvider>
            {children}
            <Toaster richColors theme="dark" position="bottom-right" />
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
