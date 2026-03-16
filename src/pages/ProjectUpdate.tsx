import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Play,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  ClipboardCheck,
  Search,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SubTask {
  id: string;
  label: string;
  checked: boolean;
  deadline?: string;
  stage?: string;
  owner?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  subtasks?: SubTask[];
  expanded?: boolean;
  deadline?: string;
  stage?: string;
  owner?: string;
}

interface TestingLink {
  id: string;
  label: string;
  url: string;
}

interface ProjectData {
  id: string;
  customer_name: string;
  customer_logo?: string;
  service_type?: string | null;
  service_description?: string;
  status: "ongoing" | "completed" | "demo";
  priority: string;
  checklist_items: ChecklistItem[];
  start_date?: string;
  deadline?: string;
  demo_date?: string;
  demo_delivered?: boolean;
  testing_links?: TestingLink[];
  project_manager?: string;
  secondary_project_manager?: string;
  created_at?: string;
  completed_at?: string;
}

const stageLabelMap: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  client_review: { label: "Client Review", color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  internal_revision: { label: "Revision", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  blocked: { label: "Blocked", color: "bg-red-500/15 text-red-600 dark:text-red-400" },
  done: { label: "Done", color: "bg-green-500/15 text-green-600 dark:text-green-400" },
};

const getDeadlineInfo = (deadline?: string) => {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "bg-red-600 text-white" };
  if (diffDays === 0) return { label: "Due today", color: "bg-red-500 text-white" };
  if (diffDays <= 3) return { label: `${diffDays}d left`, color: "bg-red-500/20 text-red-500 border border-red-500/30" };
  if (diffDays <= 7) return { label: `${diffDays}d left`, color: "bg-orange-500/20 text-orange-500 border border-orange-500/30" };
  if (diffDays <= 14) return { label: `${diffDays}d left`, color: "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" };
  return { label: `${diffDays}d left`, color: "bg-green-500/20 text-green-500 border border-green-500/30" };
};

function CodeEntryView() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter your project code");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc("get_project_by_share_code", { code: trimmed });
      if (rpcError || !data) {
        setError("Invalid project code. Please check and try again.");
        setLoading(false);
        return;
      }
      navigate(`/projectupdate/${trimmed}`);
    } catch {
      setError("Invalid project code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 p-2 mb-4">
            <img src="/lovable-uploads/7103ec49-9766-44ba-a938-b218c15a85e7.png" alt="DOO" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Project Update</h1>
          <p className="text-muted-foreground">
            Enter your project code to view your project progress
          </p>
        </div>

          <Card className="border-2">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Project Code</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={code}
                      onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
                      placeholder="e.g. A3X9K2M7"
                      className="pl-10 text-center text-lg tracking-widest font-mono h-12"
                      maxLength={8}
                      autoFocus
                    />
                  </div>
                  {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading || !code.trim()}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                  ) : (
                    "View Project"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your project code was provided by your project manager.
          <br />
          Contact your team if you don't have one.
        </p>
      </div>
    </div>
  );
}

