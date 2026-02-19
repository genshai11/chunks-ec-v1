import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  isToday,
  startOfWeek,
  endOfWeek
} from "date-fns";
import type { Lesson } from "@/hooks/useCourses";
import type { LessonDeadline } from "@/lib/scheduleUtils";

interface LessonCalendarViewProps {
  lessons: Lesson[];
  lessonDeadlines: LessonDeadline[] | null;
  getLessonProgress: (lessonId: string) => { completionPercent: number; avgScore: number } | undefined;
  onSelectLesson: (lesson: Lesson) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  lessons: Array<{
    lesson: Lesson;
    deadline: LessonDeadline;
    progress: { completionPercent: number; avgScore: number } | undefined;
  }>;
}

export const LessonCalendarView = ({ 
  lessons, 
  lessonDeadlines, 
  getLessonProgress,
  onSelectLesson 
}: LessonCalendarViewProps) => {
  
  const { calendarDays, currentMonth } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Get calendar grid (including days from prev/next month)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    const days: CalendarDay[] = allDays.map(date => {
      const dayLessons = lessons
        .map(lesson => {
          const deadline = lessonDeadlines?.find(d => d.lessonId === lesson.id);
          if (!deadline) return null;
          if (!isSameDay(deadline.deadline, date)) return null;
          return {
            lesson,
            deadline,
            progress: getLessonProgress(lesson.id),
          };
        })
        .filter(Boolean) as CalendarDay['lessons'];

      return {
        date,
        isCurrentMonth: date >= monthStart && date <= monthEnd,
        isToday: isToday(date),
        lessons: dayLessons,
      };
    });

    return {
      calendarDays: days,
      currentMonth: format(now, 'MMMM yyyy'),
    };
  }, [lessons, lessonDeadlines, getLessonProgress]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="max-w-md mx-auto">
      {/* Month Header - Compact */}
      <h2 className="text-lg font-semibold text-center mb-3">{currentMonth}</h2>

      {/* Calendar Grid - Smaller */}
      <div className="bg-card border border-border/50 rounded-lg p-3">
        {/* Weekday Headers - Compact */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {weekDays.map((day, i) => (
            <div 
              key={i}
              className="text-center text-[10px] font-semibold text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days - Smaller */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day) => {
            const hasLessons = day.lessons.length > 0;
            const firstLesson = day.lessons[0];
            const isComplete = firstLesson?.progress?.completionPercent === 100;
            
            return (
              <div
                key={day.date.toISOString()}
                className={cn(
                  "relative h-9 rounded border transition-all text-center flex items-center justify-center",
                  day.isCurrentMonth ? "bg-background" : "bg-muted/20",
                  day.isToday && "border-primary ring-1 ring-primary",
                  !day.isCurrentMonth && "opacity-40",
                  hasLessons && "cursor-pointer hover:border-primary/50 hover:shadow-sm"
                )}
                onClick={() => {
                  if (hasLessons) {
                    onSelectLesson(firstLesson.lesson);
                  }
                }}
              >
                {/* Day Number */}
                <span className={cn(
                  "text-xs",
                  day.isToday ? "text-primary font-bold" : "text-foreground"
                )}>
                  {format(day.date, 'd')}
                </span>

                {/* Lesson Indicator - Simple dot or checkmark */}
                {hasLessons && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                    {isComplete ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-success" />
                    ) : (
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        day.lessons[0].deadline.isPast ? "bg-destructive" : "bg-primary"
                      )} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend - Compact */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-success" />
          <span>Done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
          <span>Overdue</span>
        </div>
      </div>
    </div>
  );
};
