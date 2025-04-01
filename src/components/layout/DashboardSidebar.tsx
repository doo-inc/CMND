
import React from "react";
import { Link } from "react-router-dom";
import { 
  Home, 
  Users, 
  Calendar, 
  Settings, 
  BarChart, 
  FileText, 
  MessageSquare,
  Link as LinkIcon
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const mainNavItems = [
  {
    title: "Dashboard",
    icon: Home,
    path: "/",
  },
  {
    title: "Customers",
    icon: Users,
    path: "/customers",
  },
  {
    title: "Lifecycle",
    icon: Calendar,
    path: "/lifecycle",
  },
  {
    title: "Contracts",
    icon: FileText,
    path: "/contracts",
  },
  {
    title: "Integrations",
    icon: LinkIcon,
    path: "/integrations",
  },
  {
    title: "Reports",
    icon: BarChart,
    path: "/reports",
  },
];

const secondaryNavItems = [
  {
    title: "Messages",
    icon: MessageSquare,
    path: "/messages",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

export function DashboardSidebar() {
  return (
    <Sidebar className="glass-sidebar border-0 transition-all duration-300">
      <SidebarHeader className="p-4 bg-sidebar/30 backdrop-blur-md border-b border-sidebar-border/10">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-doo-purple-500/80 backdrop-blur-sm flex items-center justify-center text-white font-bold shadow-lg border border-white/20">
            D
          </div>
          <h2 className="text-xl font-bold text-white/90">DOO Command</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/70 font-medium">Main</SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="transition-all duration-200 hover:bg-white/10">
                    <Link to={item.path} className="flex items-center group">
                      <item.icon className="mr-2 h-5 w-5 text-white/80 group-hover:text-white" />
                      <span className="text-white/90 group-hover:text-white">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/70 font-medium">Account</SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="transition-all duration-200 hover:bg-white/10">
                    <Link to={item.path} className="flex items-center group">
                      <item.icon className="mr-2 h-5 w-5 text-white/80 group-hover:text-white" />
                      <span className="text-white/90 group-hover:text-white">{item.title}</span>
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