function ProjectDetailView({ code }: { code: string }) {
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error: rpcError } = await supabase.rpc("get_project_by_share_code", { code: code.toUpperCase() });
        if (rpcError || !data) {
          setError("Project not found. Please check your code and try again.");
          return;
        }
        const p = data as any;
        setProject({
          id: p.id,
          customer_name: p.customer_name,
          customer_logo: p.customer_logo || undefined,
          service_type: p.service_type,
          service_description: p.service_description || "",
          status: p.status as "ongoing" | "completed" | "demo",
          priority: p.priority || "moderate",
          checklist_items: (p.checklist_items as ChecklistItem[]) || [],
          start_date: p.start_date || undefined,
          deadline: p.deadline || undefined,
          demo_date: p.demo_date || undefined,
          demo_delivered: p.demo_delivered || false,
          testing_links: (p.testing_links as TestingLink[]) || [],
          project_manager: p.project_manager || undefined,
          secondary_project_manager: p.secondary_project_manager || undefined,
          created_at: p.created_at || undefined,
          completed_at: p.completed_at || undefined,
        });
      } catch {
        setError("Failed to load project. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [code]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const getProgress = (items: ChecklistItem[]) => {
    if (items.length === 0) return 0;
    const done = items.filter((i) => i.checked).length;
    return Math.round((done / items.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-[200px] mb-4" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2">
          <CardContent className="pt-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 p-2 mb-4">
              <img src="/lovable-uploads/7103ec49-9766-44ba-a938-b218c15a85e7.png" alt="DOO" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || "The project code is invalid or has expired."}</p>
            <Button onClick={() => navigate("/projectupdate")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Try Another Code
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = getProgress(project.checklist_items);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/projectupdate")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Badge variant="outline" className="text-xs font-mono tracking-wider">
              {code}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center p-1">
              <img src="/lovable-uploads/7103ec49-9766-44ba-a938-b218c15a85e7.png" alt="DOO" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">DOO</span>
          </div>
        </div>

        {/* Project Header Card */}
        <Card className="border-2 mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarImage src={project.customer_logo} alt={project.customer_name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-500/10 text-blue-600 text-lg font-semibold">
                  {project.customer_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl">{project.customer_name}</CardTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge
                    variant={
                      project.status === "completed"
                        ? "default"
                        : project.status === "demo"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {project.status === "ongoing" && "Ongoing"}
                    {project.status === "completed" && "Completed"}
                    {project.status === "demo" && "Demo"}
                  </Badge>
                  {project.status === "demo" && project.demo_delivered && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Demo Delivered
                    </Badge>
                  )}
                  {project.service_type && (
                    <Badge variant="secondary">
                      {project.service_type.charAt(0).toUpperCase() + project.service_type.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30 flex-wrap text-sm text-muted-foreground">
              {project.project_manager && (
                <span>Lead PM: <span className="text-foreground font-medium">{project.project_manager}</span></span>
              )}
              {project.secondary_project_manager && (
                <span>Secondary PM: <span className="text-foreground font-medium">{project.secondary_project_manager}</span></span>
              )}
              {project.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Started {new Date(project.start_date).toLocaleDateString()}
                </span>
              )}
              {project.deadline && (
                <Badge className={`${getDeadlineInfo(project.deadline)?.color}`}>
                  <Clock className="h-3 w-3 mr-1" />
                  {getDeadlineInfo(project.deadline)?.label}
                </Badge>
              )}
              {project.demo_date && (
                <span className="flex items-center gap-1">
                  <Play className="h-3.5 w-3.5" />
                  Demo: {new Date(project.demo_date).toLocaleDateString()}
                </span>
              )}
              {project.completed_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Completed {new Date(project.completed_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Progress */}
        <Card className="border-2 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">
                {project.checklist_items.filter((i) => i.checked).length}/
                {project.checklist_items.length} phases complete ({progress}%)
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Service Description */}
        {project.service_description && (
          <Card className="border-2 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Service Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.service_description}</p>
            </CardContent>
          </Card>
        )}

        {/* Phases */}
        <Card className="border-2 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Phases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.checklist_items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No phases defined yet</p>
            ) : (
              project.checklist_items.map((phase) => {
                const isExpanded = expandedPhases.has(phase.id);
                const subtasksDone = phase.subtasks?.filter((s) => s.checked).length || 0;
                const subtasksTotal = phase.subtasks?.length || 0;
                const stageInfo = stageLabelMap[phase.stage || "not_started"] || stageLabelMap.not_started;
                return (
                  <div key={phase.id} className="border border-border/30 rounded-md bg-background/50">
                    <div
                      className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => togglePhase(phase.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      {phase.checked ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      )}
                      <span className={`text-sm font-medium flex-1 ${phase.checked ? "line-through text-muted-foreground" : ""}`}>
                        {phase.label}
                      </span>
                      <Badge className={`text-[10px] h-5 px-1.5 ${stageInfo.color}`}>
                        {stageInfo.label}
                      </Badge>
                      {subtasksTotal > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {subtasksDone}/{subtasksTotal}
                        </span>
                      )}
                    </div>
                    {isExpanded && phase.subtasks && phase.subtasks.length > 0 && (
                      <div className="border-t border-border/20 px-3 py-2 space-y-1.5 bg-muted/20">
                        {phase.subtasks.map((sub) => {
                          const subStage = stageLabelMap[sub.stage || "not_started"] || stageLabelMap.not_started;
                          return (
                            <div key={sub.id} className="flex items-center gap-2 py-1 px-2">
                              {sub.checked ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              ) : (
                                <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                              )}
                              <span className={`text-xs flex-1 ${sub.checked ? "line-through text-muted-foreground" : ""}`}>
                                {sub.label}
                              </span>
                              <Badge className={`text-[9px] h-4 px-1 ${subStage.color}`}>
                                {subStage.label}
                              </Badge>
                              {sub.deadline && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(sub.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Testing Links */}
        {project.testing_links && project.testing_links.length > 0 && (
          <Card className="border-2 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Testing Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {project.testing_links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline bg-muted/30 rounded-md px-3 py-2"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {link.label || link.url}
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-xs text-muted-foreground">
          <p>This is a read-only project update view.</p>
          <p className="mt-1">Last refreshed: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProjectUpdate() {
  const { code } = useParams<{ code?: string }>();

  if (code) {
    return <ProjectDetailView code={code} />;
  }
  return <CodeEntryView />;
}
