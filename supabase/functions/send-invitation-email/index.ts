import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("send-invitation-email: Starting...");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['admin', 'user'] as const;

interface ValidatedInvitation {
  email: string;
  role: 'admin' | 'user';
  inviteLink: string;
  invitedByName?: string;
  companyName?: string;
}

function validateInvitationInput(data: unknown): { valid: true; invitation: ValidatedInvitation } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: "Invalid request body" };
  }

  const body = data as Record<string, unknown>;
  const invitation = body.invitation as Record<string, unknown> | undefined;

  if (!invitation || typeof invitation !== 'object') {
    return { valid: false, error: "Missing invitation data" };
  }

  // Email validation
  if (!invitation.email || typeof invitation.email !== 'string') {
    return { valid: false, error: "Email is required" };
  }
  const trimmedEmail = invitation.email.trim().toLowerCase();
  if (trimmedEmail.length > 255 || !EMAIL_REGEX.test(trimmedEmail)) {
    return { valid: false, error: "Invalid email format" };
  }

  // Role validation
  if (!invitation.role || typeof invitation.role !== 'string' || !VALID_ROLES.includes(invitation.role as any)) {
    return { valid: false, error: "Invalid role. Must be 'admin' or 'user'" };
  }

  // Invite link validation
  if (!invitation.inviteLink || typeof invitation.inviteLink !== 'string') {
    return { valid: false, error: "Invite link is required" };
  }
  try {
    new URL(invitation.inviteLink);
  } catch {
    return { valid: false, error: "Invalid invite link URL format" };
  }
  if (invitation.inviteLink.length > 2048) {
    return { valid: false, error: "Invite link is too long" };
  }

  // Optional fields
  const invitedByName = (typeof invitation.invitedByName === 'string' && invitation.invitedByName.length <= 255)
    ? invitation.invitedByName.trim() : undefined;
  const companyName = (typeof invitation.companyName === 'string' && invitation.companyName.length <= 255)
    ? invitation.companyName.trim() : undefined;

  return {
    valid: true,
    invitation: {
      email: trimmedEmail,
      role: invitation.role as 'admin' | 'user',
      inviteLink: invitation.inviteLink,
      invitedByName,
      companyName,
    },
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  console.log("Received request:", req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION ============
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("send-invitation-email: Invalid token or user not found", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("send-invitation-email: Could not fetch user profile", profileError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Could not verify user role" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.role !== "admin") {
      console.error(`send-invitation-email: Access denied for user ${user.id} with role ${profile.role}`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`send-invitation-email: Authorized admin user ${user.id}`);
    // ============ END AUTHENTICATION ============

    // ============ INPUT VALIDATION ============
    const rawBody = await req.json();
    const validation = validateInvitationInput(rawBody);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { invitation } = validation;
    // ============ END INPUT VALIDATION ============

    console.log("Processing invitation for:", invitation.email);

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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to send email with Resend
    try {
      const { Resend } = await import("https://esm.sh/resend@2.0.0");
      const resend = new Resend(RESEND_API_KEY);

      const emailContent = buildInvitationEmailContent(invitation);

      const fromEmail = Deno.env.get("SENDER_EMAIL") || "DOO Command <hello@doo.ooo>";
      
      const result = await resend.emails.send({
        from: fromEmail,
        to: [invitation.email],
        subject: `You're invited to join ${escapeHtml(invitation.companyName || 'our team')} on DOO Command`,
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
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log("Email sent successfully:", result.data?.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          emailId: result.data?.id,
          message: "Invitation email sent successfully"
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (emailError: unknown) {
      console.error("Email sending error:", emailError);
      const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
      return new Response(
        JSON.stringify({ 
          success: true,
          warning: "Email failed",
          message: "Invitation created but email failed to send. Share link manually.",
          details: errorMessage
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    console.error("Function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildInvitationEmailContent(invitation: ValidatedInvitation): string {
  const roleColor = invitation.role === 'admin' ? '#8B5CF6' : '#3B82F6';
  const roleIcon = invitation.role === 'admin' ? '🛡️' : '👤';
  
  // Escape all user-provided content for XSS protection
  const safeInvitedByName = invitation.invitedByName ? escapeHtml(invitation.invitedByName) : '';
  const safeCompanyName = invitation.companyName ? escapeHtml(invitation.companyName) : '';
  const safeInviteLink = encodeURI(invitation.inviteLink);
  const safeRole = escapeHtml(invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1));

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
              ${safeInvitedByName ? `${safeInvitedByName} has invited you to join` : 'You have been invited to join'} 
              ${safeCompanyName || 'the team'} on DOO Command
            </p>
          </div>
          
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; border-left: 4px solid ${roleColor}; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 16px; color: #374151;">
              <strong style="color: ${roleColor};">Your Role:</strong> 
              <span style="background: ${roleColor}20; color: ${roleColor}; padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                ${safeRole}
              </span>
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${safeInviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); transition: transform 0.2s;">
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
            <a href="${safeInviteLink}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 11px;">${safeInviteLink}</a>
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
