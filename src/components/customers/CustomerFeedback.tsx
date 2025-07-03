import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Plus, PlusCircle, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface CustomerFeedbackProps {
  customerId: string | null;
}

interface FeedbackData {
  id: string;
  customer_id: string;
  content: string;
  created_by: string;
  created_by_name?: string | null;
  created_by_avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export function CustomerFeedback({ customerId }: CustomerFeedbackProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<FeedbackData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: feedback = [], isLoading, refetch } = useQuery({
    queryKey: ['customer-feedback', customerId],
    queryFn: async (): Promise<FeedbackData[]> => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_feedback')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching customer feedback:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!customerId
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !customerId) return;
    
    setIsSubmitting(true);
    
    try {
      // Add feedback to database
      const { error } = await supabase
        .from('customer_feedback')
        .insert({
          customer_id: customerId,
          content: newComment,
          created_by: "current-user",
          created_by_name: "Demo User",
          created_by_avatar: `https://avatar.vercel.sh/${Math.random()}.png`
        });
      
      if (error) throw error;
      
      // Add timeline entry for the feedback
      await supabase
        .from('customer_timeline')
        .insert({
          customer_id: customerId,
          event_type: 'feedback',
          event_description: `New feedback added: "${newComment.substring(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
          created_by: "current-user",
          created_by_name: "Demo User",
          created_by_avatar: `https://avatar.vercel.sh/${Math.random()}.png`
        });
      
      setNewComment("");
      toast.success("Feedback added successfully");
      refetch();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to add feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    
    setIsDeleting(true);
    
    try {
      // Delete feedback from database
      const { error } = await supabase
        .from('customer_feedback')
        .delete()
        .eq('id', feedbackToDelete.id);
      
      if (error) throw error;
      
      // Add timeline entry for the deletion
      await supabase
        .from('customer_timeline')
        .insert({
          customer_id: feedbackToDelete.customer_id,
          event_type: 'feedback',
          event_description: `Feedback deleted: "${feedbackToDelete.content.substring(0, 50)}${feedbackToDelete.content.length > 50 ? '...' : ''}"`,
          created_by: "current-user",
          created_by_name: "Demo User",
          created_by_avatar: `https://avatar.vercel.sh/${Math.random()}.png`
        });
      
      toast.success("Feedback deleted successfully");
      refetch();
      setDeleteDialogOpen(false);
      setFeedbackToDelete(null);
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("Failed to delete feedback");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (feedback: FeedbackData) => {
    setFeedbackToDelete(feedback);
    setDeleteDialogOpen(true);
  };

  const convertToTask = async (feedback: FeedbackData) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: `Follow up on customer feedback`,
          description: feedback.content,
          status: "todo",
          customer_id: feedback.customer_id,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select();
        
      if (error) throw error;
      
      // Add timeline entry for the task creation
      await supabase
        .from('customer_timeline')
        .insert({
          customer_id: feedback.customer_id,
          event_type: 'task',
          event_description: 'Task created from customer feedback',
          related_id: data[0].id,
          related_type: 'task'
        });
      
      toast.success("Task created successfully");
    } catch (error) {
      console.error("Error creating task from feedback:", error);
      toast.error("Failed to create task");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-semibold">
            <MessageSquare className="mr-2 h-5 w-5" />
            Customer Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="mb-6">
            <Textarea
              placeholder="Add your feedback or customer comments here..."
              className="min-h-[100px] mb-2"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Feedback
              </Button>
            </div>
          </form>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-pulse">Loading feedback...</div>
              </div>
            ) : feedback.length > 0 ? (
              feedback.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={item.created_by_avatar || undefined} />
                        <AvatarFallback>
                          {item.created_by_name ? item.created_by_name.charAt(0) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{item.created_by_name || "User"}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(item.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => convertToTask(item)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create Task
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openDeleteDialog(item)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">{item.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No feedback available yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteFeedback}
        title="Delete Feedback"
        description="Are you sure you want to delete this feedback?"
        itemName={feedbackToDelete?.content.substring(0, 50) + (feedbackToDelete?.content && feedbackToDelete.content.length > 50 ? '...' : '') || ''}
        isDeleting={isDeleting}
      />
    </>
  );
}
