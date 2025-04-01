
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCheck, Clock, UserPlus, FileText, Calendar, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Define notification types
type NotificationType = "lifecycle" | "customer" | "deadline" | "contract" | "team";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  related_id?: string;
  related_type?: string;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setNotifications(data);
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
          <CardHeader>
            <CardTitle className="text-xl">All Notifications</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
