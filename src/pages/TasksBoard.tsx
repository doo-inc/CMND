
import React, { useState } from "react";
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
  DialogDescription,
  DialogClose
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Kanban, Plus, Calendar, User, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { createNotification } from "@/utils/notificationHelpers";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done" | "blocked";
  due_date: string | null;
  customer_id: string | null;
  customer_name?: string;
  assigned_to: string | null;
  assigned_to_name?: string;
  created_at: string;
}

const TasksBoard = () => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    status: "todo",
    due_date: null,
    customer_id: null,
    assigned_to: null
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          customers(name),
          staff(name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
      
      return data.map(task => ({
        ...task,
        customer_name: task.customers?.name,
        assigned_to_name: task.staff?.name
      })) as Task[];
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

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name')
        .order('name');
        
      if (error) {
        console.error("Error fetching staff:", error);
        return [];
      }
      
      return data;
    }
  });

  const handleCreateTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          due_date: newTask.due_date,
          customer_id: newTask.customer_id,
          assigned_to: newTask.assigned_to
        })
        .select();
        
      if (error) throw error;
      
      if (newTask.assigned_to) {
        await createNotification({
          type: 'team',
          title: 'Task Assigned',
          message: `You have been assigned to a new task: ${newTask.title}`,
          related_id: data[0].id,
          related_type: 'task'
        });
      }
      
      setNewTask({
        title: "",
        description: "",
        status: "todo",
        due_date: null,
        customer_id: null,
        assigned_to: null
      });
      
      setIsAddingTask(false);
      toast.success("Task created successfully");
      refetch();
      
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: editingTask.title,
          description: editingTask.description,
          status: editingTask.status,
          due_date: editingTask.due_date,
          customer_id: editingTask.customer_id,
          assigned_to: editingTask.assigned_to
        })
        .eq('id', editingTask.id)
        .select();
        
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData("taskId", task.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, status: Task["status"]) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);
        
      if (error) throw error;
      
      toast.success("Task status updated");
      refetch();
      
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  const getStatusColumn = (status: Task["status"]) => {
    const statusTasks = tasks.filter(task => task.status === status);
    
    const getColumnTitle = () => {
      switch (status) {
        case "todo": return "To Do";
        case "in-progress": return "In Progress";
        case "done": return "Done";
        case "blocked": return "Blocked";
        default: return status;
      }
    };
    
    const getColumnColor = () => {
      switch (status) {
        case "todo": return "bg-doo-purple-100 text-doo-purple-800 dark:bg-doo-purple-900/30 dark:text-doo-purple-300";
        case "in-progress": return "bg-doo-purple-500/20 text-doo-purple-800 dark:bg-doo-purple-500/30 dark:text-doo-purple-300";
        case "done": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
        case "blocked": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
        default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      }
    };
    
    return (
      <div 
        key={status}
        className="flex flex-col h-full"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className={`rounded-t-md p-3 ${getColumnColor()}`}>
          <h3 className="font-semibold flex items-center">
            {getColumnTitle()}
            <Badge variant="outline" className="ml-2">
              {statusTasks.length}
            </Badge>
          </h3>
        </div>
        <div className="bg-muted/30 rounded-b-md flex-1 p-2 space-y-2 min-h-[400px] overflow-y-auto">
          {statusTasks.map(task => (
            <div 
              key={task.id}
              className="bg-card border rounded-md p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              draggable
              onDragStart={(e) => handleDragStart(e, task)}
              onClick={() => setEditingTask(task)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm">{task.title}</h4>
                <div className="flex space-x-1">
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
                  {task.assigned_to && (
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-doo-purple-100 text-doo-purple-800">
                        {task.assigned_to_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
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
          <h1 className="text-2xl font-bold">Task Board</h1>
          <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
            <DialogTrigger asChild>
              <Button className="bg-doo-purple-500 hover:bg-doo-purple-600">
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to your board
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
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newTask.status}
                      onValueChange={(value) => setNewTask({...newTask, status: value as Task["status"]})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
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
                      value={newTask.customer_id || ""}
                      onValueChange={(value) => setNewTask({...newTask, customer_id: value || null})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
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
                      value={newTask.assigned_to || ""}
                      onValueChange={(value) => setNewTask({...newTask, assigned_to: value || null})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {staff.map((person) => (
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
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Card className="p-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Kanban className="mr-2 h-5 w-5 text-doo-purple-500" />
              Kanban Board
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {getStatusColumn("todo")}
              {getStatusColumn("in-progress")}
              {getStatusColumn("done")}
              {getStatusColumn("blocked")}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
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
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(value) => setEditingTask({...editingTask, status: value as Task["status"]})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
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
                    value={editingTask.customer_id || ""}
                    onValueChange={(value) => setEditingTask({...editingTask, customer_id: value || null})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
                    value={editingTask.assigned_to || ""}
                    onValueChange={(value) => setEditingTask({...editingTask, assigned_to: value || null})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {staff.map((person) => (
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
              Update Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TasksBoard;
