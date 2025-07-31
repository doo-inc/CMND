import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Users, User, Mail, Shield, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type InviteFormValues = z.infer<typeof inviteFormSchema>;

const TeamManagementPage = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string>('');

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
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
        
        const response = await supabase.functions.invoke('send-invitation-email', {
          body: payload
        });

        console.log('Edge function full response:', response);
        console.log('Response data:', response.data);
        console.log('Response error:', response.error);

        if (response.error) {
          console.error('Error sending invitation email:', response.error);
          toast.error(`Email failed to send: ${response.error.message || 'Unknown error'}. Use the copy link button below to share manually.`);
          console.log('Manual invitation link:', inviteLink);
        } else if (response.data && response.data.error) {
          console.error('Function returned error:', response.data.error);
          toast.error(`Email failed to send: ${response.data.error}. Use the copy link button below to share manually.`);
          console.log('Manual invitation link:', inviteLink);
        } else {
          console.log('Email sent successfully:', response.data);
          toast.success(`Invitation sent successfully to ${data.email}!`);
          setInvitationLink(''); // Clear link if email was successful
        }
      } catch (emailError) {
        console.error('Error invoking email function:', emailError);
        console.error('Error details:', JSON.stringify(emailError, null, 2));
        toast.error(`Email failed to send: ${emailError.message || 'Network error'}. Use the copy link button below to share manually.`);
        console.log('Manual invitation link:', inviteLink);
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
    setEditMember(member);
    form.setValue('email', member.email);
    form.setValue('role', member.role);
    setInviteDialogOpen(true);
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

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
      toast.error("Failed to remove team member");
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
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glass-button">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation email to a new team member. They'll receive a link to create their account.
                </DialogDescription>
              </DialogHeader>
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
                    <Button type="submit" className="glass-button" disabled={isSubmitting}>
                      {isSubmitting ? "Sending Invitation..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-card">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {member.full_name || member.email} from your team. They will no longer have access to your organization's data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteMember(member.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
    </DashboardLayout>
  );
};

export default TeamManagementPage;
