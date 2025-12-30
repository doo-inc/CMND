
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") || "";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationData {
  type: 'lifecycle' | 'customer' | 'deadline' | 'contract' | 'team';
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
}

interface SlackRequest {
  notification: NotificationData;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // If no Slack webhook URL set, return error
    if (!SLACK_WEBHOOK_URL) {
      throw new Error("SLACK_WEBHOOK_URL environment variable not set");
    }
    
    // Get request body
    const { notification } = await req.json() as SlackRequest;

    if (!notification) {
      throw new Error("Notification data is required");
    }

    // Format the Slack message
    const slackMessage = formatSlackMessage(notification);

    // Send message to Slack
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send Slack notification: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error sending Slack notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Function to format notification into Slack message format
function formatSlackMessage(notification: NotificationData) {
  let emoji = ":pushpin:";
  let color = "#6366F1";
  
  switch (notification.type) {
    case "lifecycle":
      emoji = ":arrows_counterclockwise:";
      color = "#3B82F6";
      break;
    case "customer":
      emoji = ":busts_in_silhouette:";
      color = "#10B981";
      break;
    case "deadline":
      emoji = ":alarm_clock:";
      color = "#F59E0B";
      break;
    case "contract":
      emoji = ":page_facing_up:";
      color = "#8B5CF6";
      break;
    case "team":
      emoji = ":bust_in_silhouette:";
      color = "#EC4899";
      break;
  }

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ${notification.title}`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: notification.message
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Type:* ${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View in Customer Center",
              emoji: true
            },
            style: "primary",
            url: "https://customer-center.example.com"
          }
        ]
      }
    ]
  };
}
