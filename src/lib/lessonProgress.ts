import type { Lesson } from "@/hooks/useCourses";
import type { UserProgress } from "@/hooks/usePractice";

export interface LessonProgressStats {
  totalItems: number;
  completedItems: number;
  completionPercent: number;
  previousPercent: number;
  milestoneAchieved: number | null; // 25, 50, 75, or 100
}

export interface MilestoneBonus {
  milestone: number;
  bonusCoins: number;
  label: string;
  icon: string;
}

/**
 * Calculate lesson completion percentage and detect milestones
 */
export function calculateLessonProgress(
  lesson: Lesson,
  userProgress: UserProgress[]
): LessonProgressStats {
  // Count total items across all categories
  let totalItems = 0;
  const categories = lesson.categories || {};
  
  Object.values(categories).forEach((items) => {
    totalItems += Array.isArray(items) ? items.length : 0;
  });

  // Count completed items (mastery level >= 3)
  const completedItems = userProgress.filter(p => p.mastery_level >= 3).length;
  
  // Calculate percentages
  const completionPercent = totalItems > 0 
    ? Math.round((completedItems / totalItems) * 100) 
    : 0;
    
  // Calculate previous completion (before this item)
  const previousCompletedItems = Math.max(0, completedItems - 1);
  const previousPercent = totalItems > 0
    ? Math.round((previousCompletedItems / totalItems) * 100)
    : 0;

  // Detect milestone achievement
  let milestoneAchieved: number | null = null;
  
  const milestones = [25, 50, 75, 100];
  for (const milestone of milestones) {
    if (completionPercent >= milestone && previousPercent < milestone) {
      milestoneAchieved = milestone;
      break;
    }
  }

  return {
    totalItems,
    completedItems,
    completionPercent,
    previousPercent,
    milestoneAchieved,
  };
}

/**
 * Get milestone bonus configuration
 */
export function getMilestoneBonus(
  milestone: number,
  config?: {
    milestone_25_bonus?: number;
    milestone_50_bonus?: number;
    milestone_75_bonus?: number;
    milestone_100_bonus?: number;
  }
): MilestoneBonus | null {
  const defaults = {
    milestone_25_bonus: 10,
    milestone_50_bonus: 25,
    milestone_75_bonus: 50,
    milestone_100_bonus: 100,
  };
  
  const bonusConfig = { ...defaults, ...config };

  switch (milestone) {
    case 25:
      return {
        milestone: 25,
        bonusCoins: bonusConfig.milestone_25_bonus,
        label: "Quarter Complete",
        icon: "🎯"
      };
    case 50:
      return {
        milestone: 50,
        bonusCoins: bonusConfig.milestone_50_bonus,
        label: "Halfway There",
        icon: "🔥"
      };
    case 75:
      return {
        milestone: 75,
        bonusCoins: bonusConfig.milestone_75_bonus,
        label: "Almost Done",
        icon: "⭐"
      };
    case 100:
      return {
        milestone: 100,
        bonusCoins: bonusConfig.milestone_100_bonus,
        label: "Lesson Complete",
        icon: "🏆"
      };
    default:
      return null;
  }
}

/**
 * Calculate total items practiced in a lesson
 */
export function getLessonItemCount(lesson: Lesson): number {
  let count = 0;
  const categories = lesson.categories || {};
  
  Object.values(categories).forEach((items) => {
    count += Array.isArray(items) ? items.length : 0;
  });
  
  return count;
}

/**
 * Check if user should get a streak bonus for consecutive high scores
 */
export interface StreakBonus {
  consecutiveHighScores: number;
  bonusCoins: number;
  label: string;
}

export function calculateStreakBonus(
  recentScores: number[],
  config?: {
    streak_bonus_threshold?: number; // Default: 3 consecutive
    streak_bonus_min_score?: number;  // Default: 80
    streak_bonus_coins?: number;      // Default: 5
  }
): StreakBonus | null {
  const defaults = {
    streak_bonus_threshold: 3,
    streak_bonus_min_score: 80,
    streak_bonus_coins: 5,
  };
  
  const streakConfig = { ...defaults, ...config };
  
  // Count consecutive high scores from the end
  let consecutive = 0;
  for (let i = recentScores.length - 1; i >= 0; i--) {
    if (recentScores[i] >= streakConfig.streak_bonus_min_score) {
      consecutive++;
    } else {
      break;
    }
  }
  
  // Award bonus if threshold is met
  if (consecutive >= streakConfig.streak_bonus_threshold) {
    return {
      consecutiveHighScores: consecutive,
      bonusCoins: streakConfig.streak_bonus_coins * Math.floor(consecutive / streakConfig.streak_bonus_threshold),
      label: `${consecutive}x Streak Bonus`
    };
  }
  
  return null;
}

/**
 * Calculate first-time bonus for practicing a new item
 */
export function getFirstTimePracticeBonus(
  attempts: number,
  config?: {
    first_practice_bonus?: number;
  }
): number {
  const defaults = {
    first_practice_bonus: 2,
  };
  
  const bonusConfig = { ...defaults, ...config };
  
  // Only give bonus on first attempt
  return attempts === 1 ? bonusConfig.first_practice_bonus : 0;
}
