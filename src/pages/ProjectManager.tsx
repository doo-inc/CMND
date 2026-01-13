import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  RefreshCw,
  Flame,
  AlertTriangle,
  Minus,
  Clock,
  ChevronDown,
  ChevronRight,
  Send,
  MessageCircle,
  Search
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

type Priority = 'high' | 'moderate' | 'low';

interface ProjectCustomer {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_logo?: string;
  service_type?: string | null;
  project_manager: string;
  secondary_project_manager?: string;
  service_description: string;
  checklist_items: ChecklistItem[];
  notes: string;
  status: 'ongoing' | 'completed' | 'demo';
  priority: Priority;
  deadline?: string;
  demo_date?: string;
  demo_delivered?: boolean; // Track if demo was delivered
  created_at: string;
}

// Helper function to calculate days until deadline and get color
const getDeadlineInfo = (deadline?: string) => {
  if (!deadline) return null;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { days: Math.abs(diffDays), label: `${Math.abs(diffDays)}d overdue`, color: 'bg-red-600 text-white', textColor: 'text-red-500' };
  } else if (diffDays === 0) {
    return { days: 0, label: 'Due today', color: 'bg-red-500 text-white', textColor: 'text-red-500' };
  } else if (diffDays <= 3) {
    return { days: diffDays, label: `${diffDays}d left`, color: 'bg-red-500/20 text-red-500 border border-red-500/30', textColor: 'text-red-500' };
  } else if (diffDays <= 7) {
    return { days: diffDays, label: `${diffDays}d left`, color: 'bg-orange-500/20 text-orange-500 border border-orange-500/30', textColor: 'text-orange-500' };
  } else if (diffDays <= 14) {
    return { days: diffDays, label: `${diffDays}d left`, color: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30', textColor: 'text-yellow-500' };
  } else {
    return { days: diffDays, label: `${diffDays}d left`, color: 'bg-green-500/20 text-green-500 border border-green-500/30', textColor: 'text-green-500' };
  }
};

interface SubTask {
  id: string;
  label: string;
  checked: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  subtasks?: SubTask[];
  expanded?: boolean;
}

interface Customer {
  id: string;
  name: string;
  logo?: string;
  service_type?: string | null;
  project_owner?: string | null;
  [key: string]: any;
}

interface ProjectMessage {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  message: string;
  created_at: string;
}

