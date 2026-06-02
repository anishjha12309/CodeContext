"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { usePathname } from "next/navigation";
import { useProject } from "@/hooks/use-project";
import { api } from "@/trpc/react";
import {
  Bot,
  CreditCard,
  LayoutDashboard,
  Mic,
  Plus,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { syncUser } from "./actions/sync-user";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/qa", label: "Q&A", icon: Bot },
  { href: "/meetings", label: "Meetings", icon: Mic },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { projects, project, projectId, setProjectId } = useProject();
  const { data: credits } = api.project.getMyCredits.useQuery();
  const [projectsOpen, setProjectsOpen] = useState(false);

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/8 dark:border-white/6 px-5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-5 w-auto text-zinc-900 dark:text-white" />
          <span className="gradient-text text-lg font-semibold">CodeContext</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-300"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-sky-500 dark:text-sky-400" : "text-current",
                )}
              />
              {item.label}
            </Link>
          );
        })}

        <div className="my-2 border-t border-black/6 dark:border-white/6" />

        {/* Project switcher */}
        <p
          className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-600"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Projects
        </p>

        <button
          onClick={() => setProjectsOpen((o) => !o)}
          className="glass-app flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 transition-colors hover:text-zinc-900 dark:hover:text-white"
        >
          <span className="truncate">{project?.name ?? "Select project"}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              projectsOpen && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence>
          {projectsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-0.5 pb-1">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProjectId(p.id);
                      setProjectsOpen(false);
                      onClose?.();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      p.id === projectId
                        ? "bg-sky-500/8 text-sky-600 dark:text-sky-300"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white",
                    )}
                  >
                    <div
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        p.id === projectId
                          ? "bg-sky-400"
                          : "bg-zinc-300 dark:bg-zinc-600",
                      )}
                    />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}

                <Link
                  href="/create"
                  onClick={onClose}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/5 hover:text-sky-600 dark:hover:text-sky-400"
                >
                  <Plus className="h-4 w-4" />
                  New project
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Bottom: credits + user + theme toggle */}
      <div className="shrink-0 space-y-2 border-t border-black/8 dark:border-white/6 p-3">
        <div className="glass-app flex items-center justify-between rounded-xl px-3 py-2.5">
          <span
            className="text-xs text-zinc-500"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Credits
          </span>
          <span className="text-sm font-bold text-sky-600 dark:text-sky-300">
            {credits ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-1 py-0.5">
          <div className="flex items-center gap-2.5">
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
            <span className="text-xs text-zinc-500">Account</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    void syncUser();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-[#121212]">
      {/* Ambient orbs for depth */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/5" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-cyan-400/8 blur-3xl dark:bg-sky-600/4" />
        <div className="absolute right-1/4 top-1/2 h-72 w-72 rounded-full bg-sky-300/6 blur-3xl dark:bg-sky-400/3" />
      </div>

      {/* Desktop sidebar */}
      <aside className="glass-app-nav fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-black/8 dark:border-white/6 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile: backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile: slide-in sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="glass-app-nav fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-black/8 dark:border-white/6 lg:hidden"
          >
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile top bar */}
      <div className="glass-app-nav fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-black/8 dark:border-white/6 px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Logo className="h-5 w-auto text-zinc-900 dark:text-white" />
          <span className="gradient-text font-semibold">CodeContext</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-xl p-2 text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-black/8 dark:hover:bg-white/8"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 pt-14 lg:ml-64 lg:pt-0">
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
