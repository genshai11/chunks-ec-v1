import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Award, Crown, Loader2, ArrowUp, ArrowDown, Sparkles, Radio, RefreshCw, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { useRealtimeLeaderboard } from "@/hooks/useRealtimeLeaderboard";
import { useStreakLeaderboard } from "@/hooks/useStreak";
import { useCourseLeaderboard, useClassLeaderboard, useUserEnrolledClass } from "@/hooks/useCourseLeaderboard";
import { useAuth } from "@/context/AuthContext";

const Leaderboard = () => {
  const { user, isAdmin } = useAuth();
  const { leaderboard: globalLeaderboard, isLoading: globalLoading, isLive, userRank: globalUserRank, forceRefresh } = useRealtimeLeaderboard(50);
  const { data: streakLeaderboard } = useStreakLeaderboard(20);
  const { data: enrollment, isLoading: enrollmentLoading } = useUserEnrolledClass();
  
  // Get course/class specific leaderboard for learners
  const courseId = enrollment?.course_id;
  const classId = enrollment?.class_id;
  
  const { data: courseLeaderboard, isLoading: courseLoading } = useCourseLeaderboard(courseId, 50);
  const { data: classLeaderboard, isLoading: classLoading } = useClassLeaderboard(classId, 50);
  
  const [highlightedUser, setHighlightedUser] = useState<string | null>(null);

  // Use class leaderboard if enrolled in a class, otherwise course leaderboard, otherwise global
  const activeLeaderboard = classId && classLeaderboard?.length 
    ? classLeaderboard 
    : courseId && courseLeaderboard?.length 
      ? courseLeaderboard 
      : globalLeaderboard;
  
  const isLoading = globalLoading || enrollmentLoading || courseLoading || classLoading;
  
  // Calculate user's rank in active leaderboard
  const userRank = activeLeaderboard?.find(e => e.userId === user?.id)?.rank || null;

  // Get context label
  const contextLabel = classId && enrollment?.course_classes 
    ? (enrollment.course_classes as { class_name?: string } | null)?.class_name || 'Your Class'
    : courseId && enrollment?.courses 
      ? (enrollment.courses as { name?: string } | null)?.name || 'Your Course'
      : 'Global';

  // Highlight users who just updated
  useEffect(() => {
    const recentChange = globalLeaderboard.find(e => e.rankChange === 'up' || e.rankChange === 'new');
    if (recentChange) {
      setHighlightedUser(recentChange.userId);
      const timer = setTimeout(() => setHighlightedUser(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [globalLeaderboard]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankStyle = (rank: number, isHighlighted: boolean) => {
    const base = isHighlighted ? "ring-2 ring-primary animate-pulse" : "";
    switch (rank) {
      case 1:
        return `bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/30 ${base}`;
      case 2:
        return `bg-gradient-to-r from-gray-400/10 to-gray-500/5 border-gray-400/30 ${base}`;
      case 3:
        return `bg-gradient-to-r from-amber-600/10 to-amber-700/5 border-amber-600/30 ${base}`;
      default:
        return `bg-card border-border/50 ${base}`;
    }
  };

  const getRankChangeIndicator = (change?: 'up' | 'down' | 'same' | 'new') => {
    switch (change) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-success animate-bounce" />;
      case 'down':
        return <ArrowDown className="w-4 h-4 text-destructive" />;
      case 'new':
        return <Sparkles className="w-4 h-4 text-primary animate-pulse" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <LearnerLayout contentClassName="max-w-3xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-primary" />
                  Leaderboard
                </h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  {!isAdmin && (
                    <Badge variant="outline" className="gap-1">
                      <Users className="w-3 h-3" />
                      {contextLabel}
                    </Badge>
                  )}
                  {isLive && (
                    <Badge variant="secondary" className="gap-1 animate-pulse">
                      <Radio className="w-3 h-3" />
                      Live
                    </Badge>
                  )}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={forceRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </motion.div>

          {/* Tabs for different leaderboards */}
          <Tabs defaultValue="score" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="score" className="gap-2">
                <Trophy className="w-4 h-4" />
                Total Score
              </TabsTrigger>
              <TabsTrigger value="streak" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Streaks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="score" className="space-y-4">
              {/* User's Rank */}
              {userRank && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">#{userRank}</span>
                          </div>
                          <div>
                            <p className="font-medium">Your Rank in {contextLabel}</p>
                            <p className="text-sm text-muted-foreground">Keep practicing to climb higher!</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Leaderboard List */}
              <div className="space-y-3">
                {!activeLeaderboard || activeLeaderboard.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {courseId ? 'No classmates have practiced yet. Be the first!' : 'No rankings yet. Be the first to practice and earn points!'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {activeLeaderboard.map((entry, index) => (
                      <motion.div
                        key={entry.userId}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <Card className={`transition-all duration-300 ${getRankStyle(entry.rank, highlightedUser === entry.userId)} ${
                          entry.userId === user?.id ? "ring-2 ring-primary" : ""
                        }`}>
                          <CardContent className="py-4">
                            <div className="flex items-center gap-4">
                              {/* Rank */}
                              <div className="w-10 flex items-center justify-center relative">
                                {getRankIcon(entry.rank)}
                                {'rankChange' in entry && entry.rankChange && entry.rankChange !== 'same' && (
                                  <div className="absolute -top-1 -right-1">
                                    {getRankChangeIndicator(entry.rankChange as ('up' | 'down' | 'same' | 'new' | undefined))}
                                  </div>
                                )}
                              </div>

                              {/* Avatar */}
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={entry.avatarUrl || undefined} />
                                <AvatarFallback className="bg-secondary text-lg">
                                  {entry.displayName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>

                              {/* Name & Stats */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">
                                  {entry.displayName}
                                  {entry.userId === user?.id && (
                                    <span className="ml-2 text-xs text-primary">(You)</span>
                                  )}
                                  {'rankChange' in entry && entry.rankChange === 'new' && (
                                    <Badge variant="secondary" className="ml-2 text-xs">New</Badge>
                                  )}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{entry.practiceCount} practices</span>
                                  <span>Avg: {entry.avgScore}%</span>
                                </div>
                              </div>

                              {/* Score */}
                              <div className="text-right">
                                <motion.div 
                                  key={entry.totalScore}
                                  initial={{ scale: 'rankChange' in entry && entry.rankChange === 'up' ? 1.2 : 1 }}
                                  animate={{ scale: 1 }}
                                  className="text-xl font-bold text-primary"
                                >
                                  {entry.totalScore.toLocaleString()}
                                </motion.div>
                                <div className="text-sm text-muted-foreground">points</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </TabsContent>

            <TabsContent value="streak" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    Streak Champions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!streakLeaderboard || streakLeaderboard.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No streak data yet. Start practicing daily!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {streakLeaderboard.map((entry, index) => (
                        <motion.div
                          key={entry.userId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex items-center gap-4 p-3 rounded-xl ${
                            entry.userId === user?.id 
                              ? "bg-primary/10 border border-primary/20" 
                              : "bg-secondary/30"
                          }`}
                        >
                          <div className="w-8 flex justify-center">
                            {getRankIcon(entry.rank)}
                          </div>
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={entry.avatarUrl || undefined} />
                            <AvatarFallback className="bg-secondary">
                              {entry.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{entry.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              Best: {entry.longestStreak} days
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-orange-500 flex items-center gap-1">
                              <Sparkles className="w-4 h-4" /> {entry.currentStreak}
                            </div>
                            <div className="text-xs text-muted-foreground">days</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
    </LearnerLayout>
  );
};

export default Leaderboard;

