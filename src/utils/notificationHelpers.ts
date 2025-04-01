
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
    } else {
      console.log("Notification created successfully");
    }
  } catch (error) {
    console.error("Error in createNotification:", error);
  }
};
