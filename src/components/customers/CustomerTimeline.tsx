
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineEvent } from "@/types/customers";
import { toast } from "sonner";

interface CustomerTimelineProps {
  customerId: string | null;
}

export function CustomerTimeline({ customerId }: CustomerTimelineProps) {
  const { data: timelineEvents = [], isLoading } = useQuery({
    queryKey: ['customer-timeline', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      try {
        // Get timeline events specific to this customer
        const { data: events, error } = await supabase
          .from('customer_timeline')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching timeline events:", error);
          return [];
        }

        // Combine with customer_feedback events
        const { data: feedbackEvents, error: feedbackError } = await supabase
          .from('customer_feedback')
          .select('id, customer_id, content, created_at, created_by, created_by_name, created_by_avatar')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });
          
        if (feedbackError) {
          console.error("Error fetching feedback events:", feedbackError);
        } else if (feedbackEvents) {
          // Convert feedback to timeline format
          const formattedFeedback = feedbackEvents.map(feedback => ({
            id: `feedback-${feedback.id}`,
            customer_id: feedback.customer_id,
            event_type: 'feedback',
            event_description: `New feedback added: "${feedback.content.substring(0, 50)}${feedback.content.length > 50 ? '...' : ''}"`,
            created_at: feedback.created_at,
            created_by: feedback.created_by,
            created_by_name: feedback.created_by_name,
            created_by_avatar: feedback.created_by_avatar,
            related_id: feedback.id,
            related_type: 'feedback',
            updated_at: feedback.created_at
          }));
          
          // Combine and sort all events
          return [...(events || []), ...formattedFeedback].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }

        return events || [];
      } catch (err) {
        console.error("Error in timeline query:", err);
        return [];
      }
    },
    enabled: !!customerId
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const convertToTask = async (event: TimelineEvent) => {
    // Create a task from this timeline event
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: event.event_description,
          description: `Task created from customer timeline event: ${event.event_type}`,
          status: "todo",
          customer_id: event.customer_id,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week due date
        })
        .select();
        
      if (error) throw error;
      
      toast.success("Task created successfully");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'create':
        return '🆕';
      case 'update':
        return '🔄';
      case 'contract':
        return '📝';
      case 'stage':
        return '🚩';
      case 'feedback':
        return '💬';
      default:
        return '📌';
    }
  };

  return (
    <Card className="w-full glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5 text-doo-purple-500" />
          Customer Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse">Loading timeline...</div>
            </div>
          ) : timelineEvents.length > 0 ? (
            <div className="relative space-y-4 pl-6 before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-muted">
              {timelineEvents.map((event) => (
                <div key={event.id} className="relative pb-4">
                  <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-lg">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/30 ml-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium">{event.event_description}</p>
                      <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">Event type: {event.event_type}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => convertToTask(event)}
                      >
                        Convert to Task
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No timeline events available yet.</p>
              <p className="text-sm text-muted-foreground">Timeline events will be shown here as actions are taken on this customer.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
