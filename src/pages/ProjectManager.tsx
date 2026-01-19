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
  Search,
  CalendarDays,
  FileText,
  Upload,
  Eye,
  XCircle,
  Inbox
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

// Helper function to get contract value indicator
const getContractIndicator = (contractValue: number | undefined) => {
  if (!contractValue || contractValue === 0) {
    return { icon: '✗', color: 'bg-red-600', text: 'No Contract' };
  } else if (contractValue >= 50000) {
    return { icon: '$$$', color: 'bg-emerald-600', text: `$${(contractValue / 1000).toFixed(0)}K` };
  } else if (contractValue >= 10000) {
    return { icon: '$$', color: 'bg-green-600', text: `$${(contractValue / 1000).toFixed(0)}K` };
  } else {
    return { icon: '$', color: 'bg-lime-600', text: `$${(contractValue / 1000).toFixed(0)}K` };
  }
};

interface SubTask {
  id: string;
  label: string;
  checked: boolean;
  deadline?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  subtasks?: SubTask[];
  expanded?: boolean;
  deadline?: string;
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

interface ProjectRequest {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_logo?: string;
  request_type: 'demo' | 'kickoff';
  description: string;
  file_url?: string;
  file_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by: string;
  submitted_by_name: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  created_at: string;
}

export default function ProjectManager() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectCustomer[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectCustomer | null>(null);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'demo' | 'requests'>('demo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Requests state
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<'demo' | 'kickoff'>('demo');
  const [requestCustomerId, setRequestCustomerId] = useState<string>('');
  const [requestDescription, setRequestDescription] = useState<string>('');
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [requestCustomerSearch, setRequestCustomerSearch] = useState<string>('');
  
  // For adding new customers
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  // For adding new checklist items (phases)
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  // For adding subtasks to phases
  const [newSubtask, setNewSubtask] = useState<{ [phaseId: string]: string }>({});
  
  // For editing phase/subtask labels
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{ phaseId: string; subtaskId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  
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

  // Track contract values by customer
  const [contractValuesByCustomer, setContractValuesByCustomer] = useState<Record<string, number>>({});

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

      // Fetch contracts with their values
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('customer_id, value, status')
        .in('status', ['active', 'pending']);

      if (contractsError) {
        console.error('Error fetching contracts:', contractsError);
      } else if (contracts) {
        console.log('Contracts found:', contracts.length, contracts);
        // Sum up contract values per customer
        const valuesByCustomer: Record<string, number> = {};
        contracts.forEach(contract => {
          if (contract.customer_id) {
            if (!valuesByCustomer[contract.customer_id]) {
              valuesByCustomer[contract.customer_id] = 0;
            }
            valuesByCustomer[contract.customer_id] += contract.value || 0;
          }
        });
        console.log('Contract values by customer:', valuesByCustomer);
        setContractValuesByCustomer(valuesByCustomer);
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

  // Load project requests
  const loadRequests = async () => {
    try {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from('project_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('project_requests table not found - run migration');
        } else {
          console.error('Error loading requests:', error);
        }
        return;
      }

      setRequests((data as unknown as ProjectRequest[]) || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Submit a new request
  const submitRequest = async () => {
    if (!requestCustomerId || !currentUser) {
      toast.error('Please select a customer');
      return;
    }

    const customer = allCustomers.find(c => c.id === requestCustomerId);
    if (!customer) return;

    try {
      setSaving(true);
      let fileUrl = null;
      let fileName = null;

      // Upload file if provided
      if (requestFile) {
        setUploadingFile(true);
        const fileExt = requestFile.name.split('.').pop();
        const filePath = `requests/${Date.now()}_${requestFile.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, requestFile);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast.error('Failed to upload file');
          setUploadingFile(false);
          setSaving(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = requestFile.name;
        setUploadingFile(false);
      }

      const requestData = {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_logo: customer.logo || null,
        request_type: requestType,
        description: requestDescription,
        file_url: fileUrl,
        file_name: fileName,
        status: 'pending',
        submitted_by: currentUser.id,
        submitted_by_name: currentUser.name,
      };

      const { error } = await supabase
        .from('project_requests' as any)
        .insert(requestData);

      if (error) {
        console.error('Error submitting request:', error);
        toast.error('Failed to submit request');
        return;
      }

      toast.success(`${requestType === 'demo' ? 'Demo' : 'Kickoff'} request submitted`);
      setIsRequestDialogOpen(false);
      setRequestCustomerId('');
      setRequestDescription('');
      setRequestFile(null);
      setRequestCustomerSearch('');
      loadRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setSaving(false);
    }
  };

  // Approve request and move to project manager
  const approveRequest = async (request: ProjectRequest) => {
    if (!currentUser) return;

    try {
      setSaving(true);

      // Create project in project_manager
      const newProject = {
        customer_id: request.customer_id,
        customer_name: request.customer_name,
        customer_logo: request.customer_logo || null,
        service_type: null,
        project_manager: '',
        service_description: request.description || '',
        checklist_items: [
          { id: crypto.randomUUID(), label: 'Phase 1', checked: false, subtasks: [], expanded: true },
          { id: crypto.randomUUID(), label: 'Phase 2', checked: false, subtasks: [], expanded: true },
          { id: crypto.randomUUID(), label: 'Phase 3', checked: false, subtasks: [], expanded: true },
        ],
        notes: '',
        status: request.request_type === 'demo' ? 'demo' : 'ongoing',
        priority: 'moderate' as Priority,
        file_url: request.file_url || null,
        file_name: request.file_name || null,
        demo_date: request.request_type === 'demo' ? new Date().toISOString().split('T')[0] : null,
      };

      const { error: projectError } = await supabase
        .from('project_manager' as any)
        .insert(newProject);

      if (projectError) {
        console.error('Error creating project:', projectError);
        toast.error('Failed to create project');
        return;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('project_requests' as any)
        .update({
          status: 'approved',
          reviewed_by: currentUser.id,
          reviewed_by_name: currentUser.name,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) {
        console.error('Error updating request:', updateError);
      }

      toast.success(`Request approved! ${request.customer_name} added to ${request.request_type === 'demo' ? 'Demos' : 'Ongoing'}`);
      loadRequests();
      loadProjects();
      
      // Switch to the appropriate tab
      setActiveTab(request.request_type === 'demo' ? 'demo' : 'ongoing');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setSaving(false);
    }
  };

  // Reject request
  const rejectRequest = async (request: ProjectRequest) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('project_requests' as any)
        .update({
          status: 'rejected',
          reviewed_by: currentUser.id,
          reviewed_by_name: currentUser.name,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) {
        console.error('Error rejecting request:', error);
        toast.error('Failed to reject request');
        return;
      }

      toast.success('Request rejected');
      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  // Delete request
  const deleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('project_requests' as any)
        .delete()
        .eq('id', requestId);

      if (error) {
        console.error('Error deleting request:', error);
        toast.error('Failed to delete request');
        return;
      }

      toast.success('Request deleted');
      loadRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    }
  };

  // Initial load from database
  useEffect(() => {
    loadProjects();
    fetchAllCustomers();
    fetchUsers();
    fetchCurrentUser();
    loadRequests();
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

  // Real-time subscription for project requests
  useEffect(() => {
    const channel = supabase
      .channel('project-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_requests'
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Count pending requests for badge
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

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
      status: activeTab === 'completed' ? 'demo' : activeTab,
        priority: 'moderate' as Priority,
        demo_date: activeTab === 'demo' ? new Date().toISOString().split('T')[0] : null,
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
    // Stay on current tab (already on the right tab)
      
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
    toast.success(`${customer.name} added to ${activeTab === 'demo' ? 'Demos' : 'Ongoing'}`);
      
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

  const updatePhaseDeadline = (phaseId: string, deadline: string) => {
    if (!selectedProject) return;

    const updatedItems = selectedProject.checklist_items.map(item =>
      item.id === phaseId ? { ...item, deadline: deadline || undefined } : item
    );
    updateProject(selectedProject.id, { checklist_items: updatedItems });
  };

  const updateSubtaskDeadline = (phaseId: string, subtaskId: string, deadline: string) => {
    if (!selectedProject) return;

    const updatedItems = selectedProject.checklist_items.map(item =>
      item.id === phaseId 
        ? { 
            ...item, 
            subtasks: (item.subtasks || []).map(st =>
              st.id === subtaskId ? { ...st, deadline: deadline || undefined } : st
            )
          }
        : item
    );
    updateProject(selectedProject.id, { checklist_items: updatedItems });
  };

  // Get deadline status for phase/subtask
  const getTaskDeadlineInfo = (deadline?: string) => {
    if (!deadline) return null;
    const info = getDeadlineInfo(deadline);
    return info;
  };

  // Start editing a phase
  const startEditingPhase = (phaseId: string, currentLabel: string) => {
    setEditingPhase(phaseId);
    setEditingSubtask(null);
    setEditValue(currentLabel);
  };

  // Start editing a subtask
  const startEditingSubtask = (phaseId: string, subtaskId: string, currentLabel: string) => {
    setEditingSubtask({ phaseId, subtaskId });
    setEditingPhase(null);
    setEditValue(currentLabel);
  };

  // Save phase edit
  const savePhaseEdit = (phaseId: string) => {
    if (!selectedProject || !editValue.trim()) {
      setEditingPhase(null);
      return;
    }

    const updatedItems = selectedProject.checklist_items.map(item =>
      item.id === phaseId ? { ...item, label: editValue.trim() } : item
    );
    updateProject(selectedProject.id, { checklist_items: updatedItems });
    setEditingPhase(null);
    setEditValue('');
  };

  // Save subtask edit
  const saveSubtaskEdit = (phaseId: string, subtaskId: string) => {
    if (!selectedProject || !editValue.trim()) {
      setEditingSubtask(null);
      return;
    }

    const updatedItems = selectedProject.checklist_items.map(item =>
      item.id === phaseId 
        ? { 
            ...item, 
            subtasks: (item.subtasks || []).map(st =>
              st.id === subtaskId ? { ...st, label: editValue.trim() } : st
            )
          }
        : item
    );
    updateProject(selectedProject.id, { checklist_items: updatedItems });
    setEditingSubtask(null);
    setEditValue('');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingPhase(null);
    setEditingSubtask(null);
    setEditValue('');
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
                          const contractValue = contractValuesByCustomer[customer.id];
                          const contractIndicator = getContractIndicator(contractValue);
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
                                  variant="default"
                                  className={`text-xs ${contractIndicator.color} hover:opacity-90`}
                                  title={contractIndicator.text}
                                >
                                  {contractIndicator.icon}
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
                {/* Adding to current tab: {activeTab} */}
                <div className="text-sm text-muted-foreground">
                  Adding to: <span className="font-medium text-foreground">{activeTab === 'demo' ? 'Demos' : 'Ongoing Projects'}</span>
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
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Avatar 
            className="h-9 w-9 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/customers/${project.customer_id}`);
            }}
          >
            <AvatarImage src={project.customer_logo || undefined} alt={project.customer_name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold">
              {project.customer_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            {/* Row 1: Name + Progress */}
            <div className="flex items-center justify-between gap-2">
              <h4 
                className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors truncate"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/customers/${project.customer_id}`);
                }}
              >
                {project.customer_name}
              </h4>
              <div className="flex items-center gap-1.5 shrink-0">
                {activeTab !== 'completed' && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    {project.checklist_items.filter(i => i.checked).length}/{project.checklist_items.length}
                  </Badge>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove from Projects?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove {project.customer_name} from the project manager.
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
            </div>
            
            {/* Row 2: Key badges */}
            <div className="flex items-center gap-1.5 mt-1">
              {(() => {
                const contractValue = contractValuesByCustomer[project.customer_id];
                const contractIndicator = getContractIndicator(contractValue);
                return (
                  <Badge
                    variant="default"
                    className={`text-[10px] h-4 px-1.5 ${contractIndicator.color}`}
                    title={contractIndicator.text}
                  >
                    {contractIndicator.icon}
                  </Badge>
                );
              })()}
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {project.service_type || 'N/A'}
              </Badge>
              {project.status === 'demo' && project.demo_delivered && (
                <Badge className="text-[10px] h-4 px-1.5 bg-green-600">✓</Badge>
              )}
            </div>
            
            {/* Row 3: Manager + Deadline */}
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <span className="text-[10px] text-muted-foreground truncate">
                {project.project_manager || 'Unassigned'}
                {project.secondary_project_manager && ` +1`}
              </span>
              {project.deadline && activeTab !== 'completed' && (
                <Badge className={`text-[10px] h-4 px-1.5 shrink-0 ${getDeadlineInfo(project.deadline)?.color}`}>
                  {getDeadlineInfo(project.deadline)?.label}
                </Badge>
              )}
              {activeTab === 'demo' && project.demo_date && !project.deadline && (
                <span className="text-[10px] text-blue-500 shrink-0">
                  {new Date(project.demo_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
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
                      {editingPhase === phase.id ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => savePhaseEdit(phase.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') savePhaseEdit(phase.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="h-6 text-sm font-medium flex-1"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className={`flex-1 font-medium cursor-text hover:bg-muted/50 px-1 py-0.5 rounded ${
                            isAllComplete ? 'line-through text-muted-foreground' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingPhase(phase.id, phase.label);
                          }}
                        >
                          {phase.label}
                        </span>
                      )}
                      {/* Phase Deadline */}
                      {phase.deadline ? (
                        <Badge className={`text-[10px] h-5 shrink-0 ${getTaskDeadlineInfo(phase.deadline)?.color}`}>
                          {getTaskDeadlineInfo(phase.deadline)?.label}
                          <button
                            className="ml-1 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              updatePhaseDeadline(phase.id, '');
                            }}
                          >
                            ×
                          </button>
                        </Badge>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <input
                            type="date"
                            className="h-5 w-5 opacity-0 absolute cursor-pointer"
                            onChange={(e) => updatePhaseDeadline(phase.id, e.target.value)}
                          />
                          <CalendarDays className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                        </div>
                      )}
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
                            {editingSubtask?.phaseId === phase.id && editingSubtask?.subtaskId === subtask.id ? (
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveSubtaskEdit(phase.id, subtask.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveSubtaskEdit(phase.id, subtask.id);
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                className="h-5 text-sm flex-1"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span
                                className={`flex-1 text-sm cursor-text hover:bg-muted/50 px-1 py-0.5 rounded ${
                                  subtask.checked ? 'line-through text-muted-foreground' : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingSubtask(phase.id, subtask.id, subtask.label);
                                }}
                              >
                                {subtask.label}
                              </span>
                            )}
                            {/* Subtask Deadline */}
                            {subtask.deadline ? (
                              <Badge className={`text-[10px] h-4 shrink-0 ${getTaskDeadlineInfo(subtask.deadline)?.color}`}>
                                {getTaskDeadlineInfo(subtask.deadline)?.label}
                                <button
                                  className="ml-1 hover:text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateSubtaskDeadline(phase.id, subtask.id, '');
                                  }}
                                >
                                  ×
                                </button>
                              </Badge>
                            ) : (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 relative">
                                <input
                                  type="date"
                                  className="h-4 w-4 opacity-0 absolute cursor-pointer"
                                  onChange={(e) => updateSubtaskDeadline(phase.id, subtask.id, e.target.value)}
                                />
                                <CalendarDays className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />
                              </div>
                            )}
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
          setActiveTab(v as 'ongoing' | 'completed' | 'demo' | 'requests');
          setSelectedProject(null);
        }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4 flex-wrap w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="requests" className="gap-2 relative">
                  <Inbox className="h-4 w-4" />
                  Requests
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {pendingRequestsCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="demo" className="gap-2">
                  <Play className="h-4 w-4" />
                  Demos
                  <Badge variant="secondary" className="ml-1">{demoCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="ongoing" className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Ongoing
                  <Badge variant="secondary" className="ml-1">{ongoingCount}</Badge>
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

          <TabsContent value="requests" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Request List */}
              <Card className="lg:col-span-1 border-2 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Pending Requests</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => loadRequests()} title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            New Request
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Submit Project Request</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            {/* Request Type */}
                            <div className="space-y-2">
                              <Label>Request Type</Label>
                              <Select
                                value={requestType}
                                onValueChange={(v) => setRequestType(v as 'demo' | 'kickoff')}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="demo">
                                    <div className="flex items-center gap-2">
                                      <Play className="h-4 w-4 text-blue-500" />
                                      <span>Demo Request</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="kickoff">
                                    <div className="flex items-center gap-2">
                                      <ArrowRight className="h-4 w-4 text-green-500" />
                                      <span>Project Kickoff</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Customer Selection */}
                            <div className="space-y-2">
                              <Label>Select Customer</Label>
                              <Input
                                placeholder="Search customer..."
                                value={requestCustomerSearch}
                                onChange={(e) => setRequestCustomerSearch(e.target.value)}
                                className="mb-2"
                              />
                              <div className="border rounded-md max-h-40 overflow-y-auto">
                                {allCustomers
                                  .filter(c => c.name.toLowerCase().includes(requestCustomerSearch.toLowerCase()))
                                  .slice(0, 10)
                                  .map(customer => (
                                    <div
                                      key={customer.id}
                                      className={`p-2 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0 text-sm ${
                                        requestCustomerId === customer.id ? 'bg-primary/10 border-primary' : ''
                                      }`}
                                      onClick={() => setRequestCustomerId(customer.id)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={customer.logo} />
                                          <AvatarFallback className="text-[10px]">
                                            {customer.name.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{customer.name}</span>
                                      </div>
                                    </div>
                                  ))}
                                {allCustomers.filter(c => c.name.toLowerCase().includes(requestCustomerSearch.toLowerCase())).length === 0 && (
                                  <div className="p-3 text-sm text-muted-foreground text-center">
                                    No customers found
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                placeholder="Describe the request, goals, or any special requirements..."
                                value={requestDescription}
                                onChange={(e) => setRequestDescription(e.target.value)}
                                rows={3}
                              />
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2">
                              <Label>Attach Proposal (Optional)</Label>
                              <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                                {requestFile ? (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-5 w-5 text-primary" />
                                      <span className="text-sm font-medium truncate max-w-[200px]">
                                        {requestFile.name}
                                      </span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setRequestFile(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    <span className="text-sm text-muted-foreground">
                                      Click to upload or drag and drop
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1">
                                      PDF, DOC, DOCX, PPT, PPTX
                                    </span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setRequestFile(file);
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>

                            <Button 
                              onClick={submitRequest} 
                              className="w-full" 
                              disabled={!requestCustomerId || saving || uploadingFile}
                            >
                              {uploadingFile ? 'Uploading...' : saving ? 'Submitting...' : 'Submit Request'}
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
                      {loadingRequests ? (
                        <div className="space-y-2">
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      ) : requests.filter(r => r.status === 'pending').length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No pending requests</p>
                          <p className="text-xs mt-1">Click "New Request" to submit one</p>
                        </div>
                      ) : (
                        requests
                          .filter(r => r.status === 'pending')
                          .map((request) => (
                            <Card
                              key={request.id}
                              className="border-border hover:shadow-md transition-all"
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-10 w-10 shrink-0">
                                    <AvatarImage src={request.customer_logo} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold">
                                      {request.customer_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="font-semibold text-sm truncate">
                                        {request.customer_name}
                                      </h4>
                                      <Badge 
                                        variant={request.request_type === 'demo' ? 'secondary' : 'default'}
                                        className="shrink-0"
                                      >
                                        {request.request_type === 'demo' ? 'Demo' : 'Kickoff'}
                                      </Badge>
                                    </div>
                                    {request.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {request.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-[10px] text-muted-foreground">
                                        by {request.submitted_by_name}
                                      </span>
                                      {request.file_url && (
                                        <a
                                          href={request.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                                        >
                                          <FileText className="h-3 w-3" />
                                          {request.file_name || 'View file'}
                                        </a>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                        onClick={() => approveRequest(request)}
                                        disabled={saving}
                                      >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs text-destructive hover:text-destructive"
                                        onClick={() => rejectRequest(request)}
                                        disabled={saving}
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Reject
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Request History */}
              <Card className="lg:col-span-2 border-2 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Request History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[520px]">
                    <div className="space-y-3">
                      {requests.filter(r => r.status !== 'pending').length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No processed requests yet</p>
                        </div>
                      ) : (
                        requests
                          .filter(r => r.status !== 'pending')
                          .map((request) => (
                            <Card
                              key={request.id}
                              className={`border ${
                                request.status === 'approved' 
                                  ? 'border-green-500/30 bg-green-500/5' 
                                  : 'border-red-500/30 bg-red-500/5'
                              }`}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 shrink-0">
                                      <AvatarImage src={request.customer_logo} />
                                      <AvatarFallback className="text-xs">
                                        {request.customer_name.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{request.customer_name}</span>
                                        <Badge 
                                          variant={request.request_type === 'demo' ? 'secondary' : 'outline'}
                                          className="text-[10px]"
                                        >
                                          {request.request_type === 'demo' ? 'Demo' : 'Kickoff'}
                                        </Badge>
                                        <Badge 
                                          variant={request.status === 'approved' ? 'default' : 'destructive'}
                                          className="text-[10px]"
                                        >
                                          {request.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                                        </Badge>
                                      </div>
                                      {request.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {request.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                        <span>Submitted by {request.submitted_by_name}</span>
                                        {request.reviewed_by_name && (
                                          <span>
                                            • {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.reviewed_by_name}
                                          </span>
                                        )}
                                        {request.file_url && (
                                          <a
                                            href={request.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline"
                                          >
                                            <FileText className="h-3 w-3" />
                                            {request.file_name || 'View file'}
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                    onClick={() => deleteRequest(request.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="demo" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {renderProjectList()}
              {renderProjectDetails()}
            </div>
          </TabsContent>

          <TabsContent value="ongoing" className="mt-0">
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
