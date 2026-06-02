import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1 text-base shadow-xs backdrop-blur-sm transition-[color,box-shadow] outline-none selection:bg-sky-500/30 selection:text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-zinc-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-sky-500/50 focus-visible:ring-[3px] focus-visible:ring-sky-500/15",
        "aria-invalid:border-red-500/30 aria-invalid:ring-red-500/10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
