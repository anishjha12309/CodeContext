import { SidebarProvider } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import { AppSideBar } from "./dashboard/app-sidebar";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MobileSidebarContent } from "./dashboard/mobile-app-sidebar";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

type Props = {
  children: React.ReactNode;
};

const SidebarLayout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <AppSideBar />
      <main className="m-2 w-full">
        <div className="border-sidebar-border bg-sidebar flex items-center gap-2 rounded-md border p-2 px-4 shadow">
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <button className="flex items-center justify-center rounded-md p-2 hover:bg-gray-100">
                <Menu className="h-6 w-6 text-black" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-white p-0">
              <VisuallyHidden>
                <SheetTitle>Navigation Menu</SheetTitle>
              </VisuallyHidden>
              <MobileSidebarContent />
            </SheetContent>
          </Sheet>

          <div className="ml-auto"></div>
          <UserButton />
        </div>
        <div className="h-4"></div>
        <div className="border-sidebar-border bg-sidebar h-[calc(100vh-6rem)] overflow-y-scroll rounded-md border p-4 shadow">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
};

export default SidebarLayout;
