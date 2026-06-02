"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/logo";
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

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { projects, project, projectId, setProjectId } = useProject();
  const { data: credits } = api.project.getMyCredits.useQuery();
  const [projectsOpen, setProjectsOpen] = useState(false);

  useEffect(() => {
    void syncUser();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#080808]">
      {/* Sidebar */}
      <aside className="glass-nav fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/6">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-white/6 px-5">
          <Logo className="h-5 w-auto text-white" />
          <span className="gradient-text text-lg font-semibold">
            CodeContext
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "glow-sky bg-sky-500/15 text-sky-300"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* Project Switcher */}
          <div className="mt-4">
            <p
              className="mb-1 px-3 text-[10px] font-semibold tracking-widest text-zinc-600 uppercase"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Projects
            </p>

            <button
              onClick={() => setProjectsOpen((o) => !o)}
              className="glass flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:text-white"
            >
              <span className="truncate">
                {project?.name ?? "Select project"}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
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
                  className="mt-1 overflow-hidden"
                >
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setProjectId(p.id);
                        setProjectsOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        p.id === projectId
                          ? "text-sky-300"
                          : "text-zinc-400 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          p.id === projectId ? "bg-sky-400" : "bg-zinc-600",
                        )}
                      />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}

                  <Link
                    href="/create"
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-white/5 hover:text-sky-400"
                  >
                    <Plus className="h-4 w-4" />
                    New project
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Credits + User */}
        <div className="space-y-2 border-t border-white/6 p-3">
          <div className="glass flex items-center justify-between rounded-lg px-3 py-2">
            <span
              className="text-xs text-zinc-500"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Credits
            </span>
            <span className="text-sm font-semibold text-sky-300">
              {credits ?? "—"}
            </span>
          </div>
          <div className="flex items-center gap-3 px-1">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
            <span className="text-xs text-zinc-500">Account</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
