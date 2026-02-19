import { addDays, getDay, format, parseISO, isAfter, isBefore, isToday } from 'date-fns';

// Weekday mapping (0 = Sunday, 1 = Monday, etc.)
const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export interface LessonDeadline {
  lessonId: string;
  lessonName: string;
  orderIndex: number;
  deadline: Date;
  deadlineFormatted: string;
  isPast: boolean;
  isToday: boolean;
  daysRemaining: number;
}

/**
 * Calculate lesson deadlines based on start date and schedule days
 * @param startDate - Student's enrollment start date
 * @param scheduleDays - Array of weekday names (e.g., ["monday", "wednesday", "friday"])
 * @param lessons - Array of lessons with id, lesson_name, order_index
 * @returns Array of lesson deadlines
 */
export function calculateLessonDeadlines(
  startDate: string | Date,
  scheduleDays: string[],
  lessons: Array<{ id: string; lesson_name: string; order_index: number }>
): LessonDeadline[] {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort lessons by order_index
  const sortedLessons = [...lessons].sort((a, b) => a.order_index - b.order_index);

  // Convert schedule days to day numbers and sort
  const scheduleDayNumbers = scheduleDays
    .map(day => WEEKDAY_MAP[day.toLowerCase()])
    .filter(n => n !== undefined)
    .sort((a, b) => a - b);

  if (scheduleDayNumbers.length === 0) {
    // Default to every day if no schedule
    return sortedLessons.map((lesson, index) => {
      const deadline = addDays(start, index);
      return createDeadlineInfo(lesson, deadline, today);
    });
  }

  // Find the first schedule day on or after start date
  let currentDate = new Date(start);
  const startDayOfWeek = getDay(currentDate);
  
  // Find next valid schedule day
  let daysToAdd = 0;
  for (let i = 0; i < 7; i++) {
    const checkDay = (startDayOfWeek + i) % 7;
    if (scheduleDayNumbers.includes(checkDay)) {
      daysToAdd = i;
      break;
    }
  }
  currentDate = addDays(start, daysToAdd);

  const deadlines: LessonDeadline[] = [];

  for (const lesson of sortedLessons) {
    deadlines.push(createDeadlineInfo(lesson, currentDate, today));
    currentDate = getNextScheduleDay(currentDate, scheduleDayNumbers);
  }

  return deadlines;
}

function createDeadlineInfo(
  lesson: { id: string; lesson_name: string; order_index: number },
  deadline: Date,
  today: Date
): LessonDeadline {
  const deadlineMidnight = new Date(deadline);
  deadlineMidnight.setHours(23, 59, 59, 999);
  
  const isPast = isAfter(today, deadlineMidnight);
  const isTodayDeadline = isToday(deadline);
  const timeDiff = deadline.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  return {
    lessonId: lesson.id,
    lessonName: lesson.lesson_name,
    orderIndex: lesson.order_index,
    deadline,
    deadlineFormatted: format(deadline, 'MMM d, yyyy'),
    isPast,
    isToday: isTodayDeadline,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

function getNextScheduleDay(currentDate: Date, scheduleDayNumbers: number[]): Date {
  let nextDate = addDays(currentDate, 1);
  
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = getDay(nextDate);
    if (scheduleDayNumbers.includes(dayOfWeek)) {
      return nextDate;
    }
    nextDate = addDays(nextDate, 1);
  }
  
  return addDays(currentDate, 1); // Fallback
}

/**
 * Get schedule display string
 */
export function formatScheduleDays(scheduleDays: string[]): string {
  if (!scheduleDays || scheduleDays.length === 0) return 'No schedule';
  
  const shortNames: Record<string, string> = {
    sunday: 'Sun',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
  };
  
  return scheduleDays
    .map(d => shortNames[d.toLowerCase()] || d)
    .join(', ');
}

/**
 * Get deadline status badge info
 */
export function getDeadlineStatus(deadline: LessonDeadline): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
} {
  if (deadline.isPast) {
    return { label: 'Overdue', variant: 'destructive', className: 'bg-destructive/10 text-destructive' };
  }
  if (deadline.isToday) {
    return { label: 'Due Today', variant: 'default', className: 'bg-warning/10 text-warning' };
  }
  if (deadline.daysRemaining <= 2) {
    return { label: `${deadline.daysRemaining}d left`, variant: 'secondary', className: 'bg-warning/10 text-warning' };
  }
  return { label: deadline.deadlineFormatted, variant: 'outline', className: '' };
}
