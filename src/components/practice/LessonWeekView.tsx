import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { startOfWeek, endOfWeek, eachWeekOfInterval, format, isWithinInterval } from "date-fns";
import type { Lesson } from "@/hooks/useCourses";
import type { LessonDeadline } from "@/lib/scheduleUtils";
import { getDeadlineStatus } from "@/lib/scheduleUtils";

interface LessonWeekViewProps {
  lessons: Lesson[];
  lessonDeadlines: LessonDeadline[] | null;
  getLessonProgress: (lessonId: string) => { completionPercent: number; avgScore: number } | undefined;
  onSelectLesson: (lesson: Lesson) => void;
}

interface WeekGroup {
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
  lessons: Array<{
    lesson: Lesson;
    deadline: LessonDeadline | undefined;
    progress: { completionPercent: number; avgScore: number } | undefined;
  }>;
}

export const LessonWeekView = ({ 
  lessons, 
  lessonDeadlines, 
  getLessonProgress,
  onSelectLesson 
}: LessonWeekViewProps) => {
  const getStatus = (completion = 0) => {
    if (completion >= 100) return { label: "Completed", className: "bg-success/15 text-success border-success/30" };
    if (completion > 0) return { label: "In Progress", className: "bg-primary/10 text-primary border-primary/30" };
    return { label: "Not Started", className: "bg-muted text-muted-foreground border-border/50" };
  };
  
  const weekGroups = useMemo(() => {
    if (!lessonDeadlines || lessonDeadlines.length === 0) {
      // Fallback: group all lessons in current week
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      
      return [{
        weekStart,
        weekEnd,
        weekLabel: format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d, yyyy'),
        lessons: lessons.map(lesson => ({
          lesson,
          deadline: undefined,
          progress: getLessonProgress(lesson.id),
        }))
      }];
    }

    // Find date range
    const allDeadlines = lessonDeadlines.map(d => d.deadline);
    const minDate = new Date(Math.min(...allDeadlines.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDeadlines.map(d => d.getTime())));
    
    // Get all weeks in range
    const weeks = eachWeekOfInterval(
      { start: minDate, end: maxDate },
      { weekStartsOn: 1 } // Monday
    );

    // Group lessons by week
    const groups: WeekGroup[] = weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      const weekLessons = lessons
        .map(lesson => {
          const deadline = lessonDeadlines.find(d => d.lessonId === lesson.id);
          return { lesson, deadline, progress: getLessonProgress(lesson.id) };
        })
        .filter(({ deadline }) => 
          deadline && isWithinInterval(deadline.deadline, { start: weekStart, end: weekEnd })
        );

      return {
        weekStart,
        weekEnd,
        weekLabel: format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d, yyyy'),
        lessons: weekLessons,
      };
    }).filter(group => group.lessons.length > 0);

    return groups;
  }, [lessons, lessonDeadlines, getLessonProgress]);

  return (
    <div className="space-y-6">
      {weekGroups.map((week, weekIndex) => (
        <motion.div
          key={week.weekLabel}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: weekIndex * 0.1 }}
        >
          {/* Week Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {week.weekLabel}
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Week Lessons */}
          <div className="space-y-2">
            {week.lessons.map(({ lesson, deadline, progress }, index) => {
              const deadlineStatus = deadline ? getDeadlineStatus(deadline) : null;
              const isComplete = progress?.completionPercent === 100;
              const status = getStatus(progress?.completionPercent || 0);

              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: weekIndex * 0.1 + index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "group cursor-pointer transition-all hover:shadow-md",
                      isComplete 
                        ? "bg-success/5 border-success/30 hover:border-success/50" 
                        : "bg-card/50 border-border/30 hover:bg-card hover:border-primary/30"
                    )}
                    onClick={() => onSelectLesson(lesson)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Number/Status Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                          isComplete 
                            ? "bg-success/20 text-success" 
                            : "bg-primary/10 text-primary"
                        )}>
                          {isComplete ? <CheckCircle2 className="w-5 h-5" /> : lesson.order_index}
                        </div>
                        
                        {/* Lesson Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {lesson.lesson_name}
                            </h3>
                            <Badge variant="outline" className={status.className}>
                              {status.label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3 flex-wrap">
                            {progress && progress.completionPercent > 0 && (
                              <div className="flex items-center gap-2 flex-1 min-w-[120px] max-w-[200px]">
                                <Progress value={progress.completionPercent} className="h-1.5 flex-1" />
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {progress.completionPercent}%
                                </span>
                              </div>
                            )}
                            
                            {!progress && (
                              <span className="text-xs text-muted-foreground">
                                {Object.keys(lesson.categories || {}).length} categories
                              </span>
                            )}

                            {/* Deadline info */}
                            {deadline && (
                              <span className="text-xs text-muted-foreground">
                                Due: {deadline.deadlineFormatted}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side: Deadline badge + Score */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Deadline badge */}
                          {deadline && !isComplete && (
                            <Badge 
                              variant={deadlineStatus?.variant} 
                              className={cn("text-xs gap-1", deadlineStatus?.className)}
                            >
                              {deadline.isPast ? (
                                <AlertCircle className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {deadlineStatus?.label}
                            </Badge>
                          )}

                          {/* Score */}
                          {progress && progress.avgScore > 0 && (
                            <span className={cn(
                              "text-sm font-medium",
                              progress.avgScore >= 80 ? "text-success" : 
                              progress.avgScore >= 60 ? "text-warning" : "text-muted-foreground"
                            )}>
                              {progress.avgScore}%
                            </span>
                          )}
                          
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
