import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Outlet } from "@tanstack/react-router"

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <header className="flex h-12 shrink-0 items-center gap-4 border-b bg-muted/40 px-4 lg:px-6">
          <SidebarTrigger />
          <div className="w-full flex-1">
            <h1 className="text-sm font-medium text-muted-foreground">Dashboard</h1>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
