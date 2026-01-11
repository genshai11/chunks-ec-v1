import { motion } from 'framer-motion';
import { Flame, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailyStreak } from '@/hooks/useStreak';
import { formatDistanceToNow } from 'date-fns';

interface StreakDisplayProps {
  streak: DailyStreak | null;
  compact?: boolean;
  className?: string;
}

export const StreakDisplay = ({ streak, compact = false, className }: StreakDisplayProps) => {
  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const lastPractice = streak?.last_practice_date;

  const isActiveToday = lastPractice === new Date().toISOString().split('T')[0];

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          isActiveToday ? "bg-orange-500/10 text-orange-400" : "bg-muted text-muted-foreground",
          className
        )}
      >
        <Flame 
          size={18} 
          className={cn(
            isActiveToday && "animate-pulse"
          )}
        />
        <span className="font-bold">{currentStreak}</span>
        <span className="text-sm">day{currentStreak !== 1 ? 's' : ''}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-2xl border bg-gradient-to-br",
        isActiveToday 
          ? "from-orange-500/10 to-red-500/10 border-orange-500/30" 
          : "from-muted/30 to-muted/10 border-border",
        className
      )}
    >
      {/* Main Streak */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            animate={isActiveToday ? {
              scale: [1, 1.1, 1],
            } : {}}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center",
              isActiveToday 
                ? "bg-gradient-to-br from-orange-500 to-red-500" 
                : "bg-muted"
            )}
          >
            <Flame 
              size={28} 
              className={isActiveToday ? "text-white" : "text-muted-foreground"} 
            />
          </motion.div>
          <div>
            <motion.div 
              className={cn(
                "text-3xl font-bold",
                isActiveToday ? "text-orange-400" : "text-foreground"
              )}
              key={currentStreak}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
            >
              {currentStreak}
            </motion.div>
            <div className="text-sm text-muted-foreground">
              Day Streak
            </div>
          </div>
        </div>

        {!isActiveToday && currentStreak > 0 && (
          <div className="text-right">
            <div className="text-xs text-amber-400 font-medium">
              ⚠️ Practice today to keep your streak!
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">{longestStreak} days</div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">
              {lastPractice 
                ? formatDistanceToNow(new Date(lastPractice), { addSuffix: true })
                : 'Never'
              }
            </div>
            <div className="text-xs text-muted-foreground">Last Practice</div>
          </div>
        </div>
      </div>

      {/* Streak milestones */}
      {currentStreak > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground mb-2">Next milestone</div>
          <div className="flex gap-1">
            {[7, 14, 30, 60, 100].map((milestone) => {
              const isAchieved = currentStreak >= milestone;
              const isNext = !isAchieved && currentStreak < milestone && 
                (currentStreak > (milestone === 7 ? 0 : [7, 14, 30, 60][([7, 14, 30, 60, 100].indexOf(milestone) - 1)] || 0));
              
              return (
                <div
                  key={milestone}
                  className={cn(
                    "flex-1 h-2 rounded-full transition-all",
                    isAchieved 
                      ? "bg-orange-500" 
                      : isNext 
                        ? "bg-orange-500/30" 
                        : "bg-muted"
                  )}
                  title={`${milestone} days`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>7d</span>
            <span>14d</span>
            <span>30d</span>
            <span>60d</span>
            <span>100d</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};
