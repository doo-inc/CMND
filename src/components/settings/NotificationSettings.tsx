import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Monitor, Loader2 } from "lucide-react";
import { getUserNotificationSettings, updateNotificationSetting } from "@/utils/notificationHelpers";
import { useToast } from "@/hooks/use-toast";

interface NotificationSetting {
  notification_type: 'lifecycle' | 'customer' | 'deadline' | 'contract' | 'team';
  email_enabled: boolean;
  in_app_enabled: boolean;
}

const notificationTypes = [
  {
    type: 'lifecycle' as const,
    label: 'Lifecycle Updates',
    description: 'Customer lifecycle stage changes and progress updates',
    icon: '🔄'
  },
  {
    type: 'customer' as const,
    label: 'Customer Activities',
    description: 'New customer additions and profile updates',
    icon: '👤'
  },
  {
    type: 'deadline' as const,
    label: 'Deadlines & Reminders',
    description: 'Upcoming deadlines and important date reminders',
    icon: '⏰'
  },
  {
    type: 'contract' as const,
    label: 'Contract Updates',
    description: 'Contract changes, renewals, and status updates',
    icon: '📄'
  },
  {
    type: 'team' as const,
    label: 'Team Activities',
    description: 'Team member updates and collaboration notifications',
    icon: '👥'
  }
];

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getUserNotificationSettings();
      setSettings(data);
    } catch (error) {
      console.error("Error loading notification settings:", error);
      toast({
        title: "Error",
        description: "Failed to load notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (
    type: 'lifecycle' | 'customer' | 'deadline' | 'contract' | 'team',
    field: 'email_enabled' | 'in_app_enabled',
    value: boolean
  ) => {
    const settingKey = `${type}-${field}`;
    setUpdating(settingKey);

    try {
      const currentSetting = settings.find(s => s.notification_type === type);
      const emailEnabled = field === 'email_enabled' ? value : currentSetting?.email_enabled ?? true;
      const inAppEnabled = field === 'in_app_enabled' ? value : currentSetting?.in_app_enabled ?? true;

      await updateNotificationSetting(type, emailEnabled, inAppEnabled);

      // Update local state
      setSettings(prev => {
        const existing = prev.find(s => s.notification_type === type);
        if (existing) {
          return prev.map(s => 
            s.notification_type === type 
              ? { ...s, [field]: value }
              : s
          );
        } else {
          return [...prev, {
            notification_type: type,
            email_enabled: emailEnabled,
            in_app_enabled: inAppEnabled
          }];
        }
      });

      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved",
      });
    } catch (error) {
      console.error("Error updating setting:", error);
      toast({
        title: "Error",
        description: "Failed to update notification setting",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getSetting = (type: 'lifecycle' | 'customer' | 'deadline' | 'contract' | 'team', field: 'email_enabled' | 'in_app_enabled') => {
    const setting = settings.find(s => s.notification_type === type);
    return setting?.[field] ?? true; // Default to true if not found
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how you receive notifications from DOO Command
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how you receive notifications from DOO Command
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
          <div>Notification Type</div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            In-App
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          {notificationTypes.map((notificationType) => (
            <div key={notificationType.type} className="grid grid-cols-3 gap-4 items-center py-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{notificationType.icon}</span>
                  <Label className="font-medium">{notificationType.label}</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {notificationType.description}
                </p>
              </div>
              
              <div className="flex justify-center">
                <Switch
                  checked={getSetting(notificationType.type, 'email_enabled')}
                  onCheckedChange={(checked) => 
                    handleSettingChange(notificationType.type, 'email_enabled', checked)
                  }
                  disabled={updating === `${notificationType.type}-email_enabled`}
                />
                {updating === `${notificationType.type}-email_enabled` && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
              </div>
              
              <div className="flex justify-center">
                <Switch
                  checked={getSetting(notificationType.type, 'in_app_enabled')}
                  onCheckedChange={(checked) => 
                    handleSettingChange(notificationType.type, 'in_app_enabled', checked)
                  }
                  disabled={updating === `${notificationType.type}-in_app_enabled`}
                />
                {updating === `${notificationType.type}-in_app_enabled` && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <Separator />
        
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium mb-2">📧 Email Notifications</h4>
          <p className="text-sm text-muted-foreground mb-1">
            Email notifications are sent to your registered email address from hello@doo.ooo
          </p>
          <p className="text-xs text-muted-foreground">
            You can unsubscribe from emails at any time using the link in the email footer
          </p>
        </div>
      </CardContent>
    </Card>
  );
}