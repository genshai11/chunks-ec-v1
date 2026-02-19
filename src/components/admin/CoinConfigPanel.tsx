import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCoinConfig, useUpdateCoinConfig, CoinConfig } from '@/hooks/useCoinWallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  Coins,
  TrendingUp,
  TrendingDown,
  Clock,
  Save
} from 'lucide-react';

const CoinConfigPanel: React.FC = () => {
  const { data: config, isLoading } = useCoinConfig();
  const updateConfig = useUpdateCoinConfig();
  
  const [localConfig, setLocalConfig] = useState<Partial<CoinConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleChange = (key: keyof CoinConfig, value: number) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateConfig.mutateAsync(localConfig);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold">Coin Economy</h2>
          <p className="text-muted-foreground">Configure reward and penalty settings</p>
        </div>
        
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || updateConfig.isPending}
          className="gap-2"
        >
          {updateConfig.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-success/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <CardTitle className="text-lg">Rewards</CardTitle>
              </div>
              <CardDescription>Coins earned for good performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Reward</label>
                  <Input
                    type="number"
                    value={localConfig.reward_min || 0}
                    onChange={(e) => handleChange('reward_min', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Reward</label>
                  <Input
                    type="number"
                    value={localConfig.reward_max || 0}
                    onChange={(e) => handleChange('reward_max', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Score Threshold</label>
                <Input
                  type="number"
                  value={localConfig.reward_score_threshold || 0}
                  onChange={(e) => handleChange('reward_score_threshold', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum score required to earn coins
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Penalties */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-destructive/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </div>
                <CardTitle className="text-lg">Penalties</CardTitle>
              </div>
              <CardDescription>Coins deducted for poor performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Penalty</label>
                  <Input
                    type="number"
                    value={localConfig.penalty_min || 0}
                    onChange={(e) => handleChange('penalty_min', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Penalty</label>
                  <Input
                    type="number"
                    value={localConfig.penalty_max || 0}
                    onChange={(e) => handleChange('penalty_max', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Penalty Threshold</label>
                <Input
                  type="number"
                  value={localConfig.penalty_score_threshold || 0}
                  onChange={(e) => handleChange('penalty_score_threshold', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Below this score, coins are deducted
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Deadline Bonuses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-lg">Deadline Rewards (Dynamic)</CardTitle>
              </div>
              <CardDescription>Bonus/penalty based on completion % and deadline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Early Bonus</label>
                  <Input
                    type="number"
                    value={localConfig.deadline_early_bonus_max || 50}
                    onChange={(e) => handleChange('deadline_early_bonus_max', parseInt(e.target.value) || 50)}
                  />
                  <p className="text-xs text-muted-foreground">For very early completion</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Early Bonus Days</label>
                  <Input
                    type="number"
                    value={localConfig.deadline_early_bonus_days || 3}
                    onChange={(e) => handleChange('deadline_early_bonus_days', parseInt(e.target.value) || 3)}
                  />
                  <p className="text-xs text-muted-foreground">Days before = max bonus</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">On-Time Bonus</label>
                  <Input
                    type="number"
                    value={localConfig.deadline_on_time_bonus || 20}
                    onChange={(e) => handleChange('deadline_on_time_bonus', parseInt(e.target.value) || 20)}
                  />
                  <p className="text-xs text-muted-foreground">Complete on deadline day</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Penalty</label>
                  <Input
                    type="number"
                    value={localConfig.deadline_penalty_max || 100}
                    onChange={(e) => handleChange('deadline_penalty_max', parseInt(e.target.value) || 100)}
                  />
                  <p className="text-xs text-muted-foreground">For very late + low %</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grace Days</label>
                  <Input
                    type="number"
                    value={localConfig.deadline_penalty_grace_days || 0}
                    onChange={(e) => handleChange('deadline_penalty_grace_days', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Days after before penalty</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Penalty Scale Days</label>
                  <Input
                    type="number"
                    value={localConfig.deadline_penalty_scale_days || 7}
                    onChange={(e) => handleChange('deadline_penalty_scale_days', parseInt(e.target.value) || 7)}
                  />
                  <p className="text-xs text-muted-foreground">Days to reach max penalty</p>
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold mb-3">Completion Requirements</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min % for Bonus</label>
                    <Input
                      type="number"
                      value={localConfig.min_completion_for_bonus || 80}
                      onChange={(e) => handleChange('min_completion_for_bonus', parseInt(e.target.value) || 80)}
                    />
                    <p className="text-xs text-muted-foreground">Must complete this % to get bonus</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Penalty Threshold %</label>
                    <Input
                      type="number"
                      value={localConfig.penalty_completion_threshold || 50}
                      onChange={(e) => handleChange('penalty_completion_threshold', parseInt(e.target.value) || 50)}
                    />
                    <p className="text-xs text-muted-foreground">Below this % = full penalty</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Lesson Milestones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-yellow-500/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-yellow-500" />
                </div>
                <CardTitle className="text-lg">Lesson Milestones</CardTitle>
              </div>
              <CardDescription>Bonus for completion progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">25% Bonus</label>
                  <Input
                    type="number"
                    value={localConfig.milestone_25_bonus || 0}
                    onChange={(e) => handleChange('milestone_25_bonus', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">50% Bonus</label>
                  <Input
                    type="number"
                    value={localConfig.milestone_50_bonus || 0}
                    onChange={(e) => handleChange('milestone_50_bonus', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">75% Bonus</label>
                  <Input
                    type="number"
                    value={localConfig.milestone_75_bonus || 0}
                    onChange={(e) => handleChange('milestone_75_bonus', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">100% Bonus 🏆</label>
                  <Input
                    type="number"
                    value={localConfig.milestone_100_bonus || 0}
                    onChange={(e) => handleChange('milestone_100_bonus', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Streak Bonuses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-orange-500/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                </div>
                <CardTitle className="text-lg">Streak Bonuses</CardTitle>
              </div>
              <CardDescription>Consecutive high score rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Streak Threshold</label>
                <Input
                  type="number"
                  value={localConfig.streak_bonus_threshold || 3}
                  onChange={(e) => handleChange('streak_bonus_threshold', parseInt(e.target.value) || 3)}
                />
                <p className="text-xs text-muted-foreground">
                  Consecutive high scores needed
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Score for Streak</label>
                <Input
                  type="number"
                  value={localConfig.streak_bonus_min_score || 80}
                  onChange={(e) => handleChange('streak_bonus_min_score', parseInt(e.target.value) || 80)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Coins per Streak</label>
                <Input
                  type="number"
                  value={localConfig.streak_bonus_coins || 5}
                  onChange={(e) => handleChange('streak_bonus_coins', parseInt(e.target.value) || 5)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* First Practice & Withdrawal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-accent/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-accent" />
                </div>
                <CardTitle className="text-lg">Other Settings</CardTitle>
              </div>
              <CardDescription>First practice & withdrawal rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Practice Bonus</label>
                <Input
                  type="number"
                  value={localConfig.first_practice_bonus || 2}
                  onChange={(e) => handleChange('first_practice_bonus', parseInt(e.target.value) || 2)}
                />
                <p className="text-xs text-muted-foreground">
                  Bonus for trying new items
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lessons Required</label>
                <Input
                  type="number"
                  value={localConfig.lessons_required_for_withdraw || 0}
                  onChange={(e) => handleChange('lessons_required_for_withdraw', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Average Score (%)</label>
                <Input
                  type="number"
                  value={localConfig.min_avg_score_for_withdraw || 0}
                  onChange={(e) => handleChange('min_avg_score_for_withdraw', parseInt(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CoinConfigPanel;
