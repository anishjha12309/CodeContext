"use client";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 sm:p-6 dark:from-black dark:via-gray-950 dark:to-gray-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 h-full w-full animate-pulse rounded-full bg-gradient-to-br from-gray-400/10 to-gray-600/10 blur-3xl dark:from-gray-700/10 dark:to-gray-500/10" />
        <div className="absolute -right-1/2 -bottom-1/2 h-full w-full animate-pulse rounded-full bg-gradient-to-tl from-gray-500/10 to-gray-700/10 blur-3xl delay-1000 dark:from-gray-600/10 dark:to-gray-400/10" />
      </div>

      <div className="animate-float pointer-events-none absolute top-20 left-20 hidden h-72 w-72 rounded-full bg-gray-400/20 blur-3xl sm:block dark:bg-gray-700/20" />
      <div className="animate-float-delayed pointer-events-none absolute right-20 bottom-20 hidden h-96 w-96 rounded-full bg-gray-500/20 blur-3xl sm:block dark:bg-gray-600/20" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808033_1px,transparent_1px),linear-gradient(to_bottom,#80808033_1px,transparent_1px)] bg-[size:14px_24px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="clerk-signup-wrapper">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300",
                card: "bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50",
                rootBox: "w-full",
                socialButtonsBlockButton:
                  "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300",
                formFieldInput:
                  "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-black dark:focus:ring-white transition-all duration-300",
                footerActionLink:
                  "text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300",
                identityPreviewEditButton:
                  "text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400",
                formFieldLabel: "text-gray-700 dark:text-gray-300",
                headerTitle: "text-gray-900 dark:text-white",
                headerSubtitle: "text-gray-600 dark:text-gray-400",
                socialButtonsBlockButtonText:
                  "text-gray-700 dark:text-gray-300",
                dividerLine: "bg-gray-300 dark:bg-gray-700",
                dividerText: "text-gray-500 dark:text-gray-500",
                footer: "bg-transparent",
                footerActionText: "text-gray-600 dark:text-gray-400",
              },
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(20px) translateX(-10px);
          }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
