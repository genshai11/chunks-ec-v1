import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/hooks/useCourses";
import type { LessonDeadline } from "@/lib/scheduleUtils";
import { getDeadlineStatus } from "@/lib/scheduleUtils";

interface LessonGridViewProps {
  lessons: Lesson[];
  lessonDeadlines: LessonDeadline[] | null;
  getLessonProgress: (lessonId: string) => { completionPercent: number; avgScore: number } | undefined;
  onSelectLesson: (lesson: Lesson) => void;
}

export const LessonGridView = ({ 
  lessons, 
  lessonDeadlines, 
  getLessonProgress,
  onSelectLesson 
}: LessonGridViewProps) => {
  const getStatus = (completion = 0) => {
    if (completion >= 100) return { label: "Completed", className: "bg-success/15 text-success border-success/30" };
    if (completion > 0) return { label: "In Progress", className: "bg-primary/10 text-primary border-primary/30" };
    return { label: "Not Started", className: "bg-muted text-muted-foreground border-border/50" };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {lessons.map((lesson, index) => {
        const progress = getLessonProgress(lesson.id);
        const status = getStatus(progress?.completionPercent || 0);
        const deadline = lessonDeadlines?.find(d => d.lessonId === lesson.id);
        const deadlineStatus = deadline ? getDeadlineStatus(deadline) : null;
        const isComplete = progress?.completionPercent === 100;

        return (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg group",
                isComplete 
                  ? "border-success/30 bg-success/5" 
                  : "border-border/50 hover:border-primary/30"
              )}
              onClick={() => onSelectLesson(lesson)}
            >
              <CardContent className="p-5">
                {/* Header with number and status */}
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0",
                    isComplete 
                      ? "bg-success/20 text-success" 
                      : "bg-primary/10 text-primary group-hover:bg-primary/20"
                  )}>
                    {isComplete ? <CheckCircle2 className="w-6 h-6" /> : lesson.order_index}
                  </div>

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
                </div>

                {/* Lesson name */}
                <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {lesson.lesson_name}
                </h3>

                {/* Categories count */}
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-3">
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                  <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{Object.keys(lesson.categories || {}).length} categories</span>
                  </div>
                </div>

                {/* Progress */}
                {progress && progress.completionPercent > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className={cn(
                        "font-medium",
                        progress.completionPercent === 100 ? "text-success" : "text-primary"
                      )}>
                        {progress.completionPercent}%
                      </span>
                    </div>
                    <Progress value={progress.completionPercent} className="h-1.5" />
                  </div>
                )}

                {/* Score badge */}
                {progress && progress.avgScore > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg Score</span>
                      <span className={cn(
                        "font-semibold",
                        progress.avgScore >= 80 ? "text-success" : 
                        progress.avgScore >= 60 ? "text-warning" : "text-muted-foreground"
                      )}>
                        {progress.avgScore}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
