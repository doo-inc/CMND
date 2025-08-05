-- Add DELETE policy for tasks table to allow users to delete tasks they're assigned to or if they're an admin
CREATE POLICY "Users can delete their assigned tasks or admins can delete any task" 
ON public.tasks 
FOR DELETE 
USING ((assigned_to = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));