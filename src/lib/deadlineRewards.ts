import { differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';
import type { LessonDeadline } from './scheduleUtils';

export interface DeadlineReward {
  type: 'bonus' | 'penalty' | 'none';
  amount: number;
  completionPercent: number;
  daysEarlyOrLate: number;
  message: string;
  icon: string;
}

export interface DeadlineConfig {
  // Bonus for completing before deadline
  deadline_early_bonus_max: number;        // Max bonus for very early completion
  deadline_early_bonus_days: number;       // Days before deadline to get max bonus
  deadline_on_time_bonus: number;          // Bonus for completing on deadline day
  
  // Penalty for missing deadline
  deadline_penalty_max: number;            // Max penalty for very late
  deadline_penalty_grace_days: number;     // Grace period before penalties start
  deadline_penalty_scale_days: number;     // Days after which max penalty applies
  
  // Completion percentage requirements
  min_completion_for_bonus: number;        // Must reach this % to get bonus
  penalty_completion_threshold: number;    // Below this % = full penalty
}

const DEFAULT_CONFIG: DeadlineConfig = {
  deadline_early_bonus_max: 50,
  deadline_early_bonus_days: 3,
  deadline_on_time_bonus: 20,
  deadline_penalty_max: 100,
  deadline_penalty_grace_days: 0,
  deadline_penalty_scale_days: 7,
  min_completion_for_bonus: 80,
  penalty_completion_threshold: 50,
};

/**
 * Calculate deadline-based rewards or penalties
 * 
 * @param deadline - Lesson deadline info
 * @param completionPercent - Current lesson completion (0-100)
 * @param config - Deadline configuration
 * @returns Reward details (bonus, penalty, or none)
 */
export function calculateDeadlineReward(
  deadline: LessonDeadline,
  completionPercent: number,
  config: Partial<DeadlineConfig> = {}
): DeadlineReward {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadlineDate = new Date(deadline.deadline);
  deadlineDate.setHours(23, 59, 59, 999);
  
  const daysDiff = differenceInDays(deadlineDate, today);
  
  // SCENARIO 1: Completed BEFORE deadline
  if (daysDiff > 0) {
    // Check if completion is high enough for bonus
    if (completionPercent >= cfg.min_completion_for_bonus) {
      // Calculate early bonus (scales with how early)
      const earlyDays = Math.min(daysDiff, cfg.deadline_early_bonus_days);
      const bonusAmount = Math.round(
        (earlyDays / cfg.deadline_early_bonus_days) * cfg.deadline_early_bonus_max
      );
      
      return {
        type: 'bonus',
        amount: bonusAmount,
        completionPercent,
        daysEarlyOrLate: daysDiff,
        message: `Completed ${daysDiff} day${daysDiff > 1 ? 's' : ''} early!`,
        icon: '⚡'
      };
    } else {
      // Completion too low for early bonus
      return {
        type: 'none',
        amount: 0,
        completionPercent,
        daysEarlyOrLate: daysDiff,
        message: `Need ${cfg.min_completion_for_bonus}% completion for early bonus`,
        icon: '⏰'
      };
    }
  }
  
  // SCENARIO 2: Completed ON deadline day
  if (daysDiff === 0) {
    if (completionPercent >= cfg.min_completion_for_bonus) {
      return {
        type: 'bonus',
        amount: cfg.deadline_on_time_bonus,
        completionPercent,
        daysEarlyOrLate: 0,
        message: 'Completed right on time!',
        icon: '🎯'
      };
    } else {
      return {
        type: 'none',
        amount: 0,
        completionPercent,
        daysEarlyOrLate: 0,
        message: `Only ${completionPercent}% complete - keep practicing!`,
        icon: '⚠️'
      };
    }
  }
  
  // SCENARIO 3: AFTER deadline (penalty zone)
  const daysLate = Math.abs(daysDiff);
  
  // Grace period - no penalty yet
  if (daysLate <= cfg.deadline_penalty_grace_days) {
    if (completionPercent >= cfg.min_completion_for_bonus) {
      return {
        type: 'bonus',
        amount: Math.round(cfg.deadline_on_time_bonus * 0.5), // Half bonus
        completionPercent,
        daysEarlyOrLate: daysDiff,
        message: `Grace period - half bonus for completion`,
        icon: '🕐'
      };
    } else {
      return {
        type: 'none',
        amount: 0,
        completionPercent,
        daysEarlyOrLate: daysDiff,
        message: `${daysLate} day${daysLate > 1 ? 's' : ''} late - complete soon!`,
        icon: '⏰'
      };
    }
  }
  
  // Calculate penalty based on:
  // 1. How late (days)
  // 2. How incomplete (%)
  
  const latePenaltyFactor = Math.min(daysLate / cfg.deadline_penalty_scale_days, 1);
  
  let completionPenaltyFactor = 1;
  if (completionPercent >= cfg.min_completion_for_bonus) {
    // High completion - reduced penalty
    completionPenaltyFactor = 0.3;
  } else if (completionPercent >= cfg.penalty_completion_threshold) {
    // Medium completion - medium penalty
    completionPenaltyFactor = 0.6;
  } else {
    // Low completion - full penalty
    completionPenaltyFactor = 1;
  }
  
  const penaltyAmount = Math.round(
    cfg.deadline_penalty_max * latePenaltyFactor * completionPenaltyFactor
  );
  
  return {
    type: 'penalty',
    amount: penaltyAmount,
    completionPercent,
    daysEarlyOrLate: daysDiff,
    message: `${daysLate} day${daysLate > 1 ? 's' : ''} overdue (${completionPercent}% complete)`,
    icon: '❌'
  };
}

/**
 * Check all lessons for deadline rewards/penalties
 * Returns lessons that have crossed their deadline
 */
export function findDeadlineRewards(
  lessonDeadlines: LessonDeadline[],
  lessonProgress: Map<string, number>, // lessonId -> completion %
  config: Partial<DeadlineConfig> = {}
): Array<{
  lessonId: string;
  lessonName: string;
  reward: DeadlineReward;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const results: Array<{
    lessonId: string;
    lessonName: string;
    reward: DeadlineReward;
  }> = [];
  
  for (const deadline of lessonDeadlines) {
    const completionPercent = lessonProgress.get(deadline.lessonId) || 0;
    
    // Only process if deadline has passed or is today
    const deadlineDate = new Date(deadline.deadline);
    deadlineDate.setHours(23, 59, 59, 999);
    
    if (isAfter(today, deadlineDate) || differenceInDays(deadlineDate, today) === 0) {
      const reward = calculateDeadlineReward(deadline, completionPercent, config);
      
      // Only include if there's an actual reward or penalty
      if (reward.type !== 'none' || reward.completionPercent < 100) {
        results.push({
          lessonId: deadline.lessonId,
          lessonName: deadline.lessonName,
          reward
        });
      }
    }
  }
  
  return results;
}

/**
 * Calculate early completion bonus (for completing ahead of schedule)
 */
export function calculateEarlyCompletionBonus(
  daysBeforeDeadline: number,
  completionPercent: number,
  config: Partial<DeadlineConfig> = {}
): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (completionPercent < cfg.min_completion_for_bonus) {
    return 0;
  }
  
  if (daysBeforeDeadline <= 0) {
    return 0;
  }
  
  const earlyDays = Math.min(daysBeforeDeadline, cfg.deadline_early_bonus_days);
  return Math.round((earlyDays / cfg.deadline_early_bonus_days) * cfg.deadline_early_bonus_max);
}

