import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Users, User, Mail, Shield, MoreVertical, Trash2, Edit2, Key, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { createNotification, CreateNotificationParams } from "@/utils/notificationHelpers";
import { Notification } from "@/types/notifications";
import { logUserCreated, logActivity } from "@/utils/activityLogger";

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  avatar_url?: string;
  created_at: string;
}

interface InvitationRecord {
  id: string;
  email: string;
  role: 'admin' | 'user';
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

const inviteFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.enum(["admin", "user"]),
});

const createAccountSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  full_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["admin", "user"]),
});

const editMemberSchema = z.object({
  full_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.enum(["admin", "user"]),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;
type CreateAccountFormValues = z.infer<typeof createAccountSchema>;
type EditMemberFormValues = z.infer<typeof editMemberSchema>;

const TeamManagementPage = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string>('');
  const [dialogTab, setDialogTab] = useState<'create' | 'invite'>('create');
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "user",
    },
  });

  const createAccountForm = useForm<CreateAccountFormValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      role: "user",
    },
  });

  const editMemberForm = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      full_name: "",
      role: "user",
    },
  });

  useEffect(() => {
    fetchTeamMembers();
    fetchPendingInvitations();
  }, []);

  useEffect(() => {
    if (editMember) {
      form.reset({
        email: editMember.email,
        role: editMember.role,
      });
    } else {
      form.reset({
        email: "",
        role: "user",
      });
    }
  }, [editMember, form]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      if (data) {
        setTeamMembers(data as TeamMember[]);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations' as any)
        .select('*')
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;

      if (data) {
        setPendingInvitations(data as unknown as InvitationRecord[] || []);
      }
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
    }
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      return { user, profile };
    }
    return { user: null, profile: null };
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success(`${field} copied to clipboard!`);
  };

  const onCreateAccount: SubmitHandler<CreateAccountFormValues> = async (data) => {
    try {
      setIsSubmitting(true);
      
      console.log('Creating account for:', data.email);

      // Use centralized supabase client for edge function calls
      let response;
      try {
        const { data: responseData, error: functionError } = await supabase.functions.invoke('create-user-account', {
          body: {
            email: data.email,
            password: data.password,
            full_name: data.full_name,
            role: data.role,
          },
        });
        
        if (functionError) {
          throw new Error(functionError.message || 'Failed to create user');
        }
        response = { data: responseData, error: null };
        
      } catch (invokeError: any) {
        console.error('Function invoke error:', invokeError);
        toast.error(`Network error: ${invokeError.message || 'Could not reach server'}`);
        return;
      }

      console.log('Create account response:', response);

      if (response.error) {
        console.error('Error creating account:', response.error);
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : (response.error as any).error || (response.error as any).message || JSON.stringify(response.error);
        toast.error(errorMsg || 'Failed to create account');
        return;
      }

      if (response.data?.error) {
        console.error('Account creation error:', response.data.error);
        toast.error(response.data.error);
        return;
      }

      // Store credentials to show to admin
      setCreatedCredentials({ email: data.email, password: data.password });
      
      toast.success(`Account created successfully for ${data.email}!`);
      
      // Log the activity
      await logUserCreated(response.data?.user?.id || data.email, data.email, { 
        full_name: data.full_name, 
        role: data.role 
      });
      
      await createTeamNotification({
        type: 'team',
        title: 'Team Member Added',
        message: `${data.full_name} (${data.email}) has been added as ${data.role}`,
      });

      createAccountForm.reset();
      fetchTeamMembers();
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit: SubmitHandler<InviteFormValues> = async (data) => {
    try {
      setIsSubmitting(true);
      
      // Get current user info
      const { user, profile } = await getCurrentUser();
      if (!user) {
        toast.error('You must be logged in to send invitations');
        return;
      }

      // Generate secure invitation token using the database function
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_invitation_token' as any);

      if (tokenError) {
        console.error('Error generating token:', tokenError);
        toast.error('Failed to generate invitation token');
        return;
      }

      const token = tokenData;

      // Create invitation record
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations' as any)
        .insert([{
          email: data.email,
          role: data.role,
          token: token,
          invited_by: user.id,
        }])
        .select()
        .single();

      if (invitationError) {
        console.error('Error creating invitation:', invitationError);
        toast.error('Failed to create invitation');
        return;
      }

      // Create invitation link with URL-encoded token
      const encodedToken = encodeURIComponent(token);
      const inviteLink = `${window.location.origin}/accept-invite?token=${encodedToken}`;
      setInvitationLink(inviteLink);
      
      console.log('Generated token:', token);
      console.log('Encoded token:', encodedToken);
      console.log('Invitation link:', inviteLink);
      
      // Send invitation email via edge function
      try {
        console.log('About to invoke send-invitation-email function');
        console.log('Supabase client authenticated:', !!supabase.auth.getUser());
        
        const payload = {
          invitation: {
            email: data.email,
            role: data.role,
            inviteLink: inviteLink,
            invitedByName: profile?.full_name || 'Team member',
            companyName: 'DOO Command'
          }
        };
        
        console.log('Function payload:', payload);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await supabase.functions.invoke('send-invitation-email', {
          body: payload
        });
        
        clearTimeout(timeoutId);

        console.log('Edge function full response:', response);
        console.log('Response data:', response.data);
        console.log('Response error:', response.error);

        if (response.error) {
          console.error('Error sending invitation email:', response.error);
          toast.warning(`Invitation created! Email service unavailable - use the link below to share manually.`);
        } else if (response.data && response.data.error) {
          console.error('Function returned error:', response.data.error);
          toast.warning(`Invitation created! ${response.data.message || 'Share the link manually.'}`);
        } else if (response.data && response.data.warning) {
          // Email service not configured, but invitation created successfully
          console.warn('Email service not configured:', response.data.warning);
          toast.warning(`Invitation created! ${response.data.message || 'Share the link manually.'}`);
        } else {
          console.log('Email sent successfully:', response.data);
          toast.success(`Invitation sent successfully to ${data.email}!`);
          setInvitationLink(''); // Clear link if email was successful
        }
      } catch (emailError: any) {
        console.error('Error invoking email function:', emailError);
        console.error('Error details:', JSON.stringify(emailError, null, 2));
        toast.warning(`Invitation created! Email service unavailable - use the link below to share manually.`);
      }
      
      await createTeamNotification({
        type: 'team',
        title: 'Team Member Invited',
        message: `${data.email} has been invited to join as ${data.role}`,
      });

      form.reset();
      setInviteDialogOpen(false);
      setEditMember(null);
      
      fetchPendingInvitations();
    } catch (error) {
      console.error("Error creating invitation:", error);
      toast.error("Failed to create invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setMemberToEdit(member);
    editMemberForm.reset({
      full_name: member.full_name || '',
      role: member.role,
    });
    setEditDialogOpen(true);
  };

  const onUpdateMember: SubmitHandler<EditMemberFormValues> = async (data) => {
    if (!memberToEdit) return;
    
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          role: data.role,
        })
        .eq('id', memberToEdit.id);

      if (error) throw error;

      toast.success(`${data.full_name} updated successfully!`);
      
      // Log the activity
      await logActivity({
        action: 'user_updated',
        entityType: 'user',
        entityId: memberToEdit.id,
        entityName: data.full_name,
        details: { role: data.role }
      });

      setEditDialogOpen(false);
      setMemberToEdit(null);
      fetchTeamMembers();
    } catch (error) {
      console.error("Error updating team member:", error);
      toast.error("Failed to update team member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      // Call the secure edge function to delete user completely (from auth.users and profiles)
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: memberId }
      });

      if (error) throw error;
      
      // Check for error in response
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        throw new Error((data as { error?: string }).error || 'Failed to delete user');
      }

      toast.success("Team member removed successfully");
      
      await createTeamNotification({
        type: 'team',
        title: 'Team Member Removed',
        message: `A team member has been removed from the team.`,
        related_id: memberId
      });
      
      setTeamMembers(teamMembers.filter(member => member.id !== memberId));
    } catch (error) {
      console.error("Error deleting team member:", error);
      toast.error(`Failed to remove team member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const copyInvitationLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      toast.success("Invitation link copied to clipboard!");
    }
  };

  const createTeamNotification = async (notificationData: CreateNotificationParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-notification', {
        body: {
          notification: notificationData
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error creating team notification:", error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Team Management</h1>
          <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
              setInviteDialogOpen(open);
              if (!open) {
                setCreatedCredentials(null);
                setInvitationLink('');
                createAccountForm.reset();
                form.reset();
              }
            }}>
            <DialogTrigger asChild>
              <Button className="glass-button">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass-card">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Create an account directly or send an invitation link.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={dialogTab} onValueChange={(v) => setDialogTab(v as 'create' | 'invite')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Create Account
                  </TabsTrigger>
                  <TabsTrigger value="invite" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Send Invite
                  </TabsTrigger>
                </TabsList>

                {/* Create Account Tab */}
                <TabsContent value="create" className="mt-4">
                  {createdCredentials ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-3">
                          <Check className="h-5 w-5 text-green-600" />
                          <p className="font-semibold text-green-700 dark:text-green-400">Account Created Successfully!</p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Share these credentials with the team member:
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input 
                              value={createdCredentials.email} 
                              readOnly 
                              className="font-mono text-sm bg-background"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={() => copyToClipboard(createdCredentials.email, 'Email')}
                            >
                              {copiedField === 'Email' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input 
                              value={createdCredentials.password} 
                              readOnly 
                              type={showPassword ? "text" : "password"}
                              className="font-mono text-sm bg-background"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={() => copyToClipboard(createdCredentials.password, 'Password')}
                            >
                              {copiedField === 'Password' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => {
                          setCreatedCredentials(null);
                          createAccountForm.reset();
                        }}
                      >
                        Create Another Account
                      </Button>
                    </div>
                  ) : (
                    <Form {...createAccountForm}>
                      <form onSubmit={createAccountForm.handleSubmit(onCreateAccount)} className="space-y-4">
                        <FormField
                          control={createAccountForm.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="John Doe" 
                                  {...field} 
                                  className="glass-input"
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createAccountForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="john.doe@example.com" 
                                  type="email" 
                                  {...field} 
                                  className="glass-input"
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createAccountForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <div className="relative flex-1">
                                    <Input 
                                      placeholder="Min 6 characters" 
                                      type={showPassword ? "text" : "password"}
                                      {...field} 
                                      className="glass-input pr-10"
                                      disabled={isSubmitting}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-0 top-0 h-full px-3"
                                      onClick={() => setShowPassword(!showPassword)}
                                    >
                                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <Button 
                                  type="button" 
                                  variant="outline"
                                  onClick={() => {
                                    const pwd = generatePassword();
                                    createAccountForm.setValue('password', pwd);
                                  }}
                                  disabled={isSubmitting}
                                >
                                  Generate
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createAccountForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                                disabled={isSubmitting}
                              >
                                <FormControl>
                                  <SelectTrigger className="glass-input">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="glass-card">
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" className="glass-button w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Creating Account..." : "Create Account"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  )}
                </TabsContent>

                {/* Send Invite Tab */}
                <TabsContent value="invite" className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="john.doe@example.com" 
                            type="email" 
                            {...field} 
                            className="glass-input"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="glass-input">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="glass-card">
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {invitationLink && (
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-muted">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Manual Invitation Link:</p>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          value={invitationLink} 
                          readOnly 
                          className="text-xs font-mono bg-background"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={copyInvitationLink}
                          className="shrink-0"
                        >
                          Copy Link
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Share this link manually since the email failed to send.
                      </p>
                    </div>
                  )}
                  
                  <DialogFooter>
                        <Button type="submit" className="glass-button w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Sending Invitation..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations ({pendingInvitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="p-3 glass-card rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited as {invitation.role} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card animate-fade-in">
          <CardHeader>
            <CardTitle className="text-xl">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
                <p className="mt-4 text-muted-foreground">Loading team members...</p>
              </div>
            ) : teamMembers.length > 0 ? (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="p-4 glass-card rounded-lg flex items-center justify-between animate-slide-in">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        {member.avatar_url ? (
                          <AvatarImage src={member.avatar_url} alt={member.full_name || ''} />
                        ) : null}
                        <AvatarFallback className={member.role === 'admin' ? 'bg-doo-purple-500' : 'bg-blue-500'}>
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium">{member.full_name || 'Unknown'}</p>
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="ml-2">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuItem onClick={() => handleEditMember(member)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setMemberToDelete(member);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="mt-4 text-muted-foreground">No team members found</p>
                <Button 
                  variant="outline" 
                  className="mt-4 glass-input"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Your First Team Member
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setMemberToEdit(null);
          editMemberForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[425px] glass-card">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update {memberToEdit?.full_name || memberToEdit?.email}'s details and access level.
            </DialogDescription>
          </DialogHeader>
          <Form {...editMemberForm}>
            <form onSubmit={editMemberForm.handleSubmit(onUpdateMember)} className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{memberToEdit?.email}</p>
              </div>
              <FormField
                control={editMemberForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John Doe" 
                        {...field} 
                        className="glass-input"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMemberForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card">
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-purple-500" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-500" />
                            User
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {field.value === 'admin' ? 'Full access to all features and settings' : 'Standard access to platform features'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="glass-button" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Moved outside dropdown to prevent closing issues */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {memberToDelete?.full_name || memberToDelete?.email} from your team. They will no longer have access to your organization's data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToDelete && handleDeleteMember(memberToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default TeamManagementPage;
