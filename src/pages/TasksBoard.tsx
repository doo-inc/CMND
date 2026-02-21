import React, { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Rocket, Plus, Calendar, Edit, Trash2, GripVertical, Check, X, Settings, AlertTriangle, Clock, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { createNotification } from "@/utils/notificationHelpers";
import { Task, TaskCategory, TASK_CATEGORIES } from "@/types/tasks";
import { logActivity } from "@/utils/activityLogger";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Column {
  id: string;
  name: string;
  color: string;
  isCompleted?: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: "backlog", name: "Backlog", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
  { id: "in-progress", name: "In Progress", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { id: "review", name: "Review", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { id: "done", name: "Done", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", isCompleted: true },
];

const COLUMN_COLORS = [
  { id: "slate", class: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
  { id: "blue", class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { id: "purple", class: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { id: "amber", class: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { id: "green", class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { id: "red", class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { id: "pink", class: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" },
  { id: "cyan", class: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300" },
];

function getDaysUntilDue(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
}

function getUrgencyInfo(daysLeft: number) {
  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}d overdue`, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800", dot: "bg-red-500", pulse: true };
  if (daysLeft === 0) return { label: "Due today", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800", dot: "bg-orange-500", pulse: true };
  if (daysLeft === 1) return { label: "Due tomorrow", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", dot: "bg-amber-500", pulse: false };
  if (daysLeft <= 3) return { label: `${daysLeft}d left`, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800", dot: "bg-yellow-500", pulse: false };
  return { label: `${daysLeft}d left`, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800", dot: "bg-blue-500", pulse: false };
}

function getCategoryBadge(category: TaskCategory) {
  const cat = TASK_CATEGORIES.find(c => c.id === category) || TASK_CATEGORIES[2];
  return cat;
}

const TasksBoard = () => {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [columnsLoaded, setColumnsLoaded] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isManagingColumns, setIsManagingColumns] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [reminderTab, setReminderTab] = useState<TaskCategory | "all">("all");
  const [showCompleted, setShowCompleted] = useState(false);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    status: "backlog",
    category: "General",
    due_date: null,
    customer_id: null,
    assigned_to: null
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchColumns = async () => {
    const { data, error } = await (supabase as any)
      .from('board_columns')
      .select('*')
      .order('position', { ascending: true });
    
    if (error) {
      console.error('Error fetching columns:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const dbColumns: Column[] = data.map((col: any) => ({
        id: col.id,
        name: col.name,
        color: getColorForColumn(col.id, col.is_completed),
        isCompleted: col.is_completed
      }));
      setColumns(dbColumns);
    }
    setColumnsLoaded(true);
  };

  const getColorForColumn = (id: string, isCompleted: boolean): string => {
    if (isCompleted || id === 'done') return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (id === 'in-progress') return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    if (id === 'review') return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    if (id === 'todo' || id === 'backlog') return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    return COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)].class;
  };

  const saveColumnToDb = async (column: Column, position: number) => {
    const { error } = await (supabase as any)
      .from('board_columns')
      .upsert({
        id: column.id,
        name: column.name,
        is_completed: column.isCompleted || false,
        position: position,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
  };

  const deleteColumnFromDb = async (columnId: string) => {
    const { error } = await (supabase as any)
      .from('board_columns')
      .delete()
      .eq('id', columnId);
    
    if (error) throw error;
  };

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`*, customers(name)`)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
      
      const assigneeIds = [...new Set(data.filter(t => t.assigned_to).map(t => t.assigned_to))];
      let profilesMap: Record<string, { full_name: string | null; email: string }> = {};
      
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', assigneeIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, email: p.email };
            return acc;
          }, {} as Record<string, { full_name: string | null; email: string }>);
        }
      }
      
      const tasksWithAssignees = data.map((task) => {
        const profile = task.assigned_to ? profilesMap[task.assigned_to] : null;
        return {
          ...task,
          category: (task as any).category || "General",
          customer_name: task.customers?.name || null,
          assigned_to_name: profile?.full_name || profile?.email || null,
          completed_by_name: null
        };
      });
      
      return tasksWithAssignees as Task[];
    }
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      if (error) return [];
      return data;
    }
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-list'],
    queryFn: async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      
      if (!profilesError && profilesData && profilesData.length > 0) {
        return profilesData.map(member => ({
          id: member.id,
          name: member.full_name || member.email || 'Unknown'
        }));
      }
      
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, email')
        .order('name');
        
      if (!staffError && staffData && staffData.length > 0) {
        return staffData.map(member => ({
          id: member.id,
          name: member.name || member.email || 'Unknown'
        }));
      }
      
      return [];
    }
  });

  useEffect(() => {
    fetchColumns();
    
    const columnsChannel = supabase
      .channel('board_columns_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_columns' }, () => {
        fetchColumns();
      })
      .subscribe();
    
    const tasksChannel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        refetch();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(columnsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [refetch]);

  // Derived data: non-completed tasks with due dates in the next 7 days (or overdue)
  const isCompletedColumn = (c: Column) =>
    c.isCompleted || c.id === "done" || c.name.toLowerCase().includes("done") || c.name.toLowerCase().includes("complete");

  const activeColumns = useMemo(() => columns.filter(c => !isCompletedColumn(c)), [columns]);
  const activeColumnIds = useMemo(() => new Set(activeColumns.map(c => c.id)), [activeColumns]);

  const isTaskCompleted = (t: Task) =>
    !!t.completed_at || !activeColumnIds.has(t.status);

  const completedTasks = useMemo(() => tasks.filter(t => isTaskCompleted(t)), [tasks, activeColumnIds]);

  const dueSoonTasks = useMemo(() => {
    return tasks
      .filter(t => t.due_date && !isTaskCompleted(t))
      .map(t => ({ ...t, _daysLeft: getDaysUntilDue(t.due_date!) }))
      .filter(t => t._daysLeft <= 7)
      .sort((a, b) => a._daysLeft - b._daysLeft);
  }, [tasks, activeColumnIds]);

  const recentlyAdded = useMemo(() => {
    return tasks
      .filter(t => !isTaskCompleted(t))
      .slice(0, 5);
  }, [tasks, activeColumnIds]);

  const filteredDueSoon = useMemo(() => {
    if (reminderTab === "all") return dueSoonTasks;
    return dueSoonTasks.filter(t => t.category === reminderTab);
  }, [dueSoonTasks, reminderTab]);

  const stats = useMemo(() => {
    const active = tasks.filter(t => !isTaskCompleted(t));
    const overdueTasks = dueSoonTasks.filter(t => t._daysLeft < 0);
    const dueTodayTasks = dueSoonTasks.filter(t => t._daysLeft === 0);
    const coeCount = active.filter(t => t.category === "COE").length;
    const bdCount = active.filter(t => t.category === "BD").length;

    const breakdown = (list: Task[]) => {
      const coe = list.filter(t => t.category === "COE").length;
      const bd = list.filter(t => t.category === "BD").length;
      const gen = list.filter(t => t.category !== "COE" && t.category !== "BD").length;
      const parts: string[] = [];
      if (coe) parts.push(`${coe} COE`);
      if (bd) parts.push(`${bd} BD`);
      if (gen) parts.push(`${gen} General`);
      return parts.join(" · ");
    };

    return {
      active: active.length,
      overdue: overdueTasks.length,
      overdueBreakdown: breakdown(overdueTasks),
      dueToday: dueTodayTasks.length,
      dueTodayBreakdown: breakdown(dueTodayTasks),
      coeCount,
      bdCount
    };
  }, [tasks, activeColumnIds, dueSoonTasks]);

  // Column management
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error("Please enter a column name");
      return;
    }
    
    const newColumn: Column = {
      id: `col-${Date.now()}`,
      name: newColumnName.trim(),
      color: COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)].class
    };
    
    const completedIndex = columns.findIndex(c => c.isCompleted);
    const newColumns = [...columns];
    if (completedIndex >= 0) {
      newColumns.splice(completedIndex, 0, newColumn);
    } else {
      newColumns.push(newColumn);
    }
    
    try {
      for (let i = 0; i < newColumns.length; i++) {
        await saveColumnToDb(newColumns[i], i);
      }
      setColumns(newColumns);
      setNewColumnName("");
      setAddingColumn(false);
      toast.success("Column added");
    } catch {
      toast.error("Failed to add column");
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column?.isCompleted) {
      toast.error("Cannot delete the Completed column");
      return;
    }
    
    const tasksInColumn = tasks.filter(t => t.status === columnId);
    if (tasksInColumn.length > 0) {
      toast.error("Move all tasks out of this column before deleting");
      return;
    }
    
    try {
      await deleteColumnFromDb(columnId);
      setColumns(prev => prev.filter(col => col.id !== columnId));
      toast.success("Column deleted");
    } catch {
      toast.error("Failed to delete column");
    }
  };

  const handleResetColumns = async () => {
    try {
      const { error: deleteError } = await (supabase as any)
        .from('board_columns')
        .delete()
        .neq('id', 'placeholder');
      
      if (deleteError) throw deleteError;
      
      for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
        await saveColumnToDb(DEFAULT_COLUMNS[i], i);
      }
      
      setColumns(DEFAULT_COLUMNS);
      toast.success("Columns reset to defaults");
    } catch {
      toast.error("Failed to reset columns");
    }
  };

  const handleRenameColumn = async (columnId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedColumns = columns.map(col => 
      col.id === columnId ? { ...col, name: newName.trim() } : col
    );
    
    try {
      const column = updatedColumns.find(c => c.id === columnId);
      if (column) {
        const position = updatedColumns.findIndex(c => c.id === columnId);
        await saveColumnToDb(column, position);
      }
      setColumns(updatedColumns);
      setEditingColumnId(null);
      toast.success("Column renamed");
    } catch {
      toast.error("Failed to rename column");
    }
  };

  const handleChangeColumnColor = async (columnId: string, color: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, color } : col
    ));
  };

  // Task CRUD
  const getValidId = (value: string | null | undefined): string | undefined => {
    if (!value || value === 'none' || value === 'unassigned' || value === '' || value === 'null') return undefined;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) return undefined;
    return value;
  };

  const handleCreateTask = async () => {
    try {
      const insertData: any = {
        title: newTask.title,
        description: newTask.description || '',
        status: newTask.status || 'backlog',
        category: newTask.category || 'General'
      };
      
      if (newTask.due_date) insertData.due_date = newTask.due_date;
      
      const customerId = getValidId(newTask.customer_id);
      if (customerId) insertData.customer_id = customerId;
      
      const assignedTo = getValidId(newTask.assigned_to);
      if (assignedTo) insertData.assigned_to = assignedTo;
      
      let { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select();
      
      if (error && (error.message?.includes('foreign key') || error.message?.includes('fkey') || error.message?.includes('violates'))) {
        delete insertData.assigned_to;
        const retry1 = await supabase.from('tasks').insert(insertData).select();
        data = retry1.data;
        error = retry1.error;
        
        if (error && (error.message?.includes('foreign key') || error.message?.includes('fkey') || error.message?.includes('violates'))) {
          delete insertData.customer_id;
          const retry2 = await supabase.from('tasks').insert(insertData).select();
          data = retry2.data;
          error = retry2.error;
        }
      }
        
      if (error) throw error;
      
      await logActivity({
        action: 'task_created',
        entityType: 'task' as any,
        entityId: data[0].id,
        entityName: newTask.title,
        details: { assigned_to: newTask.assigned_to, status: newTask.status, category: newTask.category }
      });
      
      if (insertData.assigned_to) {
        await createNotification({
          type: 'team',
          title: 'Task Assigned to You',
          message: `You have been assigned a new task: ${newTask.title}`,
          related_id: data[0].id,
          related_type: 'task',
          user_id: insertData.assigned_to
        });
      }
      
      setNewTask({
        title: "",
        description: "",
        status: activeColumns[0]?.id || "backlog",
        category: "General",
        due_date: null,
        customer_id: null,
        assigned_to: null
      });
      
      setIsAddingTask(false);
      toast.success("Mission created");
      refetch();
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast.error(`Failed to create mission: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    
    try {
      const getValidIdForUpdate = (value: string | null | undefined): string | null => {
        if (!value || value === 'none' || value === 'unassigned' || value === '' || value === 'null') return null;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) return null;
        return value;
      };
      
      const updateData: any = {
        title: editingTask.title,
        description: editingTask.description || '',
        status: editingTask.status || 'backlog',
        category: editingTask.category || 'General',
        due_date: editingTask.due_date || null,
        customer_id: getValidIdForUpdate(editingTask.customer_id),
        assigned_to: getValidIdForUpdate(editingTask.assigned_to)
      };
      
      const isCompletedColumn = columns.find(c => c.id === editingTask.status)?.isCompleted;
      const wasCompleted = columns.find(c => c.id === tasks.find(t => t.id === editingTask.id)?.status)?.isCompleted;
      
      if (isCompletedColumn && !wasCompleted) {
        const { data: userData } = await supabase.auth.getUser();
        updateData.completed_by = userData?.user?.id;
        updateData.completed_at = new Date().toISOString();
      } else if (!isCompletedColumn && wasCompleted) {
        updateData.completed_by = null;
        updateData.completed_at = null;
      }
      
      let { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', editingTask.id);
      
      if (error && error.message?.includes('completed')) {
        delete updateData.completed_by;
        delete updateData.completed_at;
        const result = await supabase.from('tasks').update(updateData).eq('id', editingTask.id);
        error = result.error;
      }
        
      if (error) throw error;
      
      setEditingTask(null);
      toast.success("Mission updated");
      refetch();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update mission");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success("Mission deleted");
      refetch();
    } catch {
      toast.error("Failed to delete mission");
    }
  };

  const handleMarkAsDone = async (taskId: string) => {
    try {
      const doneColumn = columns.find(c => isCompletedColumn(c));
      const doneStatus = doneColumn?.id || "done";

      const { data: userData } = await supabase.auth.getUser();
      const updateData: any = {
        status: doneStatus,
        completed_at: new Date().toISOString(),
        completed_by: userData?.user?.id || null
      };

      let { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);

      if (error && error.message?.includes('completed')) {
        delete updateData.completed_by;
        delete updateData.completed_at;
        const result = await supabase.from('tasks').update(updateData).eq('id', taskId);
        error = result.error;
      }

      if (error) throw error;
      toast.success("Mission completed!");
      refetch();
    } catch {
      toast.error("Failed to mark as done");
    }
  };

  // Drag & drop
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData("taskId", task.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    
    try {
      const task = tasks.find(t => t.id === taskId);
      const isCompletedColumn = columns.find(c => c.id === columnId)?.isCompleted;
      const wasCompleted = columns.find(c => c.id === task?.status)?.isCompleted;
      
      const updateData: any = { status: columnId };
      
      if (isCompletedColumn && !wasCompleted) {
        const { data: userData } = await supabase.auth.getUser();
        updateData.completed_by = userData?.user?.id;
        updateData.completed_at = new Date().toISOString();
      } else if (!isCompletedColumn && wasCompleted) {
        updateData.completed_by = null;
        updateData.completed_at = null;
      }
      
      let { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      
      if (error && error.message?.includes('completed')) {
        delete updateData.completed_by;
        delete updateData.completed_at;
        const result = await supabase.from('tasks').update(updateData).eq('id', taskId);
        error = result.error;
      }
        
      if (error) throw error;
      toast.success("Mission moved");
      refetch();
    } catch {
      toast.error("Failed to move mission");
    }
  };

  // Task form fields (shared between create and edit)
  const renderTaskFormFields = (
    taskData: Partial<Task>,
    onChange: (updates: Partial<Task>) => void
  ) => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label>Title</Label>
        <Input value={taskData.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea value={taskData.description || ""} onChange={(e) => onChange({ description: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={taskData.category || "General"} onValueChange={(value) => onChange({ category: value as TaskCategory })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_CATEGORIES.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cat.bg.split(' ')[0]}`} />
                    {cat.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Column</Label>
          <Select value={taskData.status || activeColumns[0]?.id} onValueChange={(value) => onChange({ status: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {activeColumns.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Due Date</Label>
          <Input type="date" value={taskData.due_date || ""} onChange={(e) => onChange({ due_date: e.target.value || null })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Customer</Label>
          <Select value={taskData.customer_id || "none"} onValueChange={(value) => onChange({ customer_id: value === "none" ? null : value })}>
            <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Assignee</Label>
          <Select value={taskData.assigned_to || "unassigned"} onValueChange={(value) => onChange({ assigned_to: value === "unassigned" ? null : value })}>
            <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  // Render a single task card in the kanban column
  const renderTaskCard = (task: Task, column: Column) => {
    const catInfo = getCategoryBadge(task.category);
    const hasDueDate = !!task.due_date;
    const daysLeft = hasDueDate ? getDaysUntilDue(task.due_date!) : null;
    const urgency = daysLeft !== null && !column.isCompleted ? getUrgencyInfo(daysLeft) : null;
    const isOverdueOrToday = urgency && daysLeft !== null && daysLeft <= 0;

    return (
      <div
        key={task.id}
        className={`bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group ${isOverdueOrToday ? "border-red-300 dark:border-red-700" : ""}`}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onClick={() => setEditingTask(task)}
      >
        <div className="flex justify-between items-start mb-1.5">
          <h4 className="font-semibold text-sm flex-1 pr-2 leading-snug">{task.title}</h4>
          <div className="flex space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {!column.isCompleted && (
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-green-100 hover:text-green-600" onClick={(e) => { e.stopPropagation(); handleMarkAsDone(task.id); }} title="Mark as Done">
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}>
              <Edit className="h-3 w-3 text-doo-purple-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}>
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
        )}

        {column.isCompleted && task.completed_by_name && (
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mb-2">
            <Check className="h-3 w-3" />
            <span>Done by {task.completed_by_name}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs gap-1 flex-wrap">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`text-[10px] h-5 ${catInfo.color} ${catInfo.bg} border-0`}>
              {catInfo.label}
            </Badge>
            {task.customer_name && (
              <Badge variant="outline" className="text-[10px] h-5">{task.customer_name}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {urgency && (
              <span className={`flex items-center gap-1 text-[10px] font-medium ${urgency.color}`}>
                {urgency.pulse && <span className="relative flex h-1.5 w-1.5"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${urgency.dot} opacity-75`}></span><span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${urgency.dot}`}></span></span>}
                {urgency.label}
              </span>
            )}
            {hasDueDate && !urgency && (
              <div className="flex items-center text-muted-foreground">
                <Calendar className="h-3 w-3 mr-0.5" />
                <span>{new Date(task.due_date!).toLocaleDateString()}</span>
              </div>
            )}
            {task.assigned_to_name && (
              <Badge variant="secondary" className="text-[10px] h-5 bg-doo-purple-100 text-doo-purple-800">
                {task.assigned_to_name}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderColumn = (column: Column) => {
    const columnTasks = tasks.filter(task => task.status === column.id && !isTaskCompleted(task));
    
    return (
      <div 
        key={column.id}
        className="flex flex-col h-full min-w-[280px]"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, column.id)}
      >
        <div className={`rounded-t-lg p-3 ${column.color}`}>
          <div className="flex items-center justify-between">
            {editingColumnId === column.id ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={columns.find(c => c.id === column.id)?.name || ""}
                  onChange={(e) => setColumns(prev => prev.map(c => c.id === column.id ? { ...c, name: e.target.value } : c))}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameColumn(column.id, columns.find(c => c.id === column.id)?.name || "");
                    if (e.key === 'Escape') setEditingColumnId(null);
                  }}
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRenameColumn(column.id, columns.find(c => c.id === column.id)?.name || "")}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingColumnId(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold flex items-center">
                  {column.name}
                  <Badge variant="outline" className="ml-2">{columnTasks.length}</Badge>
                </h3>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-60 hover:opacity-100" onClick={() => setEditingColumnId(column.id)} title="Rename column">
                    <Edit className="h-3 w-3" />
                  </Button>
                  {columns.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-60 hover:opacity-100 text-red-500" onClick={() => handleDeleteColumn(column.id)} title="Delete column">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="bg-muted/30 rounded-b-lg flex-1 p-2 space-y-2 min-h-[400px] overflow-y-auto">
          {columnTasks.map(task => renderTaskCard(task, column))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-doo-purple-500" />
            Mission Board
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsManagingColumns(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Columns
            </Button>
            <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
              <DialogTrigger asChild>
                <Button className="bg-doo-purple-500 hover:bg-doo-purple-600">
                  <Plus className="mr-2 h-4 w-4" /> Add Mission
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                  <DialogTitle>Create New Mission</DialogTitle>
                  <DialogDescription>Add a new mission to your board</DialogDescription>
                </DialogHeader>
                {renderTaskFormFields(newTask, (updates) => setNewTask(prev => ({ ...prev, ...updates })))}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingTask(false)}>Cancel</Button>
                  <Button className="bg-doo-purple-500 hover:bg-doo-purple-600" onClick={handleCreateTask} disabled={!newTask.title}>
                    Create Mission
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-doo-purple-100 dark:bg-doo-purple-900/30">
                <Rocket className="h-4 w-4 text-doo-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-bold">{stats.active}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-lg font-bold text-red-600">{stats.overdue}</p>
                {stats.overdueBreakdown && <p className="text-[10px] text-muted-foreground">{stats.overdueBreakdown}</p>}
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Today</p>
                <p className="text-lg font-bold text-orange-600">{stats.dueToday}</p>
                {stats.dueTodayBreakdown && <p className="text-[10px] text-muted-foreground">{stats.dueTodayBreakdown}</p>}
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-900/30">
                <Sparkles className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">COE</p>
                <p className="text-lg font-bold">{stats.coeCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-900/30">
                <Sparkles className="h-4 w-4 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">BD</p>
                <p className="text-lg font-bold">{stats.bdCount}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Rocket className="mr-2 h-5 w-5 text-doo-purple-500" />
              Mission Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {activeColumns.map(column => renderColumn(column))}
              
              {addingColumn ? (
                <div className="min-w-[280px] p-3 border-2 border-dashed border-border rounded-lg bg-muted/20">
                  <div className="space-y-3">
                    <Input
                      placeholder="Column name..."
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddColumn();
                        if (e.key === 'Escape') { setAddingColumn(false); setNewColumnName(""); }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddColumn}>Add</Button>
                      <Button size="sm" variant="outline" onClick={() => { setAddingColumn(false); setNewColumnName(""); }}>Cancel</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="min-w-[200px] h-12 border-dashed" onClick={() => setAddingColumn(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Column
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Completed section */}
        {completedTasks.length > 0 && (
          <Card className="p-0">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors rounded-lg"
            >
              {showCompleted ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-semibold text-sm">Completed</span>
              <Badge variant="secondary" className="text-xs">{completedTasks.length}</Badge>
            </button>
            {showCompleted && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {completedTasks.map(task => {
                    const catInfo = getCategoryBadge(task.category);
                    return (
                      <div
                        key={task.id}
                        onClick={() => setEditingTask(task)}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-accent/30 cursor-pointer transition-colors group"
                      >
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate line-through text-muted-foreground">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={`text-[10px] h-4 ${catInfo.color} ${catInfo.bg} border-0`}>{catInfo.label}</Badge>
                            {task.customer_name && <span className="text-[10px] text-muted-foreground">{task.customer_name}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Due Soon + Recently Added */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Due Soon Reminders */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Due Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={reminderTab} onValueChange={(v) => setReminderTab(v as TaskCategory | "all")}>
                <TabsList className="mb-3">
                  <TabsTrigger value="all" className="text-xs">
                    All
                    {dueSoonTasks.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{dueSoonTasks.length}</Badge>}
                  </TabsTrigger>
                  {TASK_CATEGORIES.map(cat => {
                    const count = dueSoonTasks.filter(t => t.category === cat.id).length;
                    return (
                      <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                        {cat.label}
                        {count > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{count}</Badge>}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {filteredDueSoon.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No missions due soon</p>
                  ) : (
                    filteredDueSoon.map(task => {
                      const urgency = getUrgencyInfo(task._daysLeft);
                      const catInfo = getCategoryBadge(task.category);
                      return (
                        <div
                          key={task.id}
                          onClick={() => setEditingTask(task)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${urgency.bg}`}
                        >
                          {urgency.pulse && (
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${urgency.dot} opacity-75`}></span>
                              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${urgency.dot}`}></span>
                            </span>
                          )}
                          {!urgency.pulse && <div className={`w-2.5 h-2.5 rounded-full ${urgency.dot} shrink-0`} />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] h-4 ${catInfo.color} ${catInfo.bg} border-0`}>{catInfo.label}</Badge>
                              {task.customer_name && <span className="text-[11px] text-muted-foreground truncate">{task.customer_name}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-semibold ${urgency.color}`}>{urgency.label}</p>
                            {task.assigned_to_name && <p className="text-[10px] text-muted-foreground mt-0.5">{task.assigned_to_name}</p>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* Recently Added */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-doo-purple-500" />
                Recently Added
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {recentlyAdded.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recent missions</p>
                ) : (
                  recentlyAdded.map(task => {
                    const catInfo = getCategoryBadge(task.category);
                    const age = getDaysUntilDue(task.created_at);
                    const ageLabel = Math.abs(age) === 0 ? "Today" : Math.abs(age) === 1 ? "Yesterday" : `${Math.abs(age)}d ago`;
                    return (
                      <div
                        key={task.id}
                        onClick={() => setEditingTask(task)}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full ${catInfo.bg.split(' ')[0]} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={`text-[10px] h-4 ${catInfo.color} ${catInfo.bg} border-0`}>{catInfo.label}</Badge>
                            {task.assigned_to_name && <span className="text-[10px] text-muted-foreground">{task.assigned_to_name}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{ageLabel}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Edit Mission</DialogTitle>
          </DialogHeader>
          {editingTask && renderTaskFormFields(editingTask, (updates) => setEditingTask(prev => prev ? { ...prev, ...updates } : prev))}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button className="bg-doo-purple-500 hover:bg-doo-purple-600" onClick={handleUpdateTask} disabled={!editingTask?.title}>
              Update Mission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Columns Dialog */}
      <Dialog open={isManagingColumns} onOpenChange={setIsManagingColumns}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
            <DialogDescription>Customize column names and colors.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {activeColumns.map((column) => (
              <div key={column.id} className="flex items-center gap-3 p-3 border rounded-md">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className={`w-4 h-4 rounded ${column.color.split(' ')[0]}`} />
                <span className="flex-1 font-medium">{column.name}</span>
                <Select value={column.color} onValueChange={(value) => handleChangeColumnColor(column.id, value)}>
                  <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMN_COLORS.map(color => (
                      <SelectItem key={color.id} value={color.class}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${color.class.split(' ')[0]}`} />
                          {color.id}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="ghost" onClick={handleResetColumns}>Reset to Defaults</Button>
            <Button variant="outline" onClick={() => setIsManagingColumns(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TasksBoard;
