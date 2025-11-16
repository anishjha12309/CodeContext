"use client";

import { Button } from "@/components/ui/button";
import useProject from "@/hooks/use-project";
import { cn } from "@/lib/utils";
import { Bot, CreditCard, LayoutDashboard, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Q&A",
    url: "/qa",
    icon: Bot,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
];

export function MobileSidebarContent() {
  const pathName = usePathname();
  const { projects, projectId, setProjectId } = useProject();

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo Header */}
      <div className="flex items-center justify-center border-b border-gray-200 p-4">
        <Image src="/logo.png" alt="logo" width={80} height={80} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Application Menu */}
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Application
          </h3>
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathName === item.url
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Projects Menu */}
        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Your Projects
          </h3>
          <div className="space-y-1">
            {projects?.map((project) => {
              return (
                <button
                  key={project.id}
                  onClick={() => setProjectId(project.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                    project.id === projectId
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-sm border text-sm font-semibold",
                      project.id === projectId
                        ? "border-white bg-white text-black"
                        : "border-gray-300 bg-white text-black",
                    )}
                  >
                    {project.name[0]}
                  </div>
                  <span>{project.name}</span>
                </button>
              );
            })}
          </div>

          {/* Create Project Button */}
          <div className="mt-4">
            <Link href="/create">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start border-black text-black hover:bg-black hover:text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
