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
  Settings,
  LogOut,
  Activity,
  Users,
  HandHeart,
  Edit,
  Trash2,
  Plus
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Notification } from "@/types/notifications";
import { formatDistanceToNow } from "date-fns";

interface ActivityLogEntry {
  id: string;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
}
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
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
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [bellTab, setBellTab] = useState<'notifications' | 'activity'>('notifications');
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };
  
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

  // Fetch notifications for current user
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch notifications for this user (user_id matches OR user_id is null for global notifications)
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order('created_at', { ascending: false })
          .limit(10);

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

    // Subscribe to notifications for current user
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const channel = supabase
        .channel('user_notifications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            const newNotification = payload.new as Notification & { user_id?: string };
            // Only add if it's for this user or global
            if (!newNotification.user_id || newNotification.user_id === user.id) {
              setNotifications(prev => [newNotification as Notification, ...prev.slice(0, 9)]);
              if (!newNotification.is_read) {
                setUnreadCount(count => count + 1);
              }
            }
          }
        )
        .subscribe();

      return channel;
    };

    let channel: any;
    setupSubscription().then(c => channel = c);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Fetch activity logs
  useEffect(() => {
    const fetchActivityLogs = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching activity logs:", error);
          return;
        }

        setActivityLogs((data || []) as ActivityLogEntry[]);
      } catch (error) {
        console.error("Error fetching activity logs:", error);
      }
    };

    fetchActivityLogs();

    // Subscribe to activity logs
    const channel = supabase
      .channel('activity_logs_header')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          setActivityLogs(prev => [payload.new as ActivityLogEntry, ...prev.slice(0, 9)]);
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

  // Get activity icon based on entity type
  const getActivityIcon = (entityType: string) => {
    switch (entityType) {
      case 'user':
        return <User className="h-4 w-4 text-violet-500" />;
      case 'customer':
        return <Users className="h-4 w-4 text-emerald-500" />;
      case 'contract':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'partnership':
        return <HandHeart className="h-4 w-4 text-amber-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes('created') || action.includes('added')) return <Plus className="h-3 w-3 text-green-500" />;
    if (action.includes('updated') || action.includes('edited')) return <Edit className="h-3 w-3 text-blue-500" />;
    if (action.includes('deleted') || action.includes('removed')) return <Trash2 className="h-3 w-3 text-red-500" />;
    return <Activity className="h-3 w-3 text-gray-500" />;
  };

  // Format action text
  const formatAction = (action: string) => action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

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
                <DropdownMenuContent className="glass-dropdown w-96 p-0" align="end">
                  <Tabs value={bellTab} onValueChange={(v) => setBellTab(v as 'notifications' | 'activity')} className="w-full">
                    <div className="px-3 pt-3">
                      <TabsList className="grid w-full grid-cols-2 h-9">
                        <TabsTrigger value="notifications" className="text-xs flex items-center gap-1.5">
                          <Bell className="h-3.5 w-3.5" />
                          Notifications
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                              {unreadCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="text-xs flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5" />
                          Activity Log
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="notifications" className="mt-0">
                      <ScrollArea className="max-h-[320px]">
                        <div className="p-2">
                          {notifications.length > 0 ? (
                            notifications.map(notification => (
                              <div 
                                key={notification.id}
                                className={`p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 mb-1 ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                onClick={() => markAsRead(notification.id)}
                              >
                                <div className="flex items-start space-x-2">
                                  <div className="mt-0.5">
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  <div className="flex-1 space-y-0.5 min-w-0">
                                    <p className="text-sm font-medium truncate">{notification.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                                    <p className="text-[10px] text-muted-foreground/70">
                                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                  {!notification.is_read && (
                                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center text-muted-foreground">
                              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">No notifications yet</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      <div className="border-t border-border/50 p-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={viewAllNotifications}
                        >
                          View All Notifications
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-0">
                      <ScrollArea className="max-h-[320px]">
                        <div className="p-2">
                          {activityLogs.length > 0 ? (
                            activityLogs.map(log => (
                              <div 
                                key={log.id}
                                className="p-2.5 rounded-lg hover:bg-accent/50 transition-colors mb-1"
                              >
                                <div className="flex items-start space-x-2">
                                  <div className="mt-0.5">
                                    {getActivityIcon(log.entity_type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-medium truncate">
                                        {log.user_name || log.user_email || 'System'}
                                      </span>
                                      {getActionIcon(log.action)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {formatAction(log.action)} {log.entity_name || log.entity_type}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/70">
                                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center text-muted-foreground">
                              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">No activity yet</p>
                              <p className="text-xs text-muted-foreground/70">Actions will appear here</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
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
                  <DropdownMenuItem 
                    className="cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 transition-colors text-red-500"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
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
