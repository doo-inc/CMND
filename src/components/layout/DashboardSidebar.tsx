import React from "react";
import { Link } from "react-router-dom";
import { Home, Users, Calendar, BarChart, FileText, Bell } from "lucide-react";
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
    title: "Lifecycle",
    icon: Calendar,
    path: "/lifecycle"
  },
  {
    title: "Contracts",
    icon: FileText,
    path: "/contracts"
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
  return (
    <Sidebar className="glass-sidebar border-0 transition-all duration-300 bg-gray-200 dark:bg-gray-800">
      <SidebarHeader className="p-4 bg-gray-200/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-300/20 dark:border-gray-600/20">
        <div className="flex items-center space-x-2">
          <img src="/lovable-uploads/7103ec49-9766-44ba-a938-b218c15a85e7.png" alt="DOO Command" className="h-10 w-10" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Customer Center</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-600 dark:text-gray-400 font-medium">Main</SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
              {mainNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-gray-700/70">
                    <Link to={item.path} className="flex items-center group">
                      <item.icon className="mr-2 h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200" />
                      <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-600 dark:text-gray-400 font-medium">Account</SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
              {secondaryNavItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-gray-700/70">
                    <Link to={item.path} className="flex items-center group">
                      <item.icon className="mr-2 h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200" />
                      <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">{item.title}</span>
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
