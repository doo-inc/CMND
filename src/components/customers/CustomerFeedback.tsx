
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { createNotification } from "@/utils/notificationHelpers";

interface FeedbackComment {
  id: string;
  customer_id: string;
  content: string;
  created_by: string;
  created_at: string;
  created_by_name?: string;
  created_by_avatar?: string;
}

interface CustomerFeedbackProps {
  customerId: string | null;
}

export function CustomerFeedback({ customerId }: CustomerFeedbackProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: feedbackComments = [], isLoading, refetch } = useQuery({
    queryKey: ['customer-feedback', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_feedback')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching feedback:", error);
        return [];
      }

      return data as FeedbackComment[];
    },
    enabled: !!customerId
  });

  const handleSubmitFeedback = async () => {
    if (!comment.trim() || !customerId) return;
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('customer_feedback')
        .insert({
          customer_id: customerId,
          content: comment.trim(),
          created_by: 'current-user-id', // Replace with actual user ID from auth
          created_by_name: 'Current User' // Replace with actual user name
        })
        .select();
        
      if (error) throw error;
      
      await createNotification({
        type: 'customer',
        title: 'New Feedback Added',
        message: `New feedback has been added for a customer`,
        related_id: customerId,
        related_type: 'customer'
      });
      
      setComment("");
      toast.success("Feedback added successfully");
      refetch();
      
    } catch (error) {
      console.error("Error adding feedback:", error);
      toast.error("Failed to add feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 text-doo-purple-500" />
          Customer Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <Textarea
              placeholder="Add your feedback or comments about this customer..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mb-3 min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmitFeedback} 
                disabled={!comment.trim() || isSubmitting}
                className="bg-doo-purple-500 hover:bg-doo-purple-600"
              >
                <Send className="mr-2 h-4 w-4" />
                Submit Feedback
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-pulse">Loading comments...</div>
              </div>
            ) : feedbackComments.length > 0 ? (
              feedbackComments.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start space-x-3">
                    <Avatar>
                      <AvatarImage src={item.created_by_avatar} />
                      <AvatarFallback className="bg-doo-purple-100 text-doo-purple-800">
                        {item.created_by_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-medium">{item.created_by_name || 'User'}</p>
                        <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">No feedback available yet.</p>
                <p className="text-sm text-muted-foreground">Add the first comment about this customer above.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
