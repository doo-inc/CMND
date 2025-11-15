
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Bell, Kanban, GitBranch, HandHeart, Clock, FileText } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const mainNavItems = [
  {
    title: "Dashboard",
    icon: Home,
    path: "/"
  },
  {
    title: "Customers",
    icon: Users,
    path: "/customers"
  },
  {
    title: "Contracts",
    icon: FileText,
    path: "/contracts"
  },
  {
    title: "Partnerships",
    icon: HandHeart,
    path: "/partnerships"
  },
  {
    title: "Subscription Tracker",
    icon: Clock,
    path: "/subscription-tracker"
  },
  {
    title: "Pipeline Map",
    icon: GitBranch,
    path: "/pipeline"
  },
  {
    title: "Tasks",
    icon: Kanban,
    path: "/tasks"
  }
];

const secondaryNavItems = [
  {
    title: "Notifications",
    icon: Bell,
    path: "/notifications"
  }
];

export function DashboardSidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className="border-0 transition-all duration-300 bg-transparent backdrop-blur-sm">
      <SidebarHeader className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center p-1">
            <img src="/lovable-uploads/7103ec49-9766-44ba-a938-b218c15a85e7.png" alt="DOO Command" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">CMND Center</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-transparent px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-semibold text-xs uppercase tracking-wider mb-2 px-3">Main</SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1">
              {mainNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    data-active={isActive(item.path)}
                    className="group relative overflow-hidden transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 rounded-xl data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:to-primary/10 data-[active=true]:shadow-lg"
                  >
                    <Link to={item.path} className="flex items-center py-2.5 px-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground group-data-[active=true]:text-foreground transition-colors">{item.title}</span>
                      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-purple-500 rounded-r-full opacity-0 group-hover:opacity-100 group-data-[active=true]:opacity-100 transition-opacity duration-300" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-muted-foreground font-semibold text-xs uppercase tracking-wider mb-2 px-3">Account</SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1">
              {secondaryNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    data-active={isActive(item.path)}
                    className="group relative overflow-hidden transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 rounded-xl data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:to-primary/10 data-[active=true]:shadow-lg"
                  >
                    <Link to={item.path} className="flex items-center py-2.5 px-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground group-data-[active=true]:text-foreground transition-colors">{item.title}</span>
                      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-purple-500 rounded-r-full opacity-0 group-hover:opacity-100 group-data-[active=true]:opacity-100 transition-opacity duration-300" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
