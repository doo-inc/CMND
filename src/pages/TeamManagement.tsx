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
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  created_at: string;
}

const inviteFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.enum(["admin", "user"]),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

const TeamManagementPage = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "user",
    },
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (editMember) {
      form.reset({
        email: editMember.email,
        name: editMember.name,
        role: editMember.role,
      });
    } else {
      form.reset({
        email: "",
        name: "",
        role: "user",
      });
    }
  }, [editMember, form]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('staff')
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

  const onSubmit: SubmitHandler<InviteFormValues> = async (data) => {
    try {
      if (editMember) {
        const { error } = await supabase
          .from('staff')
          .update({
            name: data.name,
            email: data.email,
            role: data.role,
          })
          .eq('id', editMember.id);

        if (error) throw error;

        toast.success(`${data.name}'s details have been updated`);
        
        await createTeamNotification({
          type: 'team',
          title: 'Team Member Updated',
          message: `${data.name}'s details have been updated.`,
          related_id: editMember.id
        });
      } else {
        const { data: newMember, error } = await supabase
          .from('staff')
          .insert({
            name: data.name,
            email: data.email,
            role: data.role,
          })
          .select();

        if (error) throw error;

        toast.success(`Invitation sent to ${data.email}`);
        
        if (newMember && newMember.length > 0) {
          await createTeamNotification({
            type: 'team',
            title: 'New Team Member',
            message: `${data.name} has been invited to join the team.`,
            related_id: newMember[0].id
          });
        }
      }

      form.reset();
      setInviteDialogOpen(false);
      setEditMember(null);
      
      fetchTeamMembers();
    } catch (error) {
      console.error("Error saving team member:", error);
      toast.error("Failed to save team member");
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditMember(member);
    setInviteDialogOpen(true);
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('staff')
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const createTeamNotification = async (notificationData: CreateNotificationParams) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          notification: notificationData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      return await response.json();
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
                <DialogTitle>{editMember ? "Edit Team Member" : "Invite Team Member"}</DialogTitle>
                <DialogDescription>
                  {editMember 
                    ? "Update this team member's information and role."
                    : "Send an invitation to join your team. They'll receive an email with instructions."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="glass-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            disabled={!!editMember}
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
                    <Button type="submit" className="glass-button">
                      {editMember ? "Save Changes" : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

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
                        {member.avatar ? (
                          <AvatarImage src={member.avatar} alt={member.name} />
                        ) : null}
                        <AvatarFallback className={member.role === 'admin' ? 'bg-doo-purple-500' : 'bg-blue-500'}>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium">{member.name}</p>
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
                                This will remove {member.name} from your team. They will no longer have access to your organization's data.
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
