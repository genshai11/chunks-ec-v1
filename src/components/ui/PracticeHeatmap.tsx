import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  eachDayOfInterval, 
  format, 
  subDays, 
  isSameDay,
  getDay
} from 'date-fns';

interface PracticeHeatmapProps {
  practiceHistory?: Array<{
    practiced_at: string;
    score: number;
  }>;
  className?: string;
}

interface DayData {
  date: Date;
  dateStr: string;
  count: number;
  dayOfWeek: number;
}

export const PracticeHeatmap = ({ practiceHistory, className }: PracticeHeatmapProps) => {
  // Calculate practice data for each day (last 12 weeks = ~84 days)
  const heatmapData = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, 83); // 12 weeks ago
    const days = eachDayOfInterval({ start: startDate, end: today });
    
    // Group practice history by date
    const practiceByDate = new Map<string, number>();
    
    practiceHistory?.forEach(practice => {
      const date = format(new Date(practice.practiced_at), 'yyyy-MM-dd');
      practiceByDate.set(date, (practiceByDate.get(date) || 0) + 1);
    });
    
    // Create data for each day
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const count = practiceByDate.get(dateStr) || 0;
      return {
        date: day,
        dateStr,
        count,
        dayOfWeek: getDay(day), // 0 = Sunday, 1 = Monday, etc.
      };
    });
  }, [practiceHistory]);

  // Group days by week for display
  const weeks = useMemo(() => {
    const weeksArray: DayData[][] = [];
    let currentWeek: DayData[] = [];
    
    // Fill in empty days at the start to align with Sunday
    const firstDay = heatmapData[0];
    if (firstDay) {
      for (let i = 0; i < firstDay.dayOfWeek; i++) {
        currentWeek.push({
          date: new Date(),
          dateStr: '',
          count: -1, // Mark as placeholder
          dayOfWeek: i,
        });
      }
    }
    
    heatmapData.forEach((day, index) => {
      currentWeek.push(day);
      
      // Sunday (0) or last day
      if (day.dayOfWeek === 6 || index === heatmapData.length - 1) {
        // Fill rest of week if needed
        while (currentWeek.length < 7) {
          currentWeek.push({
            date: new Date(),
            dateStr: '',
            count: -1,
            dayOfWeek: currentWeek.length,
          });
        }
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return weeksArray;
  }, [heatmapData]);

  // Get color based on practice count
  const getColor = (count: number) => {
    if (count === -1) return 'bg-transparent'; // Placeholder
    if (count === 0) return 'bg-muted/30';
    if (count === 1) return 'bg-green-500/30';
    if (count === 2) return 'bg-green-500/50';
    if (count === 3) return 'bg-green-500/70';
    if (count >= 4) return 'bg-green-500/90';
    return 'bg-muted/30';
  };

  // Get glow effect based on practice count
  const getGlow = (count: number) => {
    if (count >= 4) return 'shadow-[0_0_12px_rgba(34,197,94,0.4)]';
    if (count >= 2) return 'shadow-[0_0_6px_rgba(34,197,94,0.2)]';
    return '';
  };

  // Calculate stats
  const totalDays = heatmapData.filter(d => d.count > 0).length;
  const totalPractices = heatmapData.reduce((sum, d) => sum + d.count, 0);
  const currentStreak = useMemo(() => {
    let streak = 0;
    const sortedDays = [...heatmapData].reverse();
    
    for (const day of sortedDays) {
      if (day.count > 0) {
        streak++;
      } else if (!isSameDay(day.date, new Date())) {
        // Only break streak if it's not today (user might practice later today)
        break;
      }
    }
    
    return streak;
  }, [heatmapData]);

  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; weekIndex: number }> = [];
    let lastMonth = '';
    
    weeks.forEach((week, index) => {
      const firstValidDay = week.find(d => d.count !== -1);
      if (firstValidDay) {
        const month = format(firstValidDay.date, 'MMM');
        if (month !== lastMonth) {
          labels.push({ month, weekIndex: index });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  }, [weeks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-2xl border bg-gradient-to-br from-background to-muted/20",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold mb-1">Practice Activity</h3>
          <p className="text-sm text-muted-foreground">
            {totalPractices} practice{totalPractices !== 1 ? 's' : ''} in the last 12 weeks
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center px-4 py-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
              <Flame className="w-5 h-5" />
              <span className="text-3xl font-bold">{currentStreak}</span>
            </div>
            <div className="text-xs text-muted-foreground font-medium">Day Streak</div>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
              <TrendingUp className="w-5 h-5" />
              <span className="text-3xl font-bold">{totalDays}</span>
            </div>
            <div className="text-xs text-muted-foreground font-medium">Active Days</div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="relative">
        {/* Month labels */}
        <div className="flex gap-1 mb-3 pl-8">
          {monthLabels.map((label, index) => (
            <div
              key={index}
              className="text-sm font-medium text-muted-foreground"
              style={{
                marginLeft: index === 0 ? '0' : `${(label.weekIndex - (monthLabels[index - 1]?.weekIndex || 0)) * 14}px`,
              }}
            >
              {label.month}
            </div>
          ))}
        </div>

        {/* Day labels + Grid */}
        <div className="flex gap-1">
          {/* Day of week labels */}
          <div className="flex flex-col gap-1 justify-between pr-2">
            <div className="h-3.5 text-xs text-muted-foreground flex items-center font-medium">Mon</div>
            <div className="h-3.5 text-xs text-muted-foreground flex items-center opacity-0">Tue</div>
            <div className="h-3.5 text-xs text-muted-foreground flex items-center font-medium">Wed</div>
            <div className="h-3.5 text-xs text-muted-foreground flex items-center opacity-0">Thu</div>
            <div className="h-3.5 text-xs text-muted-foreground flex items-center font-medium">Fri</div>
            <div className="h-3.5 text-xs text-muted-foreground flex items-center opacity-0">Sat</div>
            <div className="h-3.5 text-xs text-muted-foreground flex items-center opacity-0">Sun</div>
          </div>

          {/* Weeks grid */}
          <div className="flex gap-1 overflow-x-auto pb-3">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => {
                  if (day.count === -1) {
                    return <div key={dayIndex} className="w-3.5 h-3.5" />;
                  }
                  
                  const isToday = isSameDay(day.date, new Date());
                  
                  return (
                    <motion.div
                      key={dayIndex}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: (weekIndex * 7 + dayIndex) * 0.003, type: "spring", stiffness: 200 }}
                      whileHover={{ scale: 1.25, zIndex: 10 }}
                      className={cn(
                        'w-3.5 h-3.5 rounded-md cursor-pointer transition-all relative group',
                        getColor(day.count),
                        getGlow(day.count),
                        isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      )}
                      title={`${format(day.date, 'MMM d, yyyy')}: ${day.count} practice${day.count !== 1 ? 's' : ''}`}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-popover border border-border text-popover-foreground text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        <div className="font-semibold mb-0.5">{day.count} practice{day.count !== 1 ? 's' : ''}</div>
                        <div className="text-muted-foreground text-xs">{format(day.date, 'MMM d, yyyy')}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-5 text-sm text-muted-foreground">
          <span className="font-medium">Less</span>
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-muted/30" />
            <div className="w-3.5 h-3.5 rounded-md bg-green-500/30" />
            <div className="w-3.5 h-3.5 rounded-md bg-green-500/50" />
            <div className="w-3.5 h-3.5 rounded-md bg-green-500/70" />
            <div className="w-3.5 h-3.5 rounded-md bg-green-500/90" />
          </div>
          <span className="font-medium">More</span>
        </div>
      </div>
    </motion.div>
  );
};
