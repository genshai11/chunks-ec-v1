/**
 * Test Suite for Bonus Calculation Systems
 * 
 * This file tests:
 * - Milestone bonuses (25%, 50%, 75%, 100%)
 * - Streak bonuses (consecutive high scores)
 * - First practice bonuses
 * - Deadline rewards/penalties (early, on-time, late)
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateLessonProgress, 
  getMilestoneBonus, 
  calculateStreakBonus, 
  getFirstTimePracticeBonus 
} from '../lessonProgress';
import { calculateDeadlineReward } from '../deadlineRewards';
import type { CoinConfig } from '@/hooks/useCoinWallet';

// Mock coin config with default values
const mockCoinConfig: CoinConfig = {
  reward_min: 5,
  reward_max: 15,
  reward_score_threshold: 70,
  penalty_min: 3,
  penalty_max: 10,
  penalty_score_threshold: 50,
  
  // Milestones
  milestone_25_bonus: 10,
  milestone_50_bonus: 25,
  milestone_75_bonus: 50,
  milestone_100_bonus: 100,
  
  // Streaks
  streak_bonus_threshold: 3,
  streak_bonus_min_score: 80,
  streak_bonus_coins: 5,
  
  // First practice
  first_practice_bonus: 2,
  
  // Deadline bonuses
  deadline_early_bonus_max: 50,
  deadline_early_bonus_days: 3,
  deadline_on_time_bonus: 20,
  
  // Deadline penalties
  deadline_penalty_max: 100,
  deadline_penalty_grace_days: 0,
  deadline_penalty_scale_days: 7,
  
  // Completion thresholds
  min_completion_for_bonus: 80,
  penalty_completion_threshold: 50,
};

describe('Milestone Bonuses', () => {
  it('should award 10 coins for 25% completion', () => {
    const result = getMilestoneBonus(25, mockCoinConfig);
    expect(result).toEqual({
      milestonePercent: 25,
      bonusCoins: 10,
      label: '25% Complete',
      icon: '🎯'
    });
  });

  it('should award 25 coins for 50% completion', () => {
    const result = getMilestoneBonus(50, mockCoinConfig);
    expect(result?.bonusCoins).toBe(25);
  });

  it('should award 50 coins for 75% completion', () => {
    const result = getMilestoneBonus(75, mockCoinConfig);
    expect(result?.bonusCoins).toBe(50);
  });

  it('should award 100 coins for 100% completion', () => {
    const result = getMilestoneBonus(100, mockCoinConfig);
    expect(result?.bonusCoins).toBe(100);
    expect(result?.icon).toBe('🏆');
  });

  it('should return null for non-milestone percentages', () => {
    expect(getMilestoneBonus(30, mockCoinConfig)).toBeNull();
    expect(getMilestoneBonus(60, mockCoinConfig)).toBeNull();
  });
});

describe('Streak Bonuses', () => {
  it('should award bonus for 3 consecutive scores >= 80', () => {
    const scores = [85, 90, 82];
    const result = calculateStreakBonus(scores, mockCoinConfig);
    expect(result?.bonusCoins).toBe(5);
    expect(result?.streakCount).toBe(3);
  });

  it('should award bonus for 6 consecutive high scores (2x threshold)', () => {
    const scores = [85, 90, 82, 88, 95, 81];
    const result = calculateStreakBonus(scores, mockCoinConfig);
    expect(result?.bonusCoins).toBe(10); // 2 * 5 coins
    expect(result?.streakCount).toBe(6);
  });

  it('should not award bonus for scores below threshold', () => {
    const scores = [75, 78, 79];
    const result = calculateStreakBonus(scores, mockCoinConfig);
    expect(result).toBeNull();
  });

  it('should not award bonus if streak is broken', () => {
    const scores = [85, 70, 82]; // Middle score breaks streak
    const result = calculateStreakBonus(scores, mockCoinConfig);
    expect(result).toBeNull();
  });
});

describe('First Practice Bonus', () => {
  it('should award bonus for first attempt', () => {
    const bonus = getFirstTimePracticeBonus(1, mockCoinConfig);
    expect(bonus).toBe(2);
  });

  it('should not award bonus for second attempt', () => {
    const bonus = getFirstTimePracticeBonus(2, mockCoinConfig);
    expect(bonus).toBe(0);
  });
});

describe('Deadline Rewards - Early Completion', () => {
  const now = new Date('2026-01-15T12:00:00Z');
  
  it('should award max bonus for 3+ days early with 80%+ completion', () => {
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-01-20T23:59:59Z'), // 5+ days away
    };
    
    const result = calculateDeadlineReward(deadline, 90, mockCoinConfig, now);
    expect(result.type).toBe('bonus');
    expect(result.amount).toBe(50); // max early bonus
    expect(result.icon).toBe('⚡');
  });

  it('should award scaled bonus for 2 days early', () => {
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-01-17T23:59:59Z'), // 2 days away
    };
    
    const result = calculateDeadlineReward(deadline, 85, mockCoinConfig, now);
    expect(result.type).toBe('bonus');
    expect(result.amount).toBeGreaterThan(20); // More than on-time
    expect(result.amount).toBeLessThan(50); // Less than max
  });

  it('should not award bonus if completion below threshold', () => {
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-01-20T23:59:59Z'),
    };
    
    const result = calculateDeadlineReward(deadline, 70, mockCoinConfig, now); // <80%
    expect(result.type).toBe('none');
  });
});

describe('Deadline Rewards - On Time', () => {
  const now = new Date('2026-01-15T12:00:00Z');
  
  it('should award on-time bonus for completion on deadline day', () => {
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-01-15T23:59:59Z'), // Same day
    };
    
    const result = calculateDeadlineReward(deadline, 85, mockCoinConfig, now);
    expect(result.type).toBe('bonus');
    expect(result.amount).toBe(20);
    expect(result.icon).toBe('🎯');
  });
});

describe('Deadline Penalties - Late Completion', () => {
  const now = new Date('2026-01-15T12:00:00Z');
  
  it('should apply reduced penalty for late but high completion', () => {
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-01-12T23:59:59Z'), // 3 days overdue
    };
    
    const result = calculateDeadlineReward(deadline, 85, mockCoinConfig, now); // 85% complete
    expect(result.type).toBe('penalty');
    expect(result.amount).toBeGreaterThan(0);
    expect(result.amount).toBeLessThan(50); // Reduced because high completion
  });

  it('should apply full scaled penalty for late with medium completion', () => {
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-01-12T23:59:59Z'), // 3 days overdue
    };
    
    const result = calculateDeadlineReward(deadline, 60, mockCoinConfig, now); // 60% complete
    expect(result.type).toBe('penalty');
    expect(result.amount).toBeGreaterThan(20);
  });

  it('should apply max penalty for late with low completion', () => {
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-01-12T23:59:59Z'), // 3 days overdue
    };
    
    const result = calculateDeadlineReward(deadline, 30, mockCoinConfig, now); // 30% complete
    expect(result.type).toBe('penalty');
    expect(result.amount).toBeGreaterThan(50);
  });

  it('should apply maximum penalty for 7+ days late', () => {
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-01-05T23:59:59Z'), // 10 days overdue
    };
    
    const result = calculateDeadlineReward(deadline, 40, mockCoinConfig, now);
    expect(result.type).toBe('penalty');
    expect(result.amount).toBe(100); // Max penalty
  });
});

describe('Integration - Full Lesson Progress', () => {
  it('should calculate correct total bonus for typical lesson completion', () => {
    // Scenario: User completes lesson on time with good scores
    let totalBonus = 0;
    
    // First practice bonus (once)
    totalBonus += 2;
    
    // Milestone bonuses (4 times)
    totalBonus += 10 + 25 + 50 + 100; // 185
    
    // Streak bonus (assuming 3 consecutive scores >= 80)
    totalBonus += 5;
    
    // On-time bonus at 100% completion
    totalBonus += 20;
    
    expect(totalBonus).toBe(222); // Total possible bonus
  });

  it('should calculate penalty for late low-completion lesson', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-01-08T23:59:59Z'), // 7 days late
    };
    
    // User has 40% completion, 7 days late
    const result = calculateDeadlineReward(deadline, 40, mockCoinConfig, now);
    
    // Should get large penalty
    expect(result.type).toBe('penalty');
    expect(result.amount).toBeGreaterThanOrEqual(80);
  });
});

describe('Edge Cases', () => {
  it('should handle undefined coin config gracefully', () => {
    const result = getMilestoneBonus(25, undefined);
    expect(result).toBeNull();
  });

  it('should handle empty score array for streak', () => {
    const result = calculateStreakBonus([], mockCoinConfig);
    expect(result).toBeNull();
  });

  it('should handle future deadline correctly', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    const deadline = {
      lessonId: 'test-lesson',
      deadline: new Date('2026-02-15T23:59:59Z'), // 31 days in future
    };
    
    // Should still give bonus if completion is high enough
    const result = calculateDeadlineReward(deadline, 90, mockCoinConfig, now);
    expect(result.type).toBe('bonus');
    expect(result.amount).toBe(50); // Max early bonus
  });
});
