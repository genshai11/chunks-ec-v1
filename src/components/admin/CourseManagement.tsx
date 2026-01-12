import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCourses, useCreateCourse, useDeleteCourse, useAllLessons } from '@/hooks/useCourses';
import { useSeedERELCourse } from '@/hooks/useSeedData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  GraduationCap,
  Calendar,
  Users,
  Download
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const CourseManagement: React.FC = () => {
  const { data: courses, isLoading } = useCourses();
  const { data: allLessons } = useAllLessons();
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();
  const seedEREL = useSeedERELCourse();
  
  // Check if EREL lessons already exist
  const erelCourse = courses?.find(c => c.code === 'EREL');
  const erelLessonsExist = erelCourse && allLessons?.some(l => l.course_id === erelCourse.id);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    description: '',
    start_date: '',
    is_active: true
  });

  const handleCreate = async () => {
    await createCourse.mutateAsync({
      code: newCourse.code,
      name: newCourse.name,
      description: newCourse.description || null,
      start_date: newCourse.start_date || null,
      is_active: newCourse.is_active
    });
    setIsCreateOpen(false);
    setNewCourse({ code: '', name: '', description: '', start_date: '', is_active: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Courses</h2>
          <p className="text-muted-foreground">Manage course catalog</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => seedEREL.mutate()}
            disabled={seedEREL.isPending || erelLessonsExist}
          >
            {seedEREL.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {erelLessonsExist ? 'EREL Imported' : 'Import EREL'}
          </Button>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Course
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                Add a new course to the catalog
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Course Code</label>
                <Input
                  placeholder="e.g., ERES"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Course Name</label>
                <Input
                  placeholder="e.g., English Real-Life Elementary"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Course description..."
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={newCourse.start_date}
                  onChange={(e) => setNewCourse({ ...newCourse, start_date: e.target.value })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!newCourse.code || !newCourse.name || createCourse.isPending}
              >
                {createCourse.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create Course
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {courses?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No courses yet. Create your first course to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses?.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {course.code}
                        </span>
                        <CardTitle className="text-lg mt-1">{course.name}</CardTitle>
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Course</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{course.name}"? This will also delete all lessons and enrollments. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCourse.mutate(course.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {course.description && (
                    <CardDescription className="mb-3 line-clamp-2">
                      {course.description}
                    </CardDescription>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {course.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(course.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className={`px-2 py-0.5 rounded text-xs ${
                      course.is_active 
                        ? 'bg-success/10 text-success' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
