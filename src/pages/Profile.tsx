import { useState } from "react";
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
  Award
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
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
import { formatDistanceToNow, format } from "date-fns";

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

  const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id));

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

          {/* Streak Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <StreakDisplay streak={streak || null} />
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
                  <CardTitle className="text-lg">Recent Practice Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {practiceHistory?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No practice history yet. Start practicing to see your progress!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {practiceHistory?.slice(0, 20).map((history) => (
                        <div 
                          key={history.id}
                          className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                        >
                          <div>
                            <div className="font-medium">{history.category}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(history.practiced_at), { addSuffix: true })}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`text-lg font-semibold ${
                              history.score >= 70 ? "text-green-500" : 
                              history.score >= 50 ? "text-yellow-500" : "text-red-500"
                            }`}>
                              {history.score}%
                            </div>
                            <div className={`text-sm font-medium ${
                              history.coins_earned >= 0 ? "text-green-500" : "text-red-500"
                            }`}>
                              {history.coins_earned >= 0 ? "+" : ""}{history.coins_earned} C
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coins">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    Coin Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No transactions yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transactions?.map((tx) => (
                        <div 
                          key={tx.id}
                          className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                        >
                          <div>
                            <div className="font-medium capitalize">
                              {tx.transaction_type.replace(/_/g, " ")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {tx.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${
                            tx.amount >= 0 ? "text-green-500" : "text-red-500"
                          }`}>
                            {tx.amount >= 0 ? "+" : ""}{tx.amount} C
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
