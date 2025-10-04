import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Loading send-invitation-email function...");

// Check RESEND_API_KEY at startup
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
console.log("RESEND_API_KEY status:", RESEND_API_KEY ? "SET" : "NOT SET");

// Dynamically import Resend only when needed
let Resend: any = null;
if (RESEND_API_KEY) {
  try {
    const resendModule = await import("npm:resend@2.0.0");
    Resend = resendModule.Resend;
    console.log("Resend module loaded successfully");
  } catch (error) {
    console.error("Failed to load Resend module:", error);
  }
}

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
  console.log(`Received ${req.method} request to send-invitation-email`);
  console.log("Request URL:", req.url);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing invitation email request");
    
    const body = await req.text();
    console.log("Raw request body length:", body.length);
    console.log("Raw request body:", body);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body",
          details: parseError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { invitation }: EmailRequest = parsedBody;
    console.log("Parsed invitation data:", JSON.stringify(invitation, null, 2));

    if (!invitation) {
      return new Response(
        JSON.stringify({ 
          error: "Missing invitation data in request",
          details: "The 'invitation' field is required in the request body"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!invitation.email || !invitation.role || !invitation.inviteLink) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required invitation fields",
          details: "email, role, and inviteLink are all required",
          received: {
            hasEmail: !!invitation.email,
            hasRole: !!invitation.role,
            hasInviteLink: !!invitation.inviteLink
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build email content
    const emailContent = buildInvitationEmailContent(invitation);

    console.log("Attempting to send email via Resend...");
    console.log("Email recipient:", invitation.email);
    console.log("Email sender: DOO Command <hello@doo.ooo>");
    
    // Check if Resend is configured
    if (!RESEND_API_KEY || !Resend) {
      console.error("Email service not configured - returning success without sending");
      return new Response(
        JSON.stringify({ 
          success: true,
          warning: "Email service not configured",
          message: "Invitation created but email not sent. Share the link manually.",
          hint: "Configure RESEND_API_KEY to enable email notifications"
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Resend client
    const resend = new Resend(RESEND_API_KEY);

    let emailResponse;
    try {
      // Send email using Resend
      emailResponse = await resend.emails.send({
        from: "DOO Command <hello@doo.ooo>",
        to: [invitation.email],
        subject: `You're invited to join ${invitation.companyName || 'our team'} on DOO Command`,
        html: emailContent,
      });

      console.log("Resend API call completed");
      console.log("Resend response:", JSON.stringify(emailResponse, null, 2));
    } catch (resendError) {
      console.error("Resend API call failed:", resendError);
      console.error("Resend error details:", JSON.stringify(resendError, null, 2));
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to call Resend API",
          details: resendError.message,
          hint: "Check that your RESEND_API_KEY is valid and that hello@doo.ooo domain is verified in Resend"
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (emailResponse.error) {
      console.error("Resend API returned error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          error: "Resend API error",
          details: emailResponse.error.message || JSON.stringify(emailResponse.error),
          hint: "This usually means the domain is not verified or the API key is invalid"
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log("Invitation email sent successfully!");
    console.log("Email ID:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        message: "Invitation email sent successfully"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Unexpected error in send-invitation-email:", error);
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error occurred",
        errorType: error.constructor.name,
        details: "An unexpected error occurred. Check function logs for details.",
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

console.log("send-invitation-email function loaded successfully");
