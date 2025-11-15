import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  Moon,
  Sun,
  Calendar,
  FileText,
  User,
  Check,
  Settings
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Notification } from "@/types/notifications";
import { useProfile } from "@/hooks/useProfile";
import { getInitials } from "@/utils/avatarUtils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Create a key for localStorage to persist theme
const THEME_KEY = 'doo-theme-preference';

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light"); // Default to light
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useProfile();
  const navigate = useNavigate();
  
  // Toggle theme functionality with localStorage persistence
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };
  
  // Set initial theme based on localStorage or default to light
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Default to light theme instead of system preference
      document.documentElement.classList.remove("dark");
      localStorage.setItem(THEME_KEY, "light");
    }
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (data) {
          setNotifications(data as Notification[]);
          const unread = data.filter(n => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();

    // Subscribe to notifications
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 4)]);
          if (!(payload.new as Notification).is_read) {
            setUnreadCount(count => count + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(
        notifications.map(notification => 
          notification.id === id ? { ...notification, is_read: true } : notification
        )
      );
      
      if (unreadCount > 0) {
        setUnreadCount(unreadCount - 1);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // View all notifications
  const viewAllNotifications = () => {
    navigate('/notifications');
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: 'lifecycle' | 'customer' | 'deadline' | 'contract' | 'team') => {
    switch (type) {
      case 'lifecycle':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'customer':
        return <User className="h-4 w-4 text-green-500" />;
      case 'deadline':
        return <Calendar className="h-4 w-4 text-amber-500" />;
      case 'contract':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'team':
        return <User className="h-4 w-4 text-pink-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full dashboard-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="backdrop-blur-md bg-background/30 border-b border-border/30 h-16 flex items-center justify-between px-6 z-10">
            <div className="flex items-center">
              <SidebarTrigger className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors text-gray-700 dark:text-gray-200" />
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={toggleTheme}
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                )}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative">
                    <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-doo-purple-500 rounded-full flex items-center justify-center text-xs text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-dropdown w-80" align="end">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Recent Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {unreadCount} Unread
                      </Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <ScrollArea className="max-h-[300px]">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <DropdownMenuItem 
                          key={notification.id}
                          className={`py-2 cursor-pointer ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-2">
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <p className="text-xs text-muted-foreground">{notification.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full mt-1"></div>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="py-4 text-center text-muted-foreground">
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    )}
                  </ScrollArea>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="text-center justify-center" onClick={viewAllNotifications}>
                    View All Notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full p-0">
                    <Avatar className="h-8 w-8 ring-2 ring-offset-2 ring-doo-purple-400">
                      <AvatarImage src={profile?.avatar_url || ""} alt="User" />
                      <AvatarFallback className="bg-doo-purple-600 text-white">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-dropdown">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <Link to="/settings">
                    <DropdownMenuItem className="cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/team">
                    <DropdownMenuItem className="cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                      <User className="h-4 w-4 mr-2" />
                      Team Management
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <ScrollArea className="flex-1">
            <main className="p-6">
              <div className="animate-fade-in">
                {children}
              </div>
            </main>
          </ScrollArea>
        </div>
      </div>
    </SidebarProvider>
  );
}