/**
 * Get a descriptive message for the deadline status
 */
export function getDeadlineStatusMessage(
  deadline: LessonDeadline,
  completionPercent: number
): {
  message: string;
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  color: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadlineDate = new Date(deadline.deadline);
  deadlineDate.setHours(23, 59, 59, 999);
  
  const daysDiff = differenceInDays(deadlineDate, today);
  
  // Completed
  if (completionPercent >= 100) {
    return {
      message: '✅ Completed',
      urgency: 'none',
      color: 'text-success'
    };
  }
  
  // Overdue
  if (daysDiff < 0) {
    const daysLate = Math.abs(daysDiff);
    return {
      message: `❌ ${daysLate} day${daysLate > 1 ? 's' : ''} overdue`,
      urgency: 'critical',
      color: 'text-destructive'
    };
  }
  
  // Due today
  if (daysDiff === 0) {
    return {
      message: '⚠️ Due today!',
      urgency: 'critical',
      color: 'text-warning'
    };
  }
  
  // Due soon
  if (daysDiff <= 2) {
    return {
      message: `⏰ ${daysDiff} day${daysDiff > 1 ? 's' : ''} left`,
      urgency: 'high',
      color: 'text-warning'
    };
  }
  
  // Upcoming
  if (daysDiff <= 7) {
    return {
      message: `📅 ${daysDiff} days left`,
      urgency: 'medium',
      color: 'text-muted-foreground'
    };
  }
  
  // Plenty of time
  return {
    message: `📅 ${daysDiff} days left`,
    urgency: 'low',
    color: 'text-muted-foreground'
  };
}
