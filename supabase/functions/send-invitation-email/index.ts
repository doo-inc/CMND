import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("send-invitation-email: Starting...");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface InvitationEmailData {
  email: string;
  role: 'admin' | 'user';
  inviteLink: string;
  invitedByName?: string;
  companyName?: string;
}

interface EmailRequest {
  invitation: InvitationEmailData;
}

serve(async (req) => {
  console.log("Received request:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { invitation }: EmailRequest = body;
    
    console.log("Processing invitation for:", invitation?.email);

    if (!invitation?.email || !invitation?.role || !invitation?.inviteLink) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          received: invitation
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for RESEND_API_KEY
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured - returning success without sending email");
      return new Response(
        JSON.stringify({ 
          success: true,
          warning: "Email not configured",
          message: "Invitation created. Email service not configured - share link manually."
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Try to send email with Resend
    try {
      const { Resend } = await import("https://esm.sh/resend@2.0.0");
      const resend = new Resend(RESEND_API_KEY);

      const emailContent = buildInvitationEmailContent(invitation);

      // Use configured sender or default DOO email
      const fromEmail = Deno.env.get("SENDER_EMAIL") || "DOO Command <hello@doo.ooo>";
      
      const result = await resend.emails.send({
        from: fromEmail,
        to: [invitation.email],
        subject: `You're invited to join ${invitation.companyName || 'our team'} on DOO Command`,
        html: emailContent,
      });

      if (result.error) {
        console.error("Resend error:", result.error);
        return new Response(
          JSON.stringify({ 
            success: true,
            warning: "Email failed",
            message: "Invitation created but email failed to send. Share link manually.",
            details: result.error.message
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log("Email sent successfully:", result.data?.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          emailId: result.data?.id,
          message: "Invitation email sent successfully"
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (emailError: any) {
      console.error("Email sending error:", emailError);
      return new Response(
        JSON.stringify({ 
          success: true,
          warning: "Email failed",
          message: "Invitation created but email failed to send. Share link manually.",
          details: emailError.message
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function buildInvitationEmailContent(invitation: InvitationEmailData): string {
  const roleColor = invitation.role === 'admin' ? '#8B5CF6' : '#3B82F6';
  const roleIcon = invitation.role === 'admin' ? '🛡️' : '👤';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're invited to join DOO Command</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px 30px; border-radius: 12px; margin-bottom: 20px;">
          <div style="text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 10px;">🚀</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">DOO Command</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Customer Success Management Platform</p>
          </div>
        </div>
        
        <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 64px; margin-bottom: 15px;">${roleIcon}</div>
            <h2 style="color: #1F2937; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">You're Invited!</h2>
            <p style="color: #6B7280; margin: 0; font-size: 16px;">
              ${invitation.invitedByName ? `${invitation.invitedByName} has invited you to join` : 'You have been invited to join'} 
              ${invitation.companyName || 'the team'} on DOO Command
            </p>
          </div>
          
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; border-left: 4px solid ${roleColor}; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 16px; color: #374151;">
              <strong style="color: ${roleColor};">Your Role:</strong> 
              <span style="background: ${roleColor}20; color: ${roleColor}; padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                ${invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
              </span>
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${invitation.inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); transition: transform 0.2s;">
              Accept Invitation & Join Team
            </a>
          </div>
          
          <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 30px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #6B7280;">
              <strong>What you'll get access to:</strong>
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #6B7280; font-size: 14px;">
              <li style="margin-bottom: 5px;">Customer lifecycle management</li>
              <li style="margin-bottom: 5px;">Contract and subscription tracking</li>
              <li style="margin-bottom: 5px;">Team collaboration tools</li>
              <li style="margin-bottom: 5px;">Real-time notifications and insights</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #9CA3AF;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
            Having trouble with the button? Copy this link: <br>
            <a href="${invitation.inviteLink}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 11px;">${invitation.inviteLink}</a>
          </p>
          <p style="margin: 20px 0 0 0; font-size: 11px; color: #D1D5DB;">
            © ${new Date().getFullYear()} DOO. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;
}

console.log("send-invitation-email: Ready");
