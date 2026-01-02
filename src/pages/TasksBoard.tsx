import React, { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Rocket, Plus, Calendar, Edit, Trash2, GripVertical, Check, X, Settings } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { createNotification } from "@/utils/notificationHelpers";
import { Task } from "@/types/tasks";
import { logActivity } from "@/utils/activityLogger";

// Column interface
interface Column {
  id: string; // Database status value: todo, in-progress, done, blocked
  name: string; // Display name (editable)
  color: string;
  isCompleted?: boolean; // Special flag for the completed column
}

// Default columns
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

const TasksBoard = () => {
  // Load columns from localStorage or use defaults
  const [columns, setColumns] = useState<Column[]>(() => {
    const saved = localStorage.getItem('mo-mission-board-columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure at least one column exists
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure there's a "done" / completed column
          const hasCompletedColumn = parsed.some((col: Column) => col.isCompleted || col.id === 'done');
          if (!hasCompletedColumn) {
            // Add a done column at the end
            parsed.push({ 
              id: "done", 
              name: "Done", 
              color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", 
              isCompleted: true 
            });
          }
          return parsed;
        }
      } catch {
        // Fall through to defaults
      }
    }
    return DEFAULT_COLUMNS;
  });

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isManagingColumns, setIsManagingColumns] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    status: columns[0]?.id || "todo",
    due_date: null,
    customer_id: null,
    assigned_to: null
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Save columns to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mo-mission-board-columns', JSON.stringify(columns));
  }, [columns]);

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          customers(name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
      
      // Fetch assignee names and completed_by names from profiles
      const tasksWithAssignees = await Promise.all(data.map(async (task) => {
        let assigneeName = null;
        let completedByName = null;
        
        if (task.assigned_to) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', task.assigned_to)
            .single();
          assigneeName = profile?.full_name || profile?.email || null;
        }
        
        // completed_by field not in schema - skip lookup
        
        return {
          ...task,
          customer_name: task.customers?.name || null,
          assigned_to_name: assigneeName,
          completed_by_name: completedByName
        };
      }));
      
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
        
      if (error) {
        console.error("Error fetching customers:", error);
        return [];
      }
      
      return data;
    }
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-list'],
    queryFn: async () => {
      // Try fetching from profiles first (linked to auth.users)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      
      if (!profilesError && profilesData && profilesData.length > 0) {
        console.log('Team members from profiles:', profilesData.length);
        return profilesData.map(member => ({
          id: member.id,
          name: member.full_name || member.email || 'Unknown'
        }));
      }
      
      // Fallback: try staff table (in case foreign key references staff)
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, email')
        .order('name');
        
      if (!staffError && staffData && staffData.length > 0) {
        console.log('Team members from staff:', staffData.length);
        return staffData.map(member => ({
          id: member.id,
          name: member.name || member.email || 'Unknown'
        }));
      }
      
      console.error("Error fetching team members:", profilesError || staffError);
      return [];
    }
  });

  // Column management functions
  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      toast.error("Please enter a column name");
      return;
    }
    
    const newColumn: Column = {
      id: `col-${Date.now()}`,
      name: newColumnName.trim(),
      color: COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)].class
    };
    
    // Insert before the completed column (if exists)
    const completedIndex = columns.findIndex(c => c.isCompleted);
    const newColumns = [...columns];
    if (completedIndex >= 0) {
      newColumns.splice(completedIndex, 0, newColumn);
    } else {
      newColumns.push(newColumn);
    }
    
    setColumns(newColumns);
    setNewColumnName("");
    setAddingColumn(false);
    toast.success("Column added");
  };

  const handleDeleteColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column?.isCompleted) {
      toast.error("Cannot delete the Completed column");
      return;
    }
    
    // Move tasks from deleted column to first column
    const tasksInColumn = tasks.filter(t => t.status === columnId);
    if (tasksInColumn.length > 0) {
      toast.error("Move all tasks out of this column before deleting");
      return;
    }
    
    setColumns(prev => prev.filter(col => col.id !== columnId));
    toast.success("Column deleted");
  };

  const handleResetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    localStorage.removeItem('mo-mission-board-columns');
    toast.success("Columns reset to defaults");
  };

  const handleRenameColumn = (columnId: string, newName: string) => {
    if (!newName.trim()) return;
    
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, name: newName.trim() } : col
    ));
    setEditingColumnId(null);
    toast.success("Column renamed");
  };


  const handleChangeColumnColor = (columnId: string, color: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, color } : col
    ));
  };

  const handleCreateTask = async () => {
    try {
      // Ensure proper null handling for foreign keys - must be valid UUID or undefined (not null for some Supabase configs)
      const getValidId = (value: string | null | undefined): string | undefined => {
        if (!value || value === 'none' || value === 'unassigned' || value === '' || value === 'null') {
          return undefined; // Use undefined instead of null to omit from insert
        }
        // Basic UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          console.warn('Invalid UUID detected:', value);
          return undefined;
        }
        return value;
      };
      
      // Build insert data
      const insertData: any = {
        title: newTask.title,
        description: newTask.description || '',
        status: newTask.status || 'backlog'
      };
      
      // Only add optional fields if they have valid values
      if (newTask.due_date) {
        insertData.due_date = newTask.due_date;
      }
      
      const customerId = getValidId(newTask.customer_id);
      if (customerId) {
        insertData.customer_id = customerId;
      }
      
      const assignedTo = getValidId(newTask.assigned_to);
      if (assignedTo) {
        insertData.assigned_to = assignedTo;
      }
      
      console.log('Creating task with data:', insertData);
      
      let { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select();
      
      // If foreign key error, retry without assigned_to
      if (error && (error.message?.includes('foreign key') || error.message?.includes('fkey') || error.message?.includes('violates'))) {
        console.log('Foreign key error, retrying without assigned_to:', error.message);
        delete insertData.assigned_to;
        const retry1 = await supabase.from('tasks').insert(insertData).select();
        data = retry1.data;
        error = retry1.error;
        
        // If still failing, also remove customer_id
        if (error && (error.message?.includes('foreign key') || error.message?.includes('fkey') || error.message?.includes('violates'))) {
          console.log('Still failing, retrying without customer_id:', error.message);
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
        details: { 
          assigned_to: newTask.assigned_to,
          status: newTask.status 
        }
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
        status: columns[0]?.id || "todo",
        due_date: null,
        customer_id: null,
        assigned_to: null
      });
      
      setIsAddingTask(false);
      toast.success("Task created successfully");
      refetch();
      
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast.error(`Failed to create task: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    
    try {
      // Ensure proper null handling for foreign keys
      const getValidId = (value: string | null | undefined): string | null => {
        if (!value || value === 'none' || value === 'unassigned' || value === '' || value === 'null') {
          return null;
        }
        // Basic UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          console.warn('Invalid UUID detected:', value);
          return null;
        }
        return value;
      };
      
      const updateData: any = {
        title: editingTask.title,
        description: editingTask.description || '',
        status: editingTask.status || 'backlog',
        due_date: editingTask.due_date || null,
        customer_id: getValidId(editingTask.customer_id),
        assigned_to: getValidId(editingTask.assigned_to)
      };
      
      console.log('Updating task with data:', updateData);
      
      // Check if moving to completed column
      const isCompletedColumn = columns.find(c => c.id === editingTask.status)?.isCompleted;
      const wasCompleted = columns.find(c => c.id === tasks.find(t => t.id === editingTask.id)?.status)?.isCompleted;
      
      // If moving to completed for the first time, record who completed it
      if (isCompletedColumn && !wasCompleted) {
        const { data: userData } = await supabase.auth.getUser();
        updateData.completed_by = userData?.user?.id;
        updateData.completed_at = new Date().toISOString();
      } else if (!isCompletedColumn && wasCompleted) {
        // If moving out of completed, clear the completed info
        updateData.completed_by = null;
        updateData.completed_at = null;
      }
      
      let { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', editingTask.id);
      
      // If error is about missing column, retry without completed fields
      if (error && error.message?.includes('completed')) {
        delete updateData.completed_by;
        delete updateData.completed_at;
        const result = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', editingTask.id);
        error = result.error;
      }
        
      if (error) throw error;
      
      setEditingTask(null);
      toast.success("Task updated successfully");
      refetch();
      
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
        
      if (error) throw error;
      
      toast.success("Task deleted successfully");
      refetch();
      
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleMarkAsDone = async (taskId: string) => {
    try {
      // Find the done column
      const doneColumn = columns.find(c => c.isCompleted || c.id === 'done');
      if (!doneColumn) {
        toast.error("No Done column found");
        return;
      }
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: doneColumn.id })
        .eq('id', taskId);
        
      if (error) throw error;
      
      toast.success("Task marked as done! ✓");
      refetch();
      
    } catch (error) {
      console.error("Error marking task as done:", error);
      toast.error("Failed to mark task as done");
    }
  };

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
      
      let { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);
      
      // If error is about missing column, retry without completed fields
      if (error && error.message?.includes('completed')) {
        delete updateData.completed_by;
        delete updateData.completed_at;
        const result = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId);
        error = result.error;
      }
        
      if (error) throw error;
      
      toast.success("Task moved");
      refetch();
      
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task");
    }
  };

  const renderColumn = (column: Column) => {
    const columnTasks = tasks.filter(task => task.status === column.id);
    
    return (
      <div 
        key={column.id}
        className="flex flex-col h-full min-w-[280px]"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, column.id)}
      >
        <div className={`rounded-t-md p-3 ${column.color}`}>
          <div className="flex items-center justify-between">
            {editingColumnId === column.id ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={columns.find(c => c.id === column.id)?.name || ""}
                  onChange={(e) => setColumns(prev => prev.map(c => 
                    c.id === column.id ? { ...c, name: e.target.value } : c
                  ))}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameColumn(column.id, columns.find(c => c.id === column.id)?.name || "");
                    }
                    if (e.key === 'Escape') {
                      setEditingColumnId(null);
                    }
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
                  <Badge variant="outline" className="ml-2">
                    {columnTasks.length}
                  </Badge>
                </h3>
                <div className="flex items-center gap-1">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 opacity-60 hover:opacity-100"
                    onClick={() => setEditingColumnId(column.id)}
                    title="Rename column"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  {!column.isCompleted && columns.length > 1 && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 opacity-60 hover:opacity-100 text-red-500"
                      onClick={() => handleDeleteColumn(column.id)}
                      title="Delete column"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="bg-muted/30 rounded-b-md flex-1 p-2 space-y-2 min-h-[400px] overflow-y-auto">
          {columnTasks.map(task => (
            <div 
              key={task.id}
              className="bg-card border rounded-md p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              draggable
              onDragStart={(e) => handleDragStart(e, task)}
              onClick={() => setEditingTask(task)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm flex-1 pr-2">{task.title}</h4>
                <div className="flex space-x-1">
                  {/* Quick Done button - only show if not already in done column */}
                  {!column.isCompleted && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 hover:bg-green-100 hover:text-green-600" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsDone(task.id);
                      }}
                      title="Mark as Done"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                    e.stopPropagation();
                    setEditingTask(task);
                  }}>
                    <Edit className="h-3 w-3 text-doo-purple-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTask(task.id);
                  }}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
              )}
              
              {/* Show completed by for completed tasks */}
              {column.isCompleted && task.completed_by_name && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mb-2">
                  <Check className="h-3 w-3" />
                  <span>Done by {task.completed_by_name}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  {task.customer_name && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {task.customer_name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {task.due_date && (
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {task.assigned_to && task.assigned_to_name && (
                    <Badge variant="secondary" className="text-[10px] h-5 bg-doo-purple-100 text-doo-purple-800">
                      {task.assigned_to_name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-doo-purple-500" />
            MO Mission Board
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
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Mission</DialogTitle>
                  <DialogDescription>
                    Add a new mission to your board
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="status">Column</Label>
                      <Select
                        value={newTask.status}
                        onValueChange={(value) => setNewTask({...newTask, status: value as Task["status"]})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map(col => (
                            <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newTask.due_date || ""}
                        onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customer">Customer</Label>
                      <Select
                        value={newTask.customer_id || "none"}
                        onValueChange={(value) => setNewTask({...newTask, customer_id: value === "none" ? null : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="assignee">Assignee</Label>
                      <Select
                        value={newTask.assigned_to || "unassigned"}
                        onValueChange={(value) => setNewTask({...newTask, assigned_to: value === "unassigned" ? null : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingTask(false)}>Cancel</Button>
                  <Button 
                    className="bg-doo-purple-500 hover:bg-doo-purple-600"
                    onClick={handleCreateTask}
                    disabled={!newTask.title}
                  >
                    Create Mission
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
              {columns.map(column => renderColumn(column))}
              
              {/* Add Column */}
              {addingColumn ? (
                <div className="min-w-[280px] p-3 border-2 border-dashed border-gray-300 rounded-md bg-muted/20">
                  <div className="space-y-3">
                    <Input
                      placeholder="Column name..."
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddColumn();
                        if (e.key === 'Escape') {
                          setAddingColumn(false);
                          setNewColumnName("");
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddColumn}>Add</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setAddingColumn(false);
                        setNewColumnName("");
                      }}>Cancel</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="min-w-[200px] h-12 border-dashed"
                  onClick={() => setAddingColumn(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Column
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Mission</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Column</Label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(value) => setEditingTask({...editingTask, status: value as Task["status"]})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={editingTask.due_date || ""}
                    onChange={(e) => setEditingTask({...editingTask, due_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-customer">Customer</Label>
                  <Select
                    value={editingTask.customer_id || "none"}
                    onValueChange={(value) => setEditingTask({...editingTask, customer_id: value === "none" ? null : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-assignee">Assignee</Label>
                  <Select
                    value={editingTask.assigned_to || "unassigned"}
                    onValueChange={(value) => setEditingTask({...editingTask, assigned_to: value === "unassigned" ? null : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button 
              className="bg-doo-purple-500 hover:bg-doo-purple-600"
              onClick={handleUpdateTask}
              disabled={!editingTask?.title}
            >
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
            <DialogDescription>
              Customize column names and colors. Click the pencil icon on any column header to rename it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center gap-3 p-3 border rounded-md">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className={`w-4 h-4 rounded ${column.color.split(' ')[0]}`} />
                <span className="flex-1 font-medium">{column.name}</span>
                {column.isCompleted && (
                  <Badge variant="secondary" className="text-xs">Done</Badge>
                )}
                <Select
                  value={column.color}
                  onValueChange={(value) => handleChangeColumnColor(column.id, value)}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
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
