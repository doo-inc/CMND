-- Fix tasks table overlapping RLS policies
-- Remove overly permissive "All users can..." policies that override the restrictive policies

-- Drop the overly permissive SELECT policy (keep "Authenticated users can view tasks")
DROP POLICY IF EXISTS "All users can view all tasks" ON tasks;

-- Drop the overly permissive INSERT policy (keep "Users can create tasks")
DROP POLICY IF EXISTS "All users can insert tasks" ON tasks;

-- Drop the overly permissive UPDATE policy (keep "Users can update their assigned tasks")
DROP POLICY IF EXISTS "All users can update tasks" ON tasks;

-- Drop the overly permissive DELETE policy (keep "Users can delete their assigned tasks or admins can delete any")
DROP POLICY IF EXISTS "All users can delete tasks" ON tasks;