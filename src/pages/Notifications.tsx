import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCheck, Clock, UserPlus, FileText, Calendar, AlertCircle, Users, Activity, User, Building, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Notification } from "@/utils/notificationHelpers";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define notification types
type NotificationType = "lifecycle" | "customer" | "deadline" | "contract" | "team";

interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: any;
  created_at: string;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      setIsLoadingActivity(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setActivityLogs(data as ActivityLog[]);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('customer')) return <Building className="h-4 w-4 text-blue-500" />;
    if (action.includes('task')) return <ClipboardList className="h-4 w-4 text-purple-500" />;
    if (action.includes('user')) return <User className="h-4 w-4 text-green-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setNotifications(data as Notification[]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to update notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(
        notifications.map(notification => ({ ...notification, is_read: true }))
      );
      
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to update notifications");
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "lifecycle":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case "customer":
        return <Users className="h-5 w-5 text-green-500" />;
      case "deadline":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "contract":
        return <FileText className="h-5 w-5 text-purple-500" />;
      case "team":
        return <UserPlus className="h-5 w-5 text-pink-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Filter notifications by type
  const filterNotifications = (type: string | null) => {
    if (!type) return notifications;
    return notifications.filter(notification => notification.type === type);
  };

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-3">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="glass-input" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All as Read
            </Button>
          </div>
        </div>

        <Card className="glass-card animate-fade-in">
          <CardContent className="pt-6">
            <Tabs defaultValue="notifications">
              <TabsList className="glass-card mb-4">
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Log
                </TabsTrigger>
              </TabsList>
              
              {/* Notifications Tab */}
              <TabsContent value="notifications" className="mt-4">
                <Tabs defaultValue="all">
                  <TabsList className="glass-card">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
                    <TabsTrigger value="customer">Customers</TabsTrigger>
                    <TabsTrigger value="deadline">Deadlines</TabsTrigger>
                    <TabsTrigger value="contract">Contracts</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                  </TabsList>
                  
                  {["all", "lifecycle", "customer", "deadline", "contract", "team"].map((tabValue) => (
                    <TabsContent key={tabValue} value={tabValue} className="mt-4">
                      <div className="space-y-4">
                        {isLoading ? (
                          <div className="text-center py-8">
                            <Bell className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
                            <p className="mt-4 text-muted-foreground">Loading notifications...</p>
                          </div>
                        ) : filterNotifications(tabValue === "all" ? null : tabValue).length > 0 ? (
                          filterNotifications(tabValue === "all" ? null : tabValue).map((notification) => (
                            <div 
                              key={notification.id} 
                              className={`p-4 glass-card rounded-lg transition-all animate-slide-in ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500' : ''}`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-grow">
                                  <h3 className="text-sm font-medium mb-1">{notification.title}</h3>
                                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(notification.created_at).toLocaleString()}
                                    </span>
                                    {!notification.is_read && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 text-xs"
                                        onClick={() => markAsRead(notification.id)}
                                      >
                                        Mark as read
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <Bell className="h-12 w-12 text-muted-foreground mx-auto" />
                            <p className="mt-4 text-muted-foreground">No notifications found</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>

              {/* Activity Log Tab */}
              <TabsContent value="activity" className="mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  {isLoadingActivity ? (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
                      <p className="mt-2 text-sm text-muted-foreground">Loading activity...</p>
                    </div>
                  ) : activityLogs.length > 0 ? (
                    <div className="space-y-3">
                      {activityLogs.map((log) => (
                        <div 
                          key={log.id} 
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-background flex items-center justify-center">
                            {getActivityIcon(log.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {log.user_name || log.user_email || 'System'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatAction(log.action)}
                              {log.entity_name && (
                                <span className="font-medium"> · {log.entity_name}</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="mt-2 text-sm text-muted-foreground">No activity yet</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
