
-- Phase 1: Enable Row Level Security on ALL tables
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create user role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'user',
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to check user roles (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role app_role,
  organization_id UUID
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT p.id, p.email, p.full_name, p.avatar_url, p.role, p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for core business tables
-- Customers table
CREATE POLICY "Authenticated users can view customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can delete customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Contracts table
CREATE POLICY "Authenticated users can view contracts"
  ON public.contracts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create contracts"
  ON public.contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
  ON public.contracts
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can delete contracts"
  ON public.contracts
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Staff table (now managed through profiles)
CREATE POLICY "Authenticated users can view staff"
  ON public.staff
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage staff"
  ON public.staff
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Tasks table
CREATE POLICY "Authenticated users can view tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create tasks"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their assigned tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Documents table
CREATE POLICY "Authenticated users can view documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload documents"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Notifications table
CREATE POLICY "Users can view their notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (true);

-- Customer feedback table
CREATE POLICY "Authenticated users can view feedback"
  ON public.customer_feedback
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create feedback"
  ON public.customer_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Customer timeline table
CREATE POLICY "Authenticated users can view timeline"
  ON public.customer_timeline
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create timeline events"
  ON public.customer_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Lifecycle stages table
CREATE POLICY "Authenticated users can view lifecycle stages"
  ON public.lifecycle_stages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage lifecycle stages"
  ON public.lifecycle_stages
  FOR ALL
  TO authenticated
  USING (true);

-- Referrals table
CREATE POLICY "Authenticated users can view referrals"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage referrals"
  ON public.referrals
  FOR ALL
  TO authenticated
  USING (true);

-- Customer team members table
CREATE POLICY "Authenticated users can view customer team members"
  ON public.customer_team_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage customer team members"
  ON public.customer_team_members
  FOR ALL
  TO authenticated
  USING (true);

-- Renewal activities table
CREATE POLICY "Authenticated users can view renewal activities"
  ON public.renewal_activities
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage renewal activities"
  ON public.renewal_activities
  FOR ALL
  TO authenticated
  USING (true);

-- Update staff table to link with profiles (if needed for backwards compatibility)
-- Add profile_id column if you want to maintain staff table
-- ALTER TABLE public.staff ADD COLUMN profile_id UUID REFERENCES public.profiles(id);
