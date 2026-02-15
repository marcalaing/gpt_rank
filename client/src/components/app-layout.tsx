import { ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AlertNotification {
  id: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

function NotificationBell() {
  const { data: notifications = [] } = useQuery<AlertNotification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });
  
  const unreadCount = notifications.filter(n => !n.acknowledged).length;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-medium">Notifications</h4>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {notifications.slice(0, 10).map((n) => (
                <div 
                  key={n.id}
                  className={`text-sm p-2 rounded ${n.acknowledged ? "bg-muted/50" : "bg-muted"}`}
                >
                  <p className={n.acknowledged ? "text-muted-foreground" : ""}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
          {notifications.length > 0 && (
            <Link href="/app/projects" className="text-sm text-primary hover:underline">
              View all in project alerts
            </Link>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppLayout({ children, breadcrumbs = [] }: AppLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-14 items-center gap-4 border-b px-4 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Separator orientation="vertical" className="h-6" />
            
            {breadcrumbs.length > 0 && (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((item, index) => (
                    <BreadcrumbItem key={item.label}>
                      {index > 0 && <BreadcrumbSeparator />}
                      {item.href ? (
                        <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}

            <div className="flex-1" />
            <NotificationBell />
            <ThemeToggle />
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
