
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/types/notifications";

export type { Notification };

export interface CreateNotificationParams {
  type: 'lifecycle' | 'customer' | 'deadline' | 'contract' | 'team';
  title: string; 
  message: string;
  related_id?: string;
  related_type?: string;
}

export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  try {
    const { type, title, message, related_id, related_type } = params;
    
    console.log("Creating notification:", params);
    
    // Create in-app notification
    const { error } = await supabase
      .from('notifications')
      .insert({
        type,
        title,
        message,
        is_read: false,
        related_id,
        related_type
      });
      
    if (error) {
      console.error("Error creating notification:", error);
      return;
    }
    
    console.log("Notification created successfully");
    
    // Send email notification if users have it enabled
    try {
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
        body: {
          notification: {
            type,
            title,
            message,
            related_id,
            related_type
          }
        }
      });
      
      if (emailError) {
        console.error("Error sending email notification:", emailError);
      } else {
        console.log("Email notification sent successfully");
      }
    } catch (emailError) {
      console.error("Error invoking email function:", emailError);
    }
  } catch (error) {
    console.error("Error in createNotification:", error);
  }
};

// Helper function to get user notification settings
export const getUserNotificationSettings = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('get_user_notification_settings', {
      user_id_param: user.id
    });

    if (error) {
      console.error("Error fetching notification settings:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUserNotificationSettings:", error);
    return [];
  }
};

// Helper function to update user notification settings
export const updateNotificationSetting = async (
  notificationType: 'lifecycle' | 'customer' | 'deadline' | 'contract' | 'team',
  emailEnabled: boolean,
  inAppEnabled: boolean
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: user.id,
        notification_type: notificationType,
        email_enabled: emailEnabled,
        in_app_enabled: inAppEnabled
      }, {
        onConflict: 'user_id,notification_type'
      });

    if (error) {
      console.error("Error updating notification setting:", error);
      throw error;
    }

    console.log("Notification setting updated successfully");
  } catch (error) {
    console.error("Error in updateNotificationSetting:", error);
    throw error;
  }
};
