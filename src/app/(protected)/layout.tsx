"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { usePathname } from "next/navigation";
import { useProject } from "@/hooks/use-project";
import { useRefetch } from "@/hooks/use-refetch";
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
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { syncUser } from "./actions/sync-user";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/qa", label: "Q&A", icon: Bot },
  { href: "/meetings", label: "Meetings", icon: Mic },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { projects, project, projectId, setProjectId } = useProject();
  const { data: credits } = api.project.getMyCredits.useQuery();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const refetch = useRefetch();

  const archiveProject = api.project.archiveProject.useMutation({
    onSuccess: async () => {
      await refetch();
      toast.success("Project deleted");
    },
    onError: () => toast.error("Failed to delete project"),
  });

  function handleDelete(id: string, name: string) {
    toast("Delete project?", {
      description: `"${name}" and all its data will be removed.`,
      action: {
        label: "Delete",
        onClick: () => {
          archiveProject.mutate({ projectId: id });
          if (id === projectId) {
            setProjectId("");
            router.push("/dashboard");
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
      duration: 8000,
    });
  }

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/8 px-5 dark:border-white/8">
        <div className="flex items-center">
          <Logo className="mt-px h-5 w-auto text-zinc-900 dark:text-white" />
          <span className="text-lg font-semibold text-zinc-900 dark:text-white">
            CodeContext
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white"
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
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                active
                  ? "app-nav-active text-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:bg-black/4 hover:text-zinc-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-white/40",
                )}
              />
              {item.label}
            </Link>
          );
        })}

        <div className="my-2 border-t border-black/6 dark:border-white/8" />

        {/* Project switcher */}
        <p
          className="mb-1.5 px-3 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase dark:text-white/25"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Projects
        </p>

        <button
          onClick={() => setProjectsOpen((o) => !o)}
          className="ios-field flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:text-zinc-900 dark:text-white/70 dark:hover:text-white"
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
                  <div key={p.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => {
                        setProjectId(p.id);
                        setProjectsOpen(false);
                        onClose?.();
                      }}
                      className={cn(
                        "flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
                        p.id === projectId
                          ? "bg-black/5 text-zinc-900 dark:bg-white/8 dark:text-white"
                          : "text-zinc-500 hover:bg-black/4 hover:text-zinc-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white",
                      )}
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          p.id === projectId
                            ? "bg-zinc-900 dark:bg-white"
                            : "bg-zinc-300 dark:bg-white/20",
                        )}
                      />
                      <span className="truncate">{p.name}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id, p.name);
                      }}
                      disabled={archiveProject.isPending}
                      className="shrink-0 rounded-md p-1 text-zinc-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 dark:text-white/25"
                      aria-label="Delete project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Link
                  href="/create"
                  onClick={onClose}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-black/4 hover:text-zinc-900 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
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
      <div className="shrink-0 space-y-2 border-t border-black/8 p-3 dark:border-white/8">
        <div className="ios-field flex items-center justify-between rounded-xl px-3 py-2.5">
          <span
            className="text-xs text-zinc-500 dark:text-white/40"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Credits
          </span>
          <span className="font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
            {credits ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-1 py-0.5">
          <div className="flex items-center gap-2.5">
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
            <span className="text-xs text-zinc-500 dark:text-white/40">
              Account
            </span>
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
    <div className="app-shell flex min-h-screen">

      {/* Desktop sidebar */}
      <aside className="glass-app-nav fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-black/8 lg:flex dark:border-white/8">
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
            className="glass-app-nav fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-black/8 lg:hidden dark:border-white/8"
          >
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile top bar */}
      <div className="glass-app-nav fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-black/8 px-4 lg:hidden dark:border-white/8">
        <div className="flex items-center gap-2">
          <Logo className="h-5 w-auto text-zinc-900 dark:text-white" />
          <span className="font-semibold text-zinc-900 dark:text-white">CodeContext</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="ios-pressable rounded-xl p-2 text-zinc-600 hover:bg-black/8 dark:text-zinc-400 dark:hover:bg-white/8"
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
