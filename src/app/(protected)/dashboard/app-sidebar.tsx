"use client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import useProject from "@/hooks/use-project";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import {
  Bot,
  Coins,
  CreditCard,
  LayoutDashboard,
  Plus,
  Presentation,
} from "lucide-react";
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
    title: "Meetings",
    url: "/meetings",
    icon: Presentation,
  },

  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
];

export function AppSideBar() {
  const pathName = usePathname();
  const { open } = useSidebar();
  const { projects, projectId, setProjectId } = useProject();
  const { data: credits } = api.project.getMyCredits.useQuery();
  
  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <div className="flex justify-center">
          <Image src="/logo.png" alt="logo" width={100} height={100}></Image>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          {
                            "bg-primary! text-white!": pathName === item.url,
                          },
                          "list-none",
                        )}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Your Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((project) => {
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild>
                      <div
                        onClick={() => {
                          setProjectId(project.id);
                        }}
                      >
                        <div
                          className={cn(
                            "text-primary flex size-6 justify-center rounded-sm border bg-white text-sm",
                            {
                              "bg-primary text-white": project.id === projectId,
                            },
                          )}
                        >
                          {project.name[0]}
                        </div>
                        <span>{project.name}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <div className="h-2"></div>
              {open && (
                <SidebarMenuItem>
                  <Link href="/create">
                    <Button size="sm" variant={"outline"} className="w-fit">
                      <Plus />
                      Create Project
                    </Button>
                  </Link>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Credits Footer */}
      {open && (
        <SidebarFooter className="p-3">
          <Link
            href="/billing"
            className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3 transition-all hover:bg-muted"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-200 text-zinc-600">
              <Coins className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{credits ?? 0}</p>
              <p className="text-xs text-muted-foreground">Credits</p>
            </div>
          </Link>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