export default function ProjectManager() {
  const navigate = useNavigate();
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
  
  // For adding new checklist items (phases)
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  // For adding subtasks to phases
  const [newSubtask, setNewSubtask] = useState<{ [phaseId: string]: string }>({});
  
  // For filtering by assignee
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  
  // For search functionality
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  
  // Users list for assignee dropdown
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  
  // Chat messages for selected project
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Debounce timer for text field updates
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if secondary project manager field is visible
  const [showSecondaryManager, setShowSecondaryManager] = useState(false);
  
  // Debounce timer for search
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset secondary manager visibility when project changes
  useEffect(() => {
    setShowSecondaryManager(false);
  }, [selectedProject?.id]);

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
        secondary_project_manager: p.secondary_project_manager || undefined,
        service_description: p.service_description || '',
        checklist_items: (p.checklist_items as ChecklistItem[]) || [],
        notes: p.notes || '',
        status: p.status as 'ongoing' | 'completed' | 'demo',
        priority: (p.priority as Priority) || 'moderate',
        deadline: p.deadline || undefined,
        demo_date: p.demo_date || undefined,
        demo_delivered: p.demo_delivered || false,
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

  // Track which customers have contracts
  const [customersWithContracts, setCustomersWithContracts] = useState<Set<string>>(new Set());

  const fetchAllCustomers = async () => {
    try {
      // Fetch customers
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }
      setAllCustomers(data || []);

      // Fetch contracts to see which customers have them
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('customer_id, customers(name)');
      
      if (contractsError) {
        console.error('Error fetching contracts:', contractsError);
      } else if (contracts) {
        console.log('Contracts found:', contracts.length, contracts);
        const customerIdsWithContracts = new Set(
          contracts
            .map(c => c.customer_id)
            .filter((id): id is string => Boolean(id))
        );
        console.log('Customer IDs with contracts:', Array.from(customerIdsWithContracts));
        setCustomersWithContracts(customerIdsWithContracts);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) {
        console.error('Error fetching users:', error);
        return;
      }
      setUsers(data?.filter(u => u.full_name) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        setCurrentUser({
          id: user.id,
          name: profile?.full_name || user.email || 'Unknown',
          avatar: profile?.avatar_url
        });
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const loadMessages = async (projectId: string) => {
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('project_messages table not found - run migration');
        } else {
          console.error('Error loading messages:', error);
        }
        return;
      }

      setMessages((data as unknown as ProjectMessage[]) || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedProject || !newMessage.trim() || !currentUser) return;

    try {
      const messageData = {
        project_id: selectedProject.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_avatar: currentUser.avatar || null,
        message: newMessage.trim(),
      };

      const { error } = await supabase
        .from('project_messages' as any)
        .insert(messageData);

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial load from database
  useEffect(() => {
    loadProjects();
    fetchAllCustomers();
    fetchUsers();
    fetchCurrentUser();
  }, []);

  // Load messages when selected project changes
  useEffect(() => {
    if (selectedProject?.id) {
      loadMessages(selectedProject.id);
    } else {
      setMessages([]);
    }
  }, [selectedProject?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedProject?.id) return;

    const channel = supabase
      .channel(`project-messages-${selectedProject.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${selectedProject.id}`
        },
        (payload) => {
          const newMsg = payload.new as ProjectMessage;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${selectedProject.id}`
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages(prev => prev.filter(m => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProject?.id]);

  // Debounce search query
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Real-time subscription for live updates across users
  // Handles changes surgically without full page refresh
  useEffect(() => {
    const channel = supabase
      .channel('project-manager-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_manager'
        },
        (payload) => {
          // Skip if we're the one saving (we already have optimistic update)
          if (saving) return;
          
          const newRecord = payload.new as any;
          const newProject: ProjectCustomer = {
            id: newRecord.id,
            customer_id: newRecord.customer_id,
            customer_name: newRecord.customer_name,
            customer_logo: newRecord.customer_logo || undefined,
            service_type: newRecord.service_type,
            project_manager: newRecord.project_manager || '',
            secondary_project_manager: newRecord.secondary_project_manager || undefined,
            service_description: newRecord.service_description || '',
            checklist_items: (newRecord.checklist_items as ChecklistItem[]) || [],
            notes: newRecord.notes || '',
            status: newRecord.status as 'ongoing' | 'completed' | 'demo',
            priority: (newRecord.priority as Priority) || 'moderate',
            deadline: newRecord.deadline || undefined,
            demo_date: newRecord.demo_date || undefined,
            demo_delivered: newRecord.demo_delivered || false,
            created_at: newRecord.created_at,
          };
          
          // Add new project to state (avoid duplicates)
          setProjects(prev => {
            if (prev.some(p => p.id === newProject.id)) return prev;
            return [newProject, ...prev];
          });
          console.log('➕ New project added:', newProject.customer_name);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_manager'
        },
        (payload) => {
          // Skip if we're the one saving (we already have optimistic update)
          if (saving) return;
          
          const updatedRecord = payload.new as any;
          const updatedProject: ProjectCustomer = {
            id: updatedRecord.id,
            customer_id: updatedRecord.customer_id,
            customer_name: updatedRecord.customer_name,
            customer_logo: updatedRecord.customer_logo || undefined,
            service_type: updatedRecord.service_type,
            project_manager: updatedRecord.project_manager || '',
            secondary_project_manager: updatedRecord.secondary_project_manager || undefined,
            service_description: updatedRecord.service_description || '',
            checklist_items: (updatedRecord.checklist_items as ChecklistItem[]) || [],
            notes: updatedRecord.notes || '',
            status: updatedRecord.status as 'ongoing' | 'completed' | 'demo',
            priority: (updatedRecord.priority as Priority) || 'moderate',
            deadline: updatedRecord.deadline || undefined,
            demo_date: updatedRecord.demo_date || undefined,
            demo_delivered: updatedRecord.demo_delivered || false,
            created_at: updatedRecord.created_at,
          };
          
          // Update only the changed project in state
          setProjects(prev => prev.map(p => 
            p.id === updatedProject.id ? updatedProject : p
          ));
          
          // Update selected project if it's the one that changed
          setSelectedProject(prev => 
            prev?.id === updatedProject.id ? updatedProject : prev
          );
          console.log('✏️ Project updated:', updatedProject.customer_name);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'project_manager'
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          
          // Remove deleted project from state
          setProjects(prev => prev.filter(p => p.id !== deletedId));
          
          // Clear selection if deleted project was selected
          setSelectedProject(prev => prev?.id === deletedId ? null : prev);
          console.log('🗑️ Project deleted:', deletedId);
        }
      )
      .subscribe((status) => {
        console.log('📡 Project Manager realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [saving]);

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
        { id: crypto.randomUUID(), label: 'Phase 1', checked: false, subtasks: [], expanded: true },
        { id: crypto.randomUUID(), label: 'Phase 2', checked: false, subtasks: [], expanded: true },
        { id: crypto.randomUUID(), label: 'Phase 3', checked: false, subtasks: [], expanded: true },
      ],
      notes: '',
      status: addToTab,
        priority: 'moderate' as Priority,
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
        secondary_project_manager: responseData.secondary_project_manager || undefined,
        service_description: responseData.service_description || '',
        checklist_items: (responseData.checklist_items as ChecklistItem[]) || [],
        notes: responseData.notes || '',
        status: responseData.status as 'ongoing' | 'completed' | 'demo',
        priority: (responseData.priority as Priority) || 'moderate',
        deadline: responseData.deadline || undefined,
        demo_date: responseData.demo_date || undefined,
        demo_delivered: responseData.demo_delivered || false,
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

  const updateProject = async (projectId: string, updates: Partial<ProjectCustomer>, immediate = false) => {
    // Optimistic update for UI responsiveness (always instant)
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, ...updates } : p
    ));
    if (selectedProject?.id === projectId) {
      setSelectedProject({ ...selectedProject, ...updates });
      }

    // Debounce text field saves to avoid saving on every keystroke
    const isTextUpdate = 'service_description' in updates || 'notes' in updates;
    
    const saveToDb = async () => {
      try {
        setSaving(true);
      const dbUpdates: any = {};
      if (updates.project_manager !== undefined) dbUpdates.project_manager = updates.project_manager;
        if (updates.secondary_project_manager !== undefined) dbUpdates.secondary_project_manager = updates.secondary_project_manager || null;
      if (updates.service_description !== undefined) dbUpdates.service_description = updates.service_description;
      if (updates.checklist_items !== undefined) dbUpdates.checklist_items = updates.checklist_items;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline || null;
      if (updates.demo_date !== undefined) dbUpdates.demo_date = updates.demo_date || null;
        if (updates.demo_delivered !== undefined) dbUpdates.demo_delivered = updates.demo_delivered;

      const { error } = await supabase
        .from('project_manager' as any)
        .update(dbUpdates)
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project:', error);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      } finally {
        setSaving(false);
      }
    };

    // For text fields, debounce the save (wait 1 second after typing stops)
    if (isTextUpdate && !immediate) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(saveToDb, 1000);
    } else {
      // For non-text updates (checkboxes, dropdowns), save immediately
      await saveToDb();
    }
  };

  const addChecklistItem = () => {
    if (!selectedProject || !newChecklistItem.trim()) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      label: newChecklistItem.trim(),
      checked: false,
      subtasks: [],
      expanded: true,
    };

    const updatedItems = [...selectedProject.checklist_items, newItem];
    updateProject(selectedProject.id, { checklist_items: updatedItems });
    setNewChecklistItem('');
    toast.success('Phase added');
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

  const togglePhaseExpanded = (phaseId: string) => {
    if (!selectedProject) return;

    const updatedItems = selectedProject.checklist_items.map(item =>
      item.id === phaseId ? { ...item, expanded: !item.expanded } : item
    );
    updateProject(selectedProject.id, { checklist_items: updatedItems });
  };

  const addSubtask = (phaseId: string) => {
    if (!selectedProject || !newSubtask[phaseId]?.trim()) return;

    const newSubtaskItem: SubTask = {
      id: crypto.randomUUID(),
      label: newSubtask[phaseId].trim(),
      checked: false,
    };

    const updatedItems = selectedProject.checklist_items.map(item =>
      item.id === phaseId 
        ? { ...item, subtasks: [...(item.subtasks || []), newSubtaskItem] }
        : item
    );
    updateProject(selectedProject.id, { checklist_items: updatedItems });
    setNewSubtask(prev => ({ ...prev, [phaseId]: '' }));
  };

  const removeSubtask = (phaseId: string, subtaskId: string) => {
    if (!selectedProject) return;

    const updatedItems = selectedProject.checklist_items.map(item =>
      item.id === phaseId 
        ? { ...item, subtasks: (item.subtasks || []).filter(st => st.id !== subtaskId) }
        : item
    );
    updateProject(selectedProject.id, { checklist_items: updatedItems });
  };

  const toggleSubtask = (phaseId: string, subtaskId: string) => {
    if (!selectedProject) return;

    const updatedItems = selectedProject.checklist_items.map(item =>
      item.id === phaseId 
        ? { 
            ...item, 
            subtasks: (item.subtasks || []).map(st =>
              st.id === subtaskId ? { ...st, checked: !st.checked } : st
            )
          }
        : item
    );
    updateProject(selectedProject.id, { checklist_items: updatedItems });
  };

  // Calculate completion for a phase (including subtasks)
  const getPhaseCompletion = (phase: ChecklistItem) => {
    const subtasks = phase.subtasks || [];
    if (subtasks.length === 0) return { completed: phase.checked ? 1 : 0, total: 1 };
    const completed = subtasks.filter(st => st.checked).length;
    return { completed, total: subtasks.length };
  };

  // Calculate total completion across all phases
  const getTotalCompletion = () => {
    if (!selectedProject) return { completed: 0, total: 0 };
    let completed = 0;
    let total = 0;
    selectedProject.checklist_items.forEach(phase => {
      const subtasks = phase.subtasks || [];
      if (subtasks.length === 0) {
        total += 1;
        if (phase.checked) completed += 1;
      } else {
        total += subtasks.length;
        completed += subtasks.filter(st => st.checked).length;
      }
    });
    return { completed, total };
  };

  const moveToCompleted = async () => {
    if (!selectedProject) return;
    
    // Update project status
    updateProject(selectedProject.id, { status: 'completed' });
    setActiveTab('completed');
    toast.success(`${selectedProject.customer_name} moved to Completed`);
    
    // Log the completion to activity_logs
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        const { data: logData, error: logError } = await supabase.from('activity_logs').insert({
          user_id: user.id,
          user_email: user.email,
          user_name: profile?.full_name || user.email,
          action: 'Completed Client',
          entity_type: 'project',
          entity_id: selectedProject.id,
          entity_name: selectedProject.customer_name,
        }).select().single();
        
        if (logError) {
          console.error('Error inserting activity log:', logError);
        } else {
          console.log('Activity log created:', logData);
        }
      }
    } catch (error) {
      console.error('Error logging completion:', error);
    }
  };

  const moveToOngoing = () => {
    if (!selectedProject) return;
    // When moving to ongoing, reset demo_delivered flag
    updateProject(selectedProject.id, { status: 'ongoing', demo_delivered: false });
    setActiveTab('ongoing');
    toast.success(`${selectedProject.customer_name} moved to Ongoing`);
  };

  const markDemoDelivered = () => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, { demo_delivered: true });
    toast.success(`Demo marked as delivered for ${selectedProject.customer_name}`);
  };

  const filteredProjects = projects.filter(p => {
    const matchesStatus = p.status === activeTab;
    const matchesAssignee = selectedAssignee === 'all' || p.project_manager === selectedAssignee;
    
    // Search filtering (case-insensitive)
    const matchesSearch = debouncedSearchQuery.trim() === '' || 
      p.customer_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase().trim());
    
    return matchesStatus && matchesAssignee && matchesSearch;
  });
  
  // Group projects by priority
  const highPriorityProjects = filteredProjects.filter(p => p.priority === 'high');
  const moderatePriorityProjects = filteredProjects.filter(p => p.priority === 'moderate');
  const lowPriorityProjects = filteredProjects.filter(p => p.priority === 'low');
  
  const ongoingCount = projects.filter(p => p.status === 'ongoing').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const demoCount = projects.filter(p => p.status === 'demo').length;
  
  // Priority config for display
  const priorityConfig = {
    high: { label: 'High Priority', icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    moderate: { label: 'Moderate Priority', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    low: { label: 'Low Priority', icon: Minus, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  };

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
                        .map(customer => {
                          const hasContract = customersWithContracts.has(customer.id);
                          return (
                          <div
                            key={customer.id}
                            className={`p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0 ${
                              selectedCustomerId === customer.id ? 'bg-primary/10 border-primary' : ''
                            }`}
                            onClick={() => setSelectedCustomerId(customer.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{customer.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={hasContract ? "default" : "destructive"} 
                                  className={`text-xs ${hasContract ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                >
                                  {hasContract ? '✓ Contract' : 'No Contract'}
                                </Badge>
                                {customer.service_type && (
                                  <Badge variant="secondary" className="text-xs">
                                    {customer.service_type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          );
                        })
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
                {debouncedSearchQuery.trim() ? (
                  <p className="text-sm">No projects found</p>
                ) : (
                  <>
                    <p className="text-sm">No {activeTab} projects yet</p>
                    <p className="text-xs mt-1">Click "Add" to get started</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* High Priority Section */}
                {highPriorityProjects.length > 0 && (
                  <div className="mb-4">
                    <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md ${priorityConfig.high.bg} ${priorityConfig.high.border} border`}>
                      <Flame className={`h-4 w-4 ${priorityConfig.high.color}`} />
                      <span className={`text-sm font-semibold ${priorityConfig.high.color}`}>High Priority</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{highPriorityProjects.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {highPriorityProjects.map((project) => renderProjectCard(project))}
                    </div>
                  </div>
                )}
                
                {/* Moderate Priority Section */}
                {moderatePriorityProjects.length > 0 && (
                  <div className="mb-4">
                    <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md ${priorityConfig.moderate.bg} ${priorityConfig.moderate.border} border`}>
                      <AlertTriangle className={`h-4 w-4 ${priorityConfig.moderate.color}`} />
                      <span className={`text-sm font-semibold ${priorityConfig.moderate.color}`}>Moderate Priority</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{moderatePriorityProjects.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {moderatePriorityProjects.map((project) => renderProjectCard(project))}
                    </div>
                  </div>
                )}
                
                {/* Low Priority Section */}
                {lowPriorityProjects.length > 0 && (
                  <div className="mb-4">
                    <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md ${priorityConfig.low.bg} ${priorityConfig.low.border} border`}>
                      <Minus className={`h-4 w-4 ${priorityConfig.low.color}`} />
                      <span className={`text-sm font-semibold ${priorityConfig.low.color}`}>Low Priority</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{lowPriorityProjects.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {lowPriorityProjects.map((project) => renderProjectCard(project))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const renderProjectCard = (project: ProjectCustomer) => (
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
        <Avatar 
          className="h-10 w-10 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/customers/${project.customer_id}`);
          }}
        >
                      <AvatarImage src={project.customer_logo || undefined} alt={project.customer_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                        {project.customer_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
          <h4 
            className="font-semibold text-sm truncate cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/customers/${project.customer_id}`);
            }}
          >
            {project.customer_name}
          </h4>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge 
                          variant={customersWithContracts.has(project.customer_id) ? "default" : "destructive"} 
                          className={`text-xs h-5 ${customersWithContracts.has(project.customer_id) ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                          {customersWithContracts.has(project.customer_id) ? '✓ Contract' : 'No Contract'}
                        </Badge>
                        <Badge variant={project.service_type ? 'secondary' : 'outline'} className="text-xs h-5">
                          {project.service_type 
                            ? project.service_type.charAt(0).toUpperCase() + project.service_type.slice(1)
                            : 'N/A'}
                        </Badge>
            {project.status === 'demo' && project.demo_delivered && (
              <Badge variant="default" className="text-xs h-5 bg-green-600">
                Delivered
              </Badge>
            )}
                        {project.project_manager && (
                          <span className="text-xs text-muted-foreground truncate">
                            {project.project_manager}
                {project.secondary_project_manager && ` + ${project.secondary_project_manager}`}
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
          {/* Deadline countdown badge */}
          {project.deadline && activeTab !== 'completed' && (
            <Badge className={`text-xs ${getDeadlineInfo(project.deadline)?.color}`}>
              <Clock className="h-3 w-3 mr-1" />
              {getDeadlineInfo(project.deadline)?.label}
            </Badge>
          )}
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
          {/* Header Row: Avatar, Name, Badges */}
          <div className="flex items-start gap-3">
            <Avatar 
              className="h-12 w-12 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => navigate(`/customers/${selectedProject.customer_id}`)}
            >
                <AvatarImage src={selectedProject.customer_logo || undefined} alt={selectedProject.customer_name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
                  {selectedProject.customer_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle 
                className="text-xl cursor-pointer hover:text-primary transition-colors inline-block"
                onClick={() => navigate(`/customers/${selectedProject.customer_id}`)}
              >
                {selectedProject.customer_name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant={
                    selectedProject.status === 'completed' ? 'default' : 
                    selectedProject.status === 'demo' ? 'secondary' : 'outline'
                  }>
                    {selectedProject.status === 'ongoing' && 'Ongoing'}
                    {selectedProject.status === 'completed' && 'Completed'}
                    {selectedProject.status === 'demo' && 'Demo Scheduled'}
                  </Badge>
                {selectedProject.status === 'demo' && selectedProject.demo_delivered && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Demo Delivered
                  </Badge>
                )}
                  <Badge variant={selectedProject.service_type ? 'secondary' : 'destructive'}>
                    {selectedProject.service_type 
                      ? `Service: ${selectedProject.service_type.charAt(0).toUpperCase() + selectedProject.service_type.slice(1)}`
                      : 'Service Type: Not Available'}
                  </Badge>
                </div>
              </div>
            </div>
          
          {/* Action Buttons Row - Separate from header */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30 flex-wrap">
              {selectedProject.status === 'demo' && (
                <>
                {!selectedProject.demo_delivered && (
                  <Button size="sm" variant="secondary" onClick={markDemoDelivered}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Mark Demo Delivered
                  </Button>
                )}
                  <Button size="sm" variant="outline" onClick={moveToOngoing}>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Move to Ongoing
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
            <div className="flex-1" /> {/* Spacer to push delete to the right */}
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
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Manager */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <Label htmlFor="project-manager">Project Manager</Label>
                {!selectedProject.secondary_project_manager && !showSecondaryManager && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setShowSecondaryManager(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Secondary
                  </Button>
                )}
              </div>
              <Select
                value={selectedProject.project_manager || 'unassigned'}
                onValueChange={(value) => updateProject(selectedProject.id, { project_manager: value === 'unassigned' ? '' : value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.full_name}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Secondary Project Manager */}
              {(selectedProject.secondary_project_manager || showSecondaryManager) && (
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="secondary-manager" className="text-xs text-muted-foreground">Secondary Manager</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        updateProject(selectedProject.id, { secondary_project_manager: '' });
                        setShowSecondaryManager(false);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select
                    value={selectedProject.secondary_project_manager || 'unassigned'}
                    onValueChange={(value) => updateProject(selectedProject.id, { secondary_project_manager: value === 'unassigned' ? '' : value })}
                  >
                    <SelectTrigger className="bg-background h-8 text-sm">
                      <SelectValue placeholder="Select secondary" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">None</SelectItem>
                      {users
                        .filter(user => user.full_name !== selectedProject.project_manager)
                        .map((user) => (
                          <SelectItem key={user.id} value={user.full_name}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={selectedProject.priority}
                onValueChange={(value) => updateProject(selectedProject.id, { priority: value as Priority })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-red-500" />
                      <span>High Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="moderate">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span>Moderate Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-blue-500" />
                      <span>Low Priority</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <div className="relative">
                <Input
                  id="deadline"
                  type="date"
                  value={selectedProject.deadline || ''}
                  onChange={(e) => updateProject(selectedProject.id, { deadline: e.target.value })}
                  className="bg-background"
                />
                {selectedProject.deadline && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => updateProject(selectedProject.id, { deadline: '' })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {selectedProject.deadline && (
                <Badge className={`text-xs ${getDeadlineInfo(selectedProject.deadline)?.color}`}>
                  <Clock className="h-3 w-3 mr-1" />
                  {getDeadlineInfo(selectedProject.deadline)?.label}
                </Badge>
              )}
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
                {getTotalCompletion().completed} / {getTotalCompletion().total} completed
              </Badge>
            </div>
            
            <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/30">
              {selectedProject.checklist_items.map((phase) => {
                const completion = getPhaseCompletion(phase);
                const isAllComplete = completion.completed === completion.total && completion.total > 0;
                
                return (
                  <div key={phase.id} className="border border-border/30 rounded-md bg-background/50">
                    {/* Phase Header */}
                    <div className="flex items-center gap-2 p-2 group">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => togglePhaseExpanded(phase.id)}
                      >
                        {phase.expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <Checkbox
                        id={phase.id}
                        checked={isAllComplete || phase.checked}
                        onCheckedChange={() => toggleChecklistItem(phase.id)}
                        className="shrink-0"
                      />
                      <Label
                        htmlFor={phase.id}
                        className={`flex-1 font-medium cursor-pointer ${
                          isAllComplete ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {phase.label}
                      </Label>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {completion.completed}/{completion.total}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeChecklistItem(phase.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Subtasks (collapsible) */}
                    {phase.expanded && (
                      <div className="border-t border-border/30 px-2 pb-2">
                        {/* Existing subtasks */}
                        {(phase.subtasks || []).map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2 pl-8 py-1.5 group">
                            <Checkbox
                              id={subtask.id}
                              checked={subtask.checked}
                              onCheckedChange={() => toggleSubtask(phase.id, subtask.id)}
                              className="shrink-0"
                            />
                            <Label
                              htmlFor={subtask.id}
                              className={`flex-1 text-sm font-normal cursor-pointer ${
                                subtask.checked ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {subtask.label}
                            </Label>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                              onClick={() => removeSubtask(phase.id, subtask.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Add subtask input */}
                        <div className="flex items-center gap-2 pl-8 pt-2">
                          <Input
                            placeholder="Add subtask..."
                            value={newSubtask[phase.id] || ''}
                            onChange={(e) => setNewSubtask(prev => ({ ...prev, [phase.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addSubtask(phase.id)}
                            className="h-7 text-sm bg-background flex-1"
                          />
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 px-2"
                            onClick={() => addSubtask(phase.id)} 
                            disabled={!newSubtask[phase.id]?.trim()}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Add new phase */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
                <Input
                  placeholder="Add new phase..."
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

          {/* Team Chat */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Team Chat</Label>
              <Badge variant="secondary" className="text-xs">
                {messages.length} messages
              </Badge>
            </div>
            
            <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
              {/* Messages area */}
              <ScrollArea className="h-[200px] p-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                    <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-xs">Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg) => {
                      const isCurrentUser = msg.user_id === currentUser?.id;
                      const messageDate = new Date(msg.created_at);
                      const today = new Date();
                      const isToday = messageDate.toDateString() === today.toDateString();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const isYesterday = messageDate.toDateString() === yesterday.toDateString();
                      
                      const timeStr = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dateStr = isToday 
                        ? `Today, ${timeStr}`
                        : isYesterday 
                          ? `Yesterday, ${timeStr}`
                          : `${messageDate.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
                      
                      return (
                        <div key={msg.id} className="flex items-start gap-2 group hover:bg-muted/50 rounded px-1 py-1 -mx-1">
                          <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                            <AvatarImage src={msg.user_avatar} alt={msg.user_name} />
                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-medium">
                              {msg.user_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className={`text-sm font-medium ${isCurrentUser ? 'text-primary' : ''}`}>
                                {msg.user_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {dateStr}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 break-words">
                              {msg.message}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              
              {/* Message input */}
              <div className="border-t border-border/50 p-2 bg-background/50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="h-9 text-sm bg-background"
                  />
                  <Button 
                    size="sm" 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim() || !currentUser}
                    className="h-9 px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4 flex-wrap w-full sm:w-auto">
              <TabsList>
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
            </div>
            
            {/* Filters Row */}
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              {/* Search Input */}
              <div className="relative flex-1 sm:flex-initial sm:w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              
              {/* Assignee Filter */}
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="w-full sm:w-[180px] h-10">
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.full_name}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
