import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Calendar, 
  Trophy,
  Target,
  Coins,
  History,
  Edit2,
  Camera,
  Loader2,
  Save,
  Award,
  Filter,
  X,
  BookOpen,
  TrendingUp,
  CalendarDays
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { PracticeHeatmap } from "@/components/ui/PracticeHeatmap";
import { BadgeCard } from "@/components/ui/BadgeCard";
import { Sidebar } from "@/components/layout/Sidebar";
import { useProfile, useWallet } from "@/hooks/useUserData";
import { useUserStats, usePracticeHistory } from "@/hooks/usePractice";
import { useCoinTransactions } from "@/hooks/useCoinWallet";
import { useUserRank } from "@/hooks/useLeaderboard";
import { useStreak } from "@/hooks/useStreak";
import { useAllBadges, useUserBadges } from "@/hooks/useBadges";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, format, startOfWeek, endOfWeek, isWithinInterval, subDays, startOfDay } from "date-fns";

const Profile = () => {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: wallet } = useWallet();
  const { data: userStats } = useUserStats();
  const { data: practiceHistory } = usePracticeHistory();
  const { data: transactions } = useCoinTransactions();
  const { data: userRank } = useUserRank(user?.id);
  const { data: streak } = useStreak();
  const { data: allBadges } = useAllBadges();
  const { data: userBadges } = useUserBadges();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [isSaving, setIsSaving] = useState(false);

  // Filter states
  const [historyFilter, setHistoryFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [coinFilter, setCoinFilter] = useState<'all' | 'earned' | 'spent' | 'bonus' | 'penalty'>('all');

  const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id));

  // Get unique lessons from practice history
  const uniqueLessons = useMemo(() => {
    if (!practiceHistory) return [];
    const lessonMap = new Map();
    practiceHistory.forEach(h => {
      if (h.lessons && !lessonMap.has(h.lesson_id)) {
        lessonMap.set(h.lesson_id, h.lessons.lesson_name);
      }
    });
    return Array.from(lessonMap, ([id, name]) => ({ id, name }));
  }, [practiceHistory]);

  // Filter practice history
  const filteredHistory = useMemo(() => {
    if (!practiceHistory) return [];
    
    let filtered = [...practiceHistory];
    
    // Filter by date
    const now = new Date();
    if (historyFilter === 'today') {
      const startOfToday = startOfDay(now);
      filtered = filtered.filter(h => new Date(h.practiced_at) >= startOfToday);
    } else if (historyFilter === 'week') {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      filtered = filtered.filter(h => 
        isWithinInterval(new Date(h.practiced_at), { start: weekStart, end: weekEnd })
      );
    } else if (historyFilter === 'month') {
      const monthAgo = subDays(now, 30);
      filtered = filtered.filter(h => new Date(h.practiced_at) >= monthAgo);
    }
    
    // Filter by lesson
    if (selectedLesson) {
      filtered = filtered.filter(h => h.lesson_id === selectedLesson);
    }
    
    return filtered;
  }, [practiceHistory, historyFilter, selectedLesson]);

  // Filter coin transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    if (coinFilter === 'all') return transactions;
    if (coinFilter === 'earned') {
      return transactions.filter(t => 
        t.transaction_type === 'practice' || 
        (t.amount > 0 && !['bonus', 'penalty', 'purchase'].includes(t.transaction_type))
      );
    }
    if (coinFilter === 'spent') {
      return transactions.filter(t => 
        t.transaction_type === 'purchase' || 
        t.amount < 0
      );
    }
    if (coinFilter === 'bonus') {
      return transactions.filter(t => t.transaction_type === 'bonus');
    }
    if (coinFilter === 'penalty') {
      return transactions.filter(t => t.transaction_type === 'penalty' || (t.amount < 0 && t.transaction_type !== 'purchase'));
    }
    
    return transactions;
  }, [transactions, coinFilter]);

  // Get English content from practice history item
  const getEnglishContent = (history: any) => {
    if (!history.lessons || !history.lessons.categories) return null;
    const categoryItems = history.lessons.categories[history.category];
    if (!categoryItems || !categoryItems[history.item_index]) return null;
    return categoryItems[history.item_index].English;
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", user.id);

      if (error) throw error;
      
      toast.success("Profile updated successfully");
      setIsEditing(false);
      refetchProfile();
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Profile</h1>
            <p className="text-muted-foreground">Manage your account and view your progress</p>
          </motion.div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="mb-6">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {/* Avatar */}
                  <div className="relative mx-auto sm:mx-0">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-3xl bg-primary/20">
                        {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center sm:text-left">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label>Display Name</Label>
                          <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your display name"
                          />
                        </div>
                        <div className="flex gap-2 justify-center sm:justify-start">
                          <Button 
                            onClick={handleSaveProfile} 
                            disabled={isSaving}
                            className="gap-2"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-2 justify-center sm:justify-start">
                          <h2 className="text-2xl font-semibold">{profile?.display_name || "Learner"}</h2>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8"
                            onClick={() => {
                              setDisplayName(profile?.display_name || "");
                              setIsEditing(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-2 justify-center sm:justify-start">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">{profile?.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground justify-center sm:justify-start">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">Joined {profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "Recently"}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Balance */}
                  <div className="text-center sm:text-right mx-auto sm:mx-0">
                    <CoinBadge amount={wallet?.balance || 0} size="lg" />
                    <div className="text-sm text-muted-foreground mt-2">
                      Total earned: {wallet?.total_earned || 0} C
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Practice Heatmap (GitHub-style) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <PracticeHeatmap practiceHistory={practiceHistory} />
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="py-4 text-center">
                <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{userRank || "--"}</div>
                <div className="text-sm text-muted-foreground">Global Rank</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.avgScore || 0}%</div>
                <div className="text-sm text-muted-foreground">Avg Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userBadges?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Badges</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <History className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{userStats?.totalPractice || 0}</div>
                <div className="text-sm text-muted-foreground">Practices</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="badges">
            <TabsList className="mb-4 w-full sm:w-auto grid grid-cols-3 sm:flex">
              <TabsTrigger value="badges">Badges</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="coins">Coins</TabsTrigger>
            </TabsList>

            <TabsContent value="badges">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Badge Collection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Earned Badges */}
                  {userBadges && userBadges.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">
                        Earned ({userBadges.length})
                      </h3>
                      <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-3">
                        {userBadges.map((ub) => (
                          <BadgeCard
                            key={ub.id}
                            badge={ub.badge!}
                            earned={true}
                            earnedAt={ub.earned_at}
                            size="sm"
                            showDetails={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Badges */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      All Badges ({allBadges?.length || 0})
                    </h3>
                    <div className="space-y-3">
                      {allBadges?.map((badge) => {
                        const userBadge = userBadges?.find(ub => ub.badge_id === badge.id);
                        return (
                          <BadgeCard
                            key={badge.id}
                            badge={badge}
                            earned={!!userBadge}
                            earnedAt={userBadge?.earned_at}
                          />
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg">Practice History</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <History className="w-4 h-4" />
                      {filteredHistory.length} session{filteredHistory.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="mb-6 space-y-4">
                    {/* Date Filter */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Time Period:</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant={historyFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setHistoryFilter('all')}
                        >
                          All Time
                        </Button>
                        <Button
                          variant={historyFilter === 'today' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setHistoryFilter('today')}
                        >
                          Today
                        </Button>
                        <Button
                          variant={historyFilter === 'week' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setHistoryFilter('week')}
                        >
                          This Week
                        </Button>
                        <Button
                          variant={historyFilter === 'month' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setHistoryFilter('month')}
                        >
                          Last 30 Days
                        </Button>
                      </div>
                    </div>

                    {/* Lesson Filter */}
                    {uniqueLessons.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Lesson:</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant={selectedLesson === null ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedLesson(null)}
                          >
                            All Lessons
                          </Button>
                          {uniqueLessons.map(lesson => (
                            <Button
                              key={lesson.id}
                              variant={selectedLesson === lesson.id ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedLesson(lesson.id)}
                            >
                              {lesson.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Filters Display */}
                    {(historyFilter !== 'all' || selectedLesson !== null) && (
                      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <Filter className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Active Filters:</span>
                        {historyFilter !== 'all' && (
                          <span className="px-2 py-1 text-xs bg-primary/10 rounded-md">
                            {historyFilter === 'today' ? 'Today' : historyFilter === 'week' ? 'This Week' : 'Last 30 Days'}
                          </span>
                        )}
                        {selectedLesson !== null && (
                          <span className="px-2 py-1 text-xs bg-primary/10 rounded-md">
                            {uniqueLessons.find(l => l.id === selectedLesson)?.name}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setHistoryFilter('all');
                            setSelectedLesson(null);
                          }}
                          className="ml-auto h-7"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* History List */}
                  {filteredHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {practiceHistory?.length === 0 
                        ? "No practice history yet. Start practicing to see your progress!"
                        : "No practice sessions found with the selected filters."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredHistory.slice(0, 50).map((history) => {
                        const englishContent = getEnglishContent(history);
                        return (
                          <div 
                            key={history.id}
                            className="p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex-1">
                                {/* Lesson Name */}
                                {history.lessons && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-medium text-primary">
                                      {history.lessons.lesson_name}
                                    </span>
                                  </div>
                                )}
                                
                                {/* English Content */}
                                {englishContent && (
                                  <div className="font-medium text-base mb-1">
                                    "{englishContent}"
                                  </div>
                                )}
                                
                                {/* Category & Time */}
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="px-2 py-0.5 bg-secondary rounded-md text-xs">
                                    {history.category}
                                  </span>
                                  <span className="text-xs">
                                    {formatDistanceToNow(new Date(history.practiced_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Score & Coins */}
                              <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                                <div className="text-center">
                                  <div className={`text-2xl font-bold ${
                                    history.score >= 80 ? "text-green-500" : 
                                    history.score >= 70 ? "text-blue-500" :
                                    history.score >= 50 ? "text-yellow-500" : "text-red-500"
                                  }`}>
                                    {history.score}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Score</div>
                                </div>
                                <div className="text-center">
                                  <div className={`text-lg font-bold ${
                                    history.coins_earned >= 0 ? "text-green-500" : "text-red-500"
                                  }`}>
                                    {history.coins_earned >= 0 ? "+" : ""}{history.coins_earned}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Coins</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coins">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Coins className="w-5 h-5" />
                      Coin Transaction History
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Transaction Type Filter */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Transaction Type:</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant={coinFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCoinFilter('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={coinFilter === 'earned' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCoinFilter('earned')}
                        className={coinFilter === 'earned' ? '' : 'border-green-500/50'}
                      >
                        Earned
                      </Button>
                      <Button
                        variant={coinFilter === 'bonus' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCoinFilter('bonus')}
                        className={coinFilter === 'bonus' ? '' : 'border-yellow-500/50'}
                      >
                        Bonuses
                      </Button>
                      <Button
                        variant={coinFilter === 'penalty' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCoinFilter('penalty')}
                        className={coinFilter === 'penalty' ? '' : 'border-red-500/50'}
                      >
                        Penalties
                      </Button>
                      <Button
                        variant={coinFilter === 'spent' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCoinFilter('spent')}
                        className={coinFilter === 'spent' ? '' : 'border-orange-500/50'}
                      >
                        Spent
                      </Button>
                    </div>
                  </div>

                  {/* Transaction List */}
                  {filteredTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {transactions?.length === 0 
                        ? "No transactions yet."
                        : "No transactions found with the selected filter."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredTransactions.map((tx) => (
                        <div 
                          key={tx.id}
                          className="p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                  tx.transaction_type === 'practice' ? 'bg-green-500/10 text-green-600 border border-green-500/30' :
                                  tx.transaction_type === 'bonus' ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/30' :
                                  tx.transaction_type === 'penalty' ? 'bg-red-500/10 text-red-600 border border-red-500/30' :
                                  tx.transaction_type === 'purchase' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/30' :
                                  'bg-secondary'
                                }`}>
                                  {tx.transaction_type.replace(/_/g, " ").toUpperCase()}
                                </span>
                              </div>
                              <div className="font-medium text-sm mb-1">
                                {tx.description || 'No description'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </div>
                            </div>
                            <div className={`text-2xl font-bold ${
                              tx.amount >= 0 ? "text-green-500" : "text-red-500"
                            }`}>
                              {tx.amount >= 0 ? "+" : ""}{tx.amount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Profile;
