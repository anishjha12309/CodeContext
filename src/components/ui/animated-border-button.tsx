"use client";

import React, { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

function MovingBorder({
  children,
  duration = 2000,
  rx,
  ry,
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
}) {
  const pathRef = useRef<SVGRectElement>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      progress.set((time * (length / duration)) % length);
    }
  });

  const x = useTransform(progress, (val) =>
    pathRef.current?.getPointAtLength(val).x ?? 0,
  );
  const y = useTransform(progress, (val) =>
    pathRef.current?.getPointAtLength(val).y ?? 0,
  );

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
      >
        <rect fill="none" width="100%" height="100%" rx={rx} ry={ry} ref={pathRef} />
      </svg>
      <motion.div style={{ position: "absolute", top: 0, left: 0, transform }}>
        {children}
      </motion.div>
    </>
  );
}

export function HoverBorderGradient({
  children,
  className,
  containerClassName,
  as: Component = "button",
  duration = 2200,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  as?: React.ElementType;
  duration?: number;
  [key: string]: unknown;
}) {
  return (
    <Component
      className={cn(
        "relative h-min w-fit overflow-hidden rounded-lg p-px",
        containerClassName,
      )}
      {...props}
    >
      <div className="absolute inset-0 rounded-[inherit]">
        <MovingBorder duration={duration} rx="8" ry="8">
          <div className="h-16 w-16 bg-[radial-gradient(circle,rgba(56,189,248,0.9)_0%,rgba(56,189,248,0.3)_40%,transparent_70%)] opacity-90" />
        </MovingBorder>
      </div>

      <div
        className={cn(
          "relative z-10 flex items-center gap-2 rounded-[inherit] bg-[#0a0a0a] px-6 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-colors duration-300 hover:bg-[#0d1117]",
          className,
        )}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {children}
      </div>
    </Component>
  );
}
