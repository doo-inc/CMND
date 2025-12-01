import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InvitationData {
  id: string;
  email: string;
  role: 'admin' | 'user';
  invited_by: string;
}

export const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawToken = searchParams.get('token');
  const token = rawToken ? decodeURIComponent(rawToken) : null;
  
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    // Add debug logging
    console.log('AcceptInvite component mounted');
    console.log('Current URL:', window.location.href);
    console.log('Raw token from URL:', rawToken);
    console.log('Decoded token:', token);
    
    if (token) {
      validateInvitationToken();
    } else {
      setTokenError('Invalid invitation link - no token provided');
      setValidatingToken(false);
    }
  }, [token]);

  const validateInvitationToken = async () => {
    try {
      console.log('Validating invitation token:', token);
      console.log('Token length:', token?.length);
      console.log('Token type:', typeof token);
      
      if (!token) {
        setTokenError('No invitation token provided');
        return;
      }
      
      // Query invitations table directly
      const { data, error } = await supabase
        .from('invitations' as any)
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .is('accepted_at', null)
        .single();

      if (error) {
        console.error('Error validating invitation:', error);
        console.error('Database error details:', error.details, error.hint, error.code);
        
        if (error.code === 'PGRST116') {
          setTokenError('This invitation link has expired, been used, or is invalid');
        } else {
          setTokenError('Failed to validate invitation token');
        }
        return;
      }

      console.log('Valid invitation found:', data);
      setInvitationData(data as unknown as InvitationData);
    } catch (error) {
      console.error('Error validating token:', error);
      setTokenError('Failed to validate invitation');
    } finally {
      setValidatingToken(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !invitationData) {
      toast.error('Invalid invitation');
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const fullName = formData.get('fullName') as string;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      console.log('Creating user account for:', invitationData.email);
      
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast.error(authError.message);
        return;
      }

      if (authData.user) {
        console.log('User created successfully:', authData.user.id);
        
        // Wait for the database trigger to create the profile, then update it
        // Retry up to 5 times with increasing delay
        let profileUpdated = false;
        for (let attempt = 1; attempt <= 5; attempt++) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              role: invitationData.role,
              full_name: fullName 
            })
            .eq('id', authData.user.id);
          
          if (!updateError) {
            console.log('Profile updated successfully on attempt', attempt);
            profileUpdated = true;
            break;
          }
          
          console.log(`Profile update attempt ${attempt} failed:`, updateError.message);
        }
        
        if (!profileUpdated) {
          console.warn('Could not update profile after 5 attempts, but continuing...');
        }

        // Mark invitation as accepted
        const { error: invitationError } = await supabase
          .from('invitations' as any)
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitationData.id);

        if (invitationError) {
          console.error('Error updating invitation:', invitationError);
        }

        // Create a welcome notification
        try {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              type: 'team',
              title: 'Welcome to the team!',
              message: `${fullName} has joined the team as ${invitationData.role}`,
              is_read: false
            });

          if (notificationError) {
            console.error('Error creating welcome notification:', notificationError);
          }
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
        }

        // Automatically sign in the user after successful account creation
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitationData.email,
          password: password
        });

        if (signInError) {
          console.error('Error signing in after account creation:', signInError);
          toast.success('Account created successfully! You can now sign in.');
          navigate('/auth');
        } else {
          toast.success('Welcome! Your account has been created and you are now signed in.');
          navigate('/');
        }
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error('Error creating account');
    } finally {
      setSubmitting(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{tokenError}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Complete Your Registration</CardTitle>
          <CardDescription>
            You've been invited to join as <strong>{invitationData?.role}</strong>
            <br />
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={invitationData?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  disabled={submitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={submitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                  disabled={submitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={submitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Complete Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
