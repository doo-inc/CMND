import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Sparkles,
  Trophy,
  Rocket,
  Star,
  Zap,
  PartyPopper
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityEntry {
  id: string;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
}

interface GoalTrackerProps {
  revenueGoal?: number;
  clientGoal?: number;
}

export function GoalTracker({ 
  revenueGoal = 1000000, 
  clientGoal = 15 
}: GoalTrackerProps) {
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [completedClients, setCompletedClients] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoalData();
    fetchRecentActivity();

    // Real-time subscriptions
    const contractsChannel = supabase
      .channel('goal-contracts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => {
        fetchGoalData();
      })
      .subscribe();

    const projectsChannel = supabase
      .channel('goal-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_manager' }, () => {
        fetchGoalData();
      })
      .subscribe();

    const activityChannel = supabase
      .channel('goal-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => {
        fetchRecentActivity();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contractsChannel);
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, []);

  const fetchGoalData = async () => {
    try {
      // Fetch total revenue from active contracts
      const { data: contracts } = await supabase
        .from('contracts')
        .select('total_value, status')
        .in('status', ['active', 'signed', 'completed']);

      const totalRevenue = contracts?.reduce((sum, c) => sum + (c.total_value || 0), 0) || 0;
      setCurrentRevenue(totalRevenue);

      // Fetch completed clients from project_manager
      const { data: completedProjects, count } = await supabase
        .from('project_manager')
        .select('id', { count: 'exact' })
        .eq('status', 'completed');

      setCompletedClients(count || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching goal data:', error);
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, user_name, action, entity_type, entity_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivity((data || []) as ActivityEntry[]);
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const revenuePercentage = Math.min((currentRevenue / revenueGoal) * 100, 100);
  const clientPercentage = Math.min((completedClients / clientGoal) * 100, 100);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('complete')) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (action.toLowerCase().includes('contract')) return <DollarSign className="h-4 w-4 text-green-500" />;
    if (action.toLowerCase().includes('customer') || action.toLowerCase().includes('client')) return <Users className="h-4 w-4 text-blue-500" />;
    return <Zap className="h-4 w-4 text-purple-500" />;
  };

  const getActionColor = (action: string) => {
    if (action.toLowerCase().includes('complete')) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    if (action.toLowerCase().includes('contract')) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (action.toLowerCase().includes('customer')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
  };

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const isRevenueGoalMet = revenuePercentage >= 100;
  const isClientGoalMet = clientPercentage >= 100;

  return (
    <Card className="glass-card overflow-hidden relative">
      {/* Celebration effect when goals are met */}
      {(isRevenueGoalMet || isClientGoalMet) && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2">
            <PartyPopper className="h-6 w-6 text-yellow-500 animate-bounce" />
          </div>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Team Goals 2026
          </CardTitle>
          <Badge variant="outline" className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
            <Rocket className="h-3 w-3 mr-1" />
            Mission Active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Revenue Goal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${isRevenueGoalMet ? 'bg-green-500/20' : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20'}`}>
                <DollarSign className={`h-5 w-5 ${isRevenueGoalMet ? 'text-green-500' : 'text-green-600'}`} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Revenue Goal</p>
                <p className="text-xs text-muted-foreground">Target: {formatCurrency(revenueGoal)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                {formatCurrency(currentRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">{revenuePercentage.toFixed(1)}% achieved</p>
            </div>
          </div>
          
          <div className="relative">
            <Progress 
              value={revenuePercentage} 
              className="h-3 bg-muted"
            />
            <div 
              className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-1000 ${
                isRevenueGoalMet 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-400 animate-pulse' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}
              style={{ width: `${revenuePercentage}%` }}
            />
            {isRevenueGoalMet && (
              <div className="absolute -right-1 -top-1">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            )}
          </div>
          
          {/* Revenue milestones */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$0</span>
            <span className={revenuePercentage >= 25 ? 'text-green-500 font-medium' : ''}>$250K</span>
            <span className={revenuePercentage >= 50 ? 'text-green-500 font-medium' : ''}>$500K</span>
            <span className={revenuePercentage >= 75 ? 'text-green-500 font-medium' : ''}>$750K</span>
            <span className={revenuePercentage >= 100 ? 'text-green-500 font-medium' : ''}>$1M</span>
          </div>
        </div>

        {/* Client Goal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${isClientGoalMet ? 'bg-blue-500/20' : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20'}`}>
                <Users className={`h-5 w-5 ${isClientGoalMet ? 'text-blue-500' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Clients Served</p>
                <p className="text-xs text-muted-foreground">Target: {clientGoal} clients</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                {completedClients}/{clientGoal}
              </p>
              <p className="text-xs text-muted-foreground">{clientPercentage.toFixed(1)}% achieved</p>
            </div>
          </div>
          
          {/* Client progress as circles */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: clientGoal }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < completedClients
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-100'
                    : 'bg-muted text-muted-foreground scale-90'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Latest Contributions */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <p className="font-semibold text-sm text-foreground">Latest Contributions</p>
          </div>
          
          <div className="space-y-2 max-h-[180px] overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity yet. Be the first to contribute! 🚀
              </p>
            ) : (
              recentActivity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                      {getInitials(activity.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">
                        {activity.user_name || 'Team Member'}
                      </span>
                      <Badge variant="outline" className={`text-xs ${getActionColor(activity.action)}`}>
                        {getActionIcon(activity.action)}
                        <span className="ml-1">{activity.action}</span>
                      </Badge>
                    </div>
                    {activity.entity_name && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {activity.entity_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Motivational message */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-sm">
            {revenuePercentage < 50 && clientPercentage < 50 ? (
              <>
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Every contribution counts. Let's build momentum!</span>
              </>
            ) : revenuePercentage < 100 || clientPercentage < 100 ? (
              <>
                <Rocket className="h-4 w-4 text-purple-500" />
                <span className="text-muted-foreground">We're on fire! Keep pushing toward the goal!</span>
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-yellow-600">🎉 Goals achieved! Time to celebrate!</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

