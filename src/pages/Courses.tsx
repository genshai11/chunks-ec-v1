import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Loader2, CheckCircle2, Users, Calendar, Clock, ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { LessonItem } from "@/components/dashboard/LessonItem";
import { CategoryTabs } from "@/components/dashboard/CategoryTabs";
import { PracticeItemCard } from "@/components/dashboard/PracticeItemCard";
import { PracticeModal } from "@/components/practice/PracticeModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useCourses, useEnrollments, useCourseLessons, useEnrollInCourse, Lesson } from "@/hooks/useCourses";
import { useUserProgress } from "@/hooks/usePractice";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { Mic } from "lucide-react";
import { format } from "date-fns";

const Courses = () => {
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();
  const enrollInCourse = useEnrollInCourse();
  const tts = useTextToSpeech();
  
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeCategory, setActiveCategory] = useState("Vocab");
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [enrollDialogCourse, setEnrollDialogCourse] = useState<typeof courses[0] | null>(null);

  const { data: lessonProgress } = useUserProgress(selectedLesson?.id);

  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
  const firstEnrolledCourse = courses?.find(c => enrolledCourseIds.includes(c.id));
  
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(
    selectedCourseId || firstEnrolledCourse?.id || null
  );

  const lessonCategories = selectedLesson?.categories 
    ? Object.entries(selectedLesson.categories).map(([name, items]) => ({
        id: name.toLowerCase(),
        name,
        count: (items as any[]).length
      }))
    : [];

  const practiceItems = selectedLesson?.categories?.[activeCategory] || [];
  const practiceItemsWithMastery = practiceItems.map((item: any, index: number) => {
    const progress = lessonProgress?.find(
      p => p.category === activeCategory && p.item_index === index
    );
    return {
      ...item,
      mastered: (progress?.mastery_level || 0) >= 3,
      bestScore: progress?.best_score || 0,
      attempts: progress?.attempts || 0
    };
  });

  const isLoading = coursesLoading || enrollmentsLoading;

  const handleEnroll = (course: typeof courses[0]) => {
    setEnrollDialogCourse(course);
  };

  const confirmEnroll = () => {
    if (enrollDialogCourse) {
      enrollInCourse.mutate(enrollDialogCourse.id);
      setEnrollDialogCourse(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
              Courses
            </h1>
            <p className="text-muted-foreground">
              Browse and enroll in courses to start your learning journey.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              {/* Available Courses */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-semibold text-foreground">
                    {enrolledCourseIds.length > 0 ? 'Your Courses' : 'Available Courses'}
                  </h2>
                  <Badge variant="secondary">
                    {courses?.length || 0} course{(courses?.length || 0) !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {courses?.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No courses available yet. Check back soon!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses?.map((course) => {
                      const isEnrolled = enrolledCourseIds.includes(course.id);
                      const enrollment = enrollments?.find(e => e.course_id === course.id);
                      
                      return (
                        <motion.div
                          key={course.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ y: -2 }}
                        >
                          <Card className={cn(
                            "relative overflow-hidden transition-all",
                            isEnrolled && "ring-2 ring-primary/30",
                            selectedCourseId === course.id && "ring-2 ring-primary"
                          )}>
                            {isEnrolled && (
                              <div className="absolute top-3 right-3">
                                <Badge className="bg-primary/20 text-primary border-primary/30">
                                  <CheckCircle2 size={12} className="mr-1" />
                                  Enrolled
                                </Badge>
                              </div>
                            )}
                            
                            <CardHeader className="pb-2">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                                  <BookOpen className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-lg truncate">{course.name}</CardTitle>
                                  <Badge variant="outline" className="mt-1">{course.code}</Badge>
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="space-y-4">
                              {course.description && (
                                <CardDescription className="line-clamp-2">
                                  {course.description}
                                </CardDescription>
                              )}
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {course.start_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    <span>{format(new Date(course.start_date), 'MMM d, yyyy')}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Clock size={14} />
                                  <span>Self-paced</span>
                                </div>
                              </div>
                              
                              {isEnrolled ? (
                                <Button 
                                  className="w-full"
                                  variant={selectedCourseId === course.id ? "secondary" : "default"}
                                  onClick={() => setSelectedCourseId(
                                    selectedCourseId === course.id ? null : course.id
                                  )}
                                >
                                  {selectedCourseId === course.id ? 'Viewing Lessons' : 'View Lessons'}
                                  <ChevronRight size={16} className="ml-1" />
                                </Button>
                              ) : (
                                <Button 
                                  className="w-full gradient-primary text-primary-foreground"
                                  onClick={() => handleEnroll(course)}
                                  disabled={enrollInCourse.isPending}
                                >
                                  {enrollInCourse.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : null}
                                  Enroll Now
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.section>

              {/* Lessons */}
              <AnimatePresence mode="wait">
                {(selectedCourseId || firstEnrolledCourse) && (
                  <motion.section
                    key={selectedCourseId || firstEnrolledCourse?.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-display font-semibold text-foreground">
                        {courses?.find(c => c.id === (selectedCourseId || firstEnrolledCourse?.id))?.code} Lessons
                      </h2>
                      <Badge variant="secondary">
                        {lessons?.length || 0} lesson{(lessons?.length || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {lessonsLoading ? (
                      <Card>
                        <CardContent className="py-8 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </CardContent>
                      </Card>
                    ) : lessons?.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center">
                          <p className="text-muted-foreground">
                            No lessons in this course yet.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {lessons?.map((lesson) => (
                          <LessonItem
                            key={lesson.id}
                            index={lesson.order_index}
                            name={lesson.lesson_name}
                            categories={Object.entries(lesson.categories || {}).map(([name, items]) => ({
                              name,
                              count: (items as any[]).length
                            }))}
                            deadline={lesson.deadline_date ? format(new Date(lesson.deadline_date), 'MMM d') : undefined}
                            status="available"
                            onClick={() => {
                              setSelectedLesson(lesson);
                              const cats = Object.keys(lesson.categories || {});
                              if (cats.length > 0) setActiveCategory(cats[0]);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            {/* Practice Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {selectedLesson ? selectedLesson.lesson_name : 'Quick Practice'}
                  </CardTitle>
                  {selectedLesson && (
                    <CardDescription>
                      {Object.keys(selectedLesson.categories || {}).length} categories
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent>
                  {selectedLesson ? (
                    <>
                      <CategoryTabs
                        categories={lessonCategories}
                        activeCategory={activeCategory.toLowerCase()}
                        onSelect={(cat) => {
                          const originalCat = Object.keys(selectedLesson.categories || {}).find(
                            k => k.toLowerCase() === cat
                          );
                          if (originalCat) setActiveCategory(originalCat);
                        }}
                      />
                      <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                        {practiceItemsWithMastery.slice(0, 5).map((item: any, i: number) => (
                          <PracticeItemCard
                            key={i}
                            english={item.English}
                            vietnamese={item.Vietnamese}
                            mastered={item.mastered}
                            onClick={() => setIsPracticeOpen(true)}
                            onListen={() => tts.speak(item.English)}
                          />
                        ))}
                      </div>
                      <Button 
                        className="w-full mt-4 gradient-primary text-primary-foreground"
                        onClick={() => setIsPracticeOpen(true)}
                      >
                        <Mic size={18} className="mr-2" />
                        Start Practice Session
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Mic className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground mb-2">
                        Select a lesson to start practicing
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enrolledCourseIds.length === 0 
                          ? 'Enroll in a course first' 
                          : 'Click on any lesson to see practice items'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Enrollment Confirmation Dialog */}
      <Dialog open={!!enrollDialogCourse} onOpenChange={() => setEnrollDialogCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll in {enrollDialogCourse?.name}?</DialogTitle>
            <DialogDescription>
              You're about to enroll in <strong>{enrollDialogCourse?.code}</strong>. 
              This will give you access to all lessons and practice materials in this course.
            </DialogDescription>
          </DialogHeader>
          
          {enrollDialogCourse?.description && (
            <div className="py-4 border-y border-border">
              <p className="text-sm text-muted-foreground">{enrollDialogCourse.description}</p>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEnrollDialogCourse(null)}>
              Cancel
            </Button>
            <Button onClick={confirmEnroll} disabled={enrollInCourse.isPending}>
              {enrollInCourse.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirm Enrollment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedLesson && (
        <PracticeModal
          isOpen={isPracticeOpen}
          onClose={() => setIsPracticeOpen(false)}
          lessonId={selectedLesson.id}
          lessonName={selectedLesson.lesson_name}
          category={activeCategory}
          items={practiceItemsWithMastery.map((item: any) => ({
            english: item.English,
            vietnamese: item.Vietnamese,
            mastered: item.mastered
          }))}
        />
      )}
    </div>
  );
};

// Helper function
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default Courses;
