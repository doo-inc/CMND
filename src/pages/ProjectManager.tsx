import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  UserPlus, 
  X,
  Calendar,
  ArrowRight,
  Sparkles,
  Play,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ProjectCustomer {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_logo?: string;
  service_type?: string | null;
  project_manager: string;
  service_description: string;
  checklist_items: ChecklistItem[];
  notes: string;
  status: 'ongoing' | 'completed' | 'demo';
  demo_date?: string;
  created_at: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface Customer {
  id: string;
  name: string;
  logo?: string;
  service_type?: string | null;
  project_owner?: string | null;
  [key: string]: any;
}

export default function ProjectManager() {
  const [projects, setProjects] = useState<ProjectCustomer[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectCustomer | null>(null);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'demo'>('ongoing');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // For adding new customers
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [addToTab, setAddToTab] = useState<'ongoing' | 'demo'>('ongoing');
  const [customerSearch, setCustomerSearch] = useState('');
  
  // For adding new checklist items
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Load projects from database (shared across all users)
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_manager' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading projects:', error);
        // If table doesn't exist, show helpful message
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast.error('Project Manager table not found. Please run the database migration.');
        } else {
          toast.error(`Failed to load projects: ${error.message}`);
        }
        return;
      }

      const formattedProjects: ProjectCustomer[] = ((data || []) as any[]).map((p: any) => ({
        id: p.id,
        customer_id: p.customer_id,
        customer_name: p.customer_name,
        customer_logo: p.customer_logo || undefined,
        service_type: p.service_type,
        project_manager: p.project_manager || '',
        service_description: p.service_description || '',
        checklist_items: (p.checklist_items as ChecklistItem[]) || [],
        notes: p.notes || '',
        status: p.status as 'ongoing' | 'completed' | 'demo',
        demo_date: p.demo_date || undefined,
        created_at: p.created_at,
      }));

      setProjects(formattedProjects);
      
      // Update selected project if it exists
      if (selectedProject) {
        const updated = formattedProjects.find(p => p.id === selectedProject.id);
        if (updated) {
          setSelectedProject(updated);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id]);

  const fetchAllCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }
      setAllCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Initial load from database
  useEffect(() => {
    loadProjects();
    fetchAllCustomers();
  }, []);

  // Real-time subscription for live updates across users
  useEffect(() => {
    const channel = supabase
      .channel('project-manager-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_manager'
        },
        (payload) => {
          console.log('🔄 Project Manager change detected:', payload.eventType);
          loadProjects();
        }
      )
      .subscribe((status) => {
        console.log('📡 Project Manager realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjects]);

  const addCustomerToProject = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    const customer = allCustomers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    try {
      setSaving(true);
      
      const newProject = {
      customer_id: customer.id,
      customer_name: customer.name,
        customer_logo: customer.logo || null,
        service_type: customer.service_type || null,
        project_manager: customer.project_owner || '',
      service_description: '',
      checklist_items: [
        { id: crypto.randomUUID(), label: 'Agent Creation', checked: false },
        { id: crypto.randomUUID(), label: 'Channel Integration', checked: false },
        { id: crypto.randomUUID(), label: 'Custom Function', checked: false },
      ],
      notes: '',
      status: addToTab,
        demo_date: addToTab === 'demo' ? new Date().toISOString().split('T')[0] : null,
      };

      console.log('Inserting project:', newProject);
      
      const { data, error } = await supabase
        .from('project_manager' as any)
        .insert(newProject)
        .select()
        .single();

      if (error) {
        console.error('Error adding project:', JSON.stringify(error, null, 2));
        toast.error(`Failed to add customer: ${error.message || error.code || JSON.stringify(error)}`);
        return;
      }

    setSelectedCustomerId('');
    setCustomerSearch('');
    setIsAddDialogOpen(false);
    setActiveTab(addToTab);
      
      // Set the new project as selected
      const responseData = data as any;
      const formattedProject: ProjectCustomer = {
        id: responseData.id,
        customer_id: responseData.customer_id,
        customer_name: responseData.customer_name,
        customer_logo: responseData.customer_logo || undefined,
        service_type: responseData.service_type,
        project_manager: responseData.project_manager || '',
        service_description: responseData.service_description || '',
        checklist_items: (responseData.checklist_items as ChecklistItem[]) || [],
        notes: responseData.notes || '',
        status: responseData.status as 'ongoing' | 'completed' | 'demo',
        demo_date: responseData.demo_date || undefined,
        created_at: responseData.created_at,
      };
      
      setSelectedProject(formattedProject);
    toast.success(`${customer.name} added to ${addToTab === 'demo' ? 'Demos' : 'Ongoing'}`);
      
      // Refresh the list
      loadProjects();
    } catch (error: any) {
      console.error('Error adding project:', error);
      toast.error(`Failed to add customer: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('project_manager' as any)
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Error removing project:', error);
        toast.error('Failed to remove project');
        return;
      }

    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
    toast.success('Customer removed from projects');
      loadProjects();
    } catch (error) {
      console.error('Error removing project:', error);
      toast.error('Failed to remove project');
    }
  };

  const updateProject = async (projectId: string, updates: Partial<ProjectCustomer>) => {
    try {
      // Optimistic update for UI responsiveness
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, ...updates } : p
    ));
    if (selectedProject?.id === projectId) {
      setSelectedProject({ ...selectedProject, ...updates });
      }

      const dbUpdates: any = {};
      if (updates.project_manager !== undefined) dbUpdates.project_manager = updates.project_manager;
      if (updates.service_description !== undefined) dbUpdates.service_description = updates.service_description;
      if (updates.checklist_items !== undefined) dbUpdates.checklist_items = updates.checklist_items;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.demo_date !== undefined) dbUpdates.demo_date = updates.demo_date || null;

      const { error } = await supabase
        .from('project_manager' as any)
        .update(dbUpdates)
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project:', error);
        // Revert on error
        loadProjects();
      }
    } catch (error) {
      console.error('Error updating project:', error);
      loadProjects();
    }
  };

  const addChecklistItem = () => {
    if (!selectedProject || !newChecklistItem.trim()) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      label: newChecklistItem.trim(),
      checked: false,
    };

    const updatedItems = [...selectedProject.checklist_items, newItem];
    updateProject(selectedProject.id, { checklist_items: updatedItems });
    setNewChecklistItem('');
    toast.success('Checklist item added');
  };

  const removeChecklistItem = (itemId: string) => {
    if (!selectedProject) return;

    const updatedItems = selectedProject.checklist_items.filter(item => item.id !== itemId);
    updateProject(selectedProject.id, { checklist_items: updatedItems });
    toast.success('Checklist item removed');
  };

  const toggleChecklistItem = (itemId: string) => {
    if (!selectedProject) return;

    const updatedItems = selectedProject.checklist_items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    updateProject(selectedProject.id, { checklist_items: updatedItems });
  };

  const moveToCompleted = () => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, { status: 'completed' });
    setActiveTab('completed');
    toast.success(`${selectedProject.customer_name} moved to Completed`);
  };

  const moveToOngoing = () => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, { status: 'ongoing' });
    setActiveTab('ongoing');
    toast.success(`${selectedProject.customer_name} moved to Ongoing`);
  };

  const filteredProjects = projects.filter(p => p.status === activeTab);
  const ongoingCount = projects.filter(p => p.status === 'ongoing').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const demoCount = projects.filter(p => p.status === 'demo').length;

  const availableCustomers = allCustomers;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[600px]" />
            <Skeleton className="h-[600px] lg:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderProjectList = () => (
    <Card className="lg:col-span-1 border-2 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {activeTab === 'ongoing' && 'Ongoing Projects'}
            {activeTab === 'completed' && 'Completed Projects'}
            {activeTab === 'demo' && 'Scheduled Demos'}
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => loadProjects()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <UserPlus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Customer to Projects</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Search Customer</Label>
                  <Input
                    placeholder="Type customer name..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {availableCustomers.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                          No customers found
                      </div>
                    ) : availableCustomers.filter(c => 
                      c.name.toLowerCase().includes(customerSearch.toLowerCase())
                    ).length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No customers found matching "{customerSearch}"
                      </div>
                    ) : (
                      availableCustomers
                        .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                        .map(customer => (
                          <div
                            key={customer.id}
                            className={`p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0 ${
                              selectedCustomerId === customer.id ? 'bg-primary/10 border-primary' : ''
                            }`}
                            onClick={() => setSelectedCustomerId(customer.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{customer.name}</span>
                              <Badge variant={customer.service_type ? "secondary" : "outline"} className="text-xs">
                                {customer.service_type || 'No Service Type'}
                              </Badge>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Add to</Label>
                  <Select value={addToTab} onValueChange={(v) => setAddToTab(v as 'ongoing' | 'demo')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ongoing">Ongoing Projects</SelectItem>
                      <SelectItem value="demo">Demos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                  <Button onClick={addCustomerToProject} className="w-full" disabled={!selectedCustomerId || saving}>
                  <Plus className="h-4 w-4 mr-2" />
                    {saving ? 'Adding...' : 'Add Customer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[550px]">
          <div className="space-y-2 p-4">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No {activeTab} projects yet</p>
                <p className="text-xs mt-1">Click "Add" to get started</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  className={`cursor-pointer transition-all hover:shadow-md group ${
                    selectedProject?.id === project.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={project.customer_logo || undefined} alt={project.customer_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                        {project.customer_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{project.customer_name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={project.service_type ? 'secondary' : 'outline'} className="text-xs h-5">
                          {project.service_type 
                            ? project.service_type.charAt(0).toUpperCase() + project.service_type.slice(1)
                            : 'N/A'}
                        </Badge>
                        {project.project_manager && (
                          <span className="text-xs text-muted-foreground truncate">
                            {project.project_manager}
                          </span>
                        )}
                      </div>
                      {activeTab === 'demo' && project.demo_date && (
                        <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(project.demo_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeTab !== 'completed' && (
                        <Badge variant="outline" className="text-xs">
                          {project.checklist_items.filter(i => i.checked).length}/{project.checklist_items.length}
                        </Badge>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove from Projects?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {project.customer_name} from the project manager. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => removeProject(project.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const renderProjectDetails = () => {
    if (!selectedProject) {
      return (
        <Card className="lg:col-span-2 border-2 border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
            <Sparkles className="h-16 w-16 mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">Select a Project</h3>
            <p className="text-sm text-center max-w-sm">
              Choose a customer from the list to view and edit their project details
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="lg:col-span-2 border-2 border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedProject.customer_logo || undefined} alt={selectedProject.customer_name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
                  {selectedProject.customer_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{selectedProject.customer_name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={
                    selectedProject.status === 'completed' ? 'default' : 
                    selectedProject.status === 'demo' ? 'secondary' : 'outline'
                  }>
                    {selectedProject.status === 'ongoing' && 'Ongoing'}
                    {selectedProject.status === 'completed' && 'Completed'}
                    {selectedProject.status === 'demo' && 'Demo Scheduled'}
                  </Badge>
                  <Badge variant={selectedProject.service_type ? 'secondary' : 'destructive'}>
                    {selectedProject.service_type 
                      ? `Service: ${selectedProject.service_type.charAt(0).toUpperCase() + selectedProject.service_type.slice(1)}`
                      : 'Service Type: Not Available'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedProject.status === 'demo' && (
                <>
                  <Button size="sm" variant="outline" onClick={moveToOngoing}>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Move to Ongoing
                  </Button>
                  <Button size="sm" onClick={moveToCompleted} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                </>
              )}
              {selectedProject.status === 'ongoing' && (
                <Button size="sm" onClick={moveToCompleted} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              )}
              {selectedProject.status === 'completed' && (
                <Button size="sm" variant="outline" onClick={moveToOngoing}>
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Reopen
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove {selectedProject.customer_name} from the project manager. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => removeProject(selectedProject.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Manager */}
            <div className="space-y-2">
              <Label htmlFor="project-manager">Project Manager</Label>
              <Input
                id="project-manager"
                placeholder="Enter project manager name"
                value={selectedProject.project_manager}
                onChange={(e) => updateProject(selectedProject.id, { project_manager: e.target.value })}
                className="bg-background"
              />
            </div>

            {/* Demo Date (only for demos) */}
            {selectedProject.status === 'demo' && (
              <div className="space-y-2">
                <Label htmlFor="demo-date">Demo Date</Label>
                <Input
                  id="demo-date"
                  type="date"
                  value={selectedProject.demo_date || ''}
                  onChange={(e) => updateProject(selectedProject.id, { demo_date: e.target.value })}
                  className="bg-background"
                />
              </div>
            )}
          </div>

          {/* Service Description */}
          <div className="space-y-2">
            <Label htmlFor="service-description">Service Description</Label>
            <Textarea
              id="service-description"
              placeholder="Describe the services being implemented for this customer..."
              value={selectedProject.service_description}
              onChange={(e) => updateProject(selectedProject.id, { service_description: e.target.value })}
              rows={3}
              className="resize-none bg-background"
            />
          </div>

          {/* Implementation Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Implementation Checklist</Label>
              <Badge variant="secondary">
                {selectedProject.checklist_items.filter(i => i.checked).length} / {selectedProject.checklist_items.length} completed
              </Badge>
            </div>
            
            <div className="space-y-2 rounded-lg border border-border/50 p-3 bg-muted/30">
              {selectedProject.checklist_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 group">
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={() => toggleChecklistItem(item.id)}
                  />
                  <Label
                    htmlFor={item.id}
                    className={`flex-1 text-sm font-normal cursor-pointer ${
                      item.checked ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {item.label}
                  </Label>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => removeChecklistItem(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {/* Add new checklist item */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
                <Input
                  placeholder="Add new item..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                  className="h-8 text-sm bg-background"
                />
                <Button size="sm" variant="outline" onClick={addChecklistItem} disabled={!newChecklistItem.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Implementation Notes */}
          <div className="space-y-2">
            <Label htmlFor="implementation-notes">Notes</Label>
            <Textarea
              id="implementation-notes"
              placeholder="Add notes about the implementation process..."
              value={selectedProject.notes}
              onChange={(e) => updateProject(selectedProject.id, { notes: e.target.value })}
              rows={4}
              className="resize-none bg-background"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Project Manager
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage customer implementations, demos, and project progress
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as 'ongoing' | 'completed' | 'demo');
          setSelectedProject(null);
        }}>
          <TabsList className="mb-6">
            <TabsTrigger value="ongoing" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Ongoing
              <Badge variant="secondary" className="ml-1">{ongoingCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="demo" className="gap-2">
              <Play className="h-4 w-4" />
              Demos
              <Badge variant="secondary" className="ml-1">{demoCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
              <Badge variant="secondary" className="ml-1">{completedCount}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {renderProjectList()}
              {renderProjectDetails()}
            </div>
          </TabsContent>

          <TabsContent value="demo" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {renderProjectList()}
              {renderProjectDetails()}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {renderProjectList()}
              {renderProjectDetails()}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
