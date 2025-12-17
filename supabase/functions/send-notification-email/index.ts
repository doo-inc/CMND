
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface NotificationData {
  type: 'lifecycle' | 'customer' | 'deadline' | 'contract' | 'team';
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
}

interface EmailRequest {
  notification: NotificationData;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing email notification request");
    
    const { notification }: EmailRequest = await req.json();
    console.log("Notification data:", notification);

    // Get users who want email notifications for this type
    const emailRecipients = await getEmailRecipients(notification.type);
    console.log("Email recipients:", emailRecipients);

    if (emailRecipients.length === 0) {
      console.log("No users want email notifications for this type, skipping email");
      return new Response(
        JSON.stringify({ message: "No users have email notifications enabled for this type" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build email content
    const emailContent = buildEmailContent(notification);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "DOO Command <hello@doo.ooo>",
      to: emailRecipients,
      subject: `[DOO Command] ${notification.title}`,
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        sentTo: emailRecipients.length 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getEmailRecipients(notificationType: string): Promise<string[]> {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get users who have email notifications enabled for this type
    const { data: settings, error } = await supabase
      .from('user_notification_settings')
      .select(`
        email_enabled,
        profiles!inner(email)
      `)
      .eq('notification_type', notificationType)
      .eq('email_enabled', true);
    
    if (error) {
      console.error("Error fetching notification settings:", error);
      // Fallback: get all admin emails
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'admin');
      return profiles?.map(p => p.email) || ["hello@doo.ooo"];
    }
    
    const emails = settings?.map(setting => setting.profiles.email) || [];
    
    // If no users have settings, fallback to admins
    if (emails.length === 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'admin');
      return profiles?.map(p => p.email) || ["hello@doo.ooo"];
    }
    
    return emails;
  } catch (error) {
    console.error("Error in getEmailRecipients:", error);
    return ["hello@doo.ooo"]; // Fallback email
  }
}

function buildEmailContent(notification: NotificationData): string {
  // Icon and color based on notification type
  let icon = "🔔";
  let color = "#3B82F6";
  
  switch (notification.type) {
    case 'lifecycle':
      icon = "🔄";
      color = "#10B981";
      break;
    case 'customer':
      icon = "👤";
      color = "#F59E0B";
      break;
    case 'deadline':
      icon = "⏰";
      color = "#EF4444";
      break;
    case 'contract':
      icon = "📄";
      color = "#8B5CF6";
      break;
    case 'team':
      icon = "👥";
      color = "#06B6D4";
      break;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${color}20, ${color}10); padding: 30px; border-radius: 12px; border-left: 4px solid ${color};">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">${icon}</div>
            <h1 style="color: ${color}; margin: 0; font-size: 24px; font-weight: 600;">DOO Command</h1>
            <p style="color: #6B7280; margin: 5px 0 0 0; font-size: 14px;">Customer Success Management Platform</p>
          </div>
          
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">${notification.title}</h2>
            <p style="color: #4B5563; margin: 0; font-size: 16px; line-height: 1.6;">${notification.message}</p>
            
            ${notification.related_id ? `
              <div style="margin-top: 20px; padding: 15px; background: #F9FAFB; border-radius: 6px; border-left: 3px solid ${color};">
                <p style="margin: 0; font-size: 14px; color: #6B7280;">
                  <strong>Related ${notification.related_type || 'Item'}:</strong> ${notification.related_id}
                </p>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="${Deno.env.get('SITE_URL') || 'https://your-app.lovable.app'}" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; transition: background-color 0.2s;">
              Open DOO Command
            </a>
          </div>
          
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
              This notification was sent from DOO Command. 
              <br>
              <a href="${Deno.env.get('SITE_URL') || 'https://your-app.lovable.app'}/settings" style="color: ${color}; text-decoration: none;">Manage notification preferences</a>
            </p>
            <p style="margin: 10px 0 0 0; font-size: 11px; color: #D1D5DB;">
              © ${new Date().getFullYear()} DOO. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
