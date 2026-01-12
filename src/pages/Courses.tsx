import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Loader2, CheckCircle2, ArrowRight, Mic, Calendar, Clock, Users } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEnrollments, useCourseLessons } from "@/hooks/useCourses";
import { useProgressStats } from "@/hooks/useProgressStats";
import { formatScheduleDays, calculateLessonDeadlines, getDeadlineStatus } from "@/lib/scheduleUtils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const Courses = () => {
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();
  const { data: progressStats } = useProgressStats();
  
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);

  const selectedEnrollment = enrollments?.find(e => e.id === selectedEnrollmentId);
  const selectedCourse = selectedEnrollment?.courses;
  const selectedClass = selectedEnrollment?.course_classes;
  
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(selectedCourse?.id || null);

  // Calculate deadlines based on class schedule (or enrollment start_date)
  const lessonDeadlines = selectedEnrollment && lessons 
    ? calculateLessonDeadlines(
        selectedClass?.start_date || selectedEnrollment.start_date || new Date().toISOString(),
        selectedClass?.schedule_days || ['monday', 'wednesday', 'friday'],
        lessons.map(l => ({ id: l.id, lesson_name: l.lesson_name, order_index: l.order_index }))
      )
    : null;

  // Get lesson progress
  const getLessonProgress = (lessonId: string) => {
    const courseProgress = progressStats?.courses?.find(c => c.courseId === selectedCourse?.id);
    return courseProgress?.lessons.find(l => l.lessonId === lessonId);
  };

  if (enrollmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasEnrollments = enrollments && enrollments.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
              My Classes
            </h1>
            <p className="text-muted-foreground">
              {selectedEnrollment 
                ? `${selectedClass?.class_name || selectedCourse?.name} • ${lessons?.length || 0} lessons` 
                : hasEnrollments 
                  ? "View your enrolled classes and lessons"
                  : "Contact your admin to get enrolled in a class"
              }
            </p>
          </motion.div>

          {/* Enrollment Cards or Lessons */}
          {!selectedEnrollmentId ? (
            // Enrollment Selection View
            <div className="grid gap-4">
              {!hasEnrollments ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No Classes Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      You haven't been enrolled in any classes. Contact your admin or teacher to get enrolled.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                enrollments?.map((enrollment, index) => {
                  const course = enrollment.courses;
                  const classInfo = enrollment.course_classes;
                  
                  return (
                    <motion.div
                      key={enrollment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="group cursor-pointer transition-all hover:border-primary/50 border-primary/30 bg-primary/5"
                        onClick={() => setSelectedEnrollmentId(enrollment.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                  <BookOpen className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">
                                      {classInfo?.class_name || course?.name}
                                    </h3>
                                    <Badge className="bg-primary/20 text-primary border-0">
                                      <CheckCircle2 size={12} className="mr-1" />
                                      Enrolled
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {classInfo && (
                                      <Badge variant="outline">{classInfo.class_code}</Badge>
                                    )}
                                    {course && (
                                      <Badge variant="secondary">{course.code}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {course?.description && (
                                <CardDescription className="mt-3 line-clamp-2">
                                  {course.description}
                                </CardDescription>
                              )}
                              
                              <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                                {classInfo?.start_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Started: {format(new Date(classInfo.start_date), 'MMM d, yyyy')}
                                  </span>
                                )}
                                {classInfo?.schedule_days && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatScheduleDays(classInfo.schedule_days)}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <Button variant="secondary">
                              View Lessons
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          ) : (
            // Lessons View with Progress & Deadlines
            <div>
              <Button 
                variant="ghost" 
                className="mb-4"
                onClick={() => setSelectedEnrollmentId(null)}
              >
                ← Back to Classes
              </Button>
              
              {lessonsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : lessons?.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No lessons in this course yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {lessons?.map((lesson, index) => {
                    const progress = getLessonProgress(lesson.id);
                    const deadline = lessonDeadlines?.find(d => d.lessonId === lesson.id);
                    const deadlineStatus = deadline ? getDeadlineStatus(deadline) : null;
                    const isComplete = progress?.completionPercent === 100;

                    return (
                      <Link key={lesson.id} to={`/practice?lesson=${lesson.id}`}>
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.03 * index }}
                          className={cn(
                            "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                            isComplete 
                              ? "bg-success/5 border-success/30 hover:border-success/50" 
                              : "bg-card border-border/50 hover:border-primary/30"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
                            isComplete 
                              ? "bg-success/20 text-success" 
                              : "gradient-primary text-primary-foreground"
                          )}>
                            {isComplete ? <CheckCircle2 className="w-6 h-6" /> : lesson.order_index}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {lesson.lesson_name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              {progress && progress.completionPercent > 0 ? (
                                <div className="flex items-center gap-2 max-w-[100px]">
                                  <Progress value={progress.completionPercent} className="h-1.5" />
                                  <span className="text-xs text-muted-foreground">
                                    {progress.completionPercent}%
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {Object.keys(lesson.categories || {}).slice(0, 2).map((cat) => (
                                    <Badge key={cat} variant="secondary" className="text-xs">
                                      {cat}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Deadline & Score */}
                          <div className="flex items-center gap-3 shrink-0">
                            {deadline && !isComplete && (
                              <Badge 
                                variant={deadlineStatus?.variant} 
                                className={cn("text-xs gap-1", deadlineStatus?.className)}
                              >
                                <Clock className="w-3 h-3" />
                                {deadlineStatus?.label}
                              </Badge>
                            )}
                            
                            {progress && progress.avgScore > 0 && (
                              <span className={cn(
                                "text-sm font-medium",
                                progress.avgScore >= 80 ? "text-success" : 
                                progress.avgScore >= 60 ? "text-warning" : "text-muted-foreground"
                              )}>
                                {progress.avgScore}%
                              </span>
                            )}
                            
                            <Button size="sm" className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Mic className="w-4 h-4" />
                              Practice
                            </Button>
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Courses;
