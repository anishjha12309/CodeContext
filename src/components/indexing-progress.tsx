"use client";

import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Circle, Code2, FileText, Cpu, GitCommit } from "lucide-react";

type IndexingPhase = "loading" | "summarizing" | "embedding" | "commits" | "complete";

interface Props {
  isActive: boolean;
  projectName?: string;
}

const PHASES = [
  { id: "loading", label: "Loading repository files", icon: Code2 },
  { id: "summarizing", label: "Summarizing code with AI", icon: FileText },
  { id: "embedding", label: "Generating embeddings", icon: Cpu },
  { id: "commits", label: "Processing commits", icon: GitCommit },
] as const;

export function IndexingProgress({ isActive, projectName }: Props) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [dots, setDots] = useState("");

  // Simulate progress through phases
  useEffect(() => {
    if (!isActive) return;

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);

    // Progress through phases (simulated timing)
    const phaseTimings = [3000, 8000, 4000, 3000]; // Approximate phase durations
    let totalTime = 0;
    
    const phaseTimeouts = phaseTimings.map((time, index) => {
      totalTime += time;
      return setTimeout(() => {
        if (index < PHASES.length - 1) {
          setCurrentPhase(index + 1);
        }
      }, totalTime);
    });

    return () => {
      clearInterval(dotsInterval);
      phaseTimeouts.forEach(clearTimeout);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Creating Project{dots}
          </h2>
          {projectName && (
            <p className="mt-1 text-sm text-gray-500">{projectName}</p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {PHASES.map((phase, index) => {
            const Icon = phase.icon;
            const isComplete = index < currentPhase;
            const isCurrent = index === currentPhase;
            const isPending = index > currentPhase;

            return (
              <div
                key={phase.id}
                className={`flex items-center gap-3 rounded-lg p-3 transition-all ${
                  isCurrent
                    ? "bg-primary/5 ring-1 ring-primary/20"
                    : isComplete
                      ? "bg-green-50"
                      : "bg-gray-50"
                }`}
              >
                {/* Status Icon */}
                <div className="shrink-0">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>

                {/* Phase Icon */}
                <div
                  className={`shrink-0 rounded-md p-1.5 ${
                    isCurrent
                      ? "bg-primary/10 text-primary"
                      : isComplete
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Label */}
                <span
                  className={`text-sm font-medium ${
                    isCurrent
                      ? "text-primary"
                      : isComplete
                        ? "text-green-700"
                        : "text-gray-400"
                  }`}
                >
                  {phase.label}
                  {isCurrent && <span className="ml-1">{dots}</span>}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          This may take a few minutes for larger repositories
        </p>
      </div>
    </div>
  );
}
