import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse, useAllLessons } from '@/hooks/useCourses';
import { useSeedERELCourse } from '@/hooks/useSeedData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatScheduleDays } from '@/lib/scheduleUtils';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  GraduationCap,
  Calendar,
  Edit,
  Download,
  Clock
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

const WEEKDAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

interface CourseFormData {
  code: string;
  name: string;
  description: string;
  start_date: string;
  schedule_days: string[];
  is_active: boolean;
}

const emptyForm: CourseFormData = {
  code: '',
  name: '',
  description: '',
  start_date: '',
  schedule_days: ['monday', 'wednesday', 'friday'],
  is_active: true
};

const CourseManagement: React.FC = () => {
  const { data: courses, isLoading } = useCourses();
  const { data: allLessons } = useAllLessons();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const seedEREL = useSeedERELCourse();
  
  const erelCourse = courses?.find(c => c.code === 'EREL');
  const erelLessonsExist = erelCourse && allLessons?.some(l => l.course_id === erelCourse.id);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [formData, setFormData] = useState<CourseFormData>(emptyForm);

  const handleCreate = async () => {
    await createCourse.mutateAsync({
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      start_date: formData.start_date || null,
      schedule_days: formData.schedule_days,
      is_active: formData.is_active
    });
    setIsCreateOpen(false);
    setFormData(emptyForm);
  };

  const handleUpdate = async () => {
    if (!editingCourse) return;
    await updateCourse.mutateAsync({
      id: editingCourse,
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      start_date: formData.start_date || null,
      schedule_days: formData.schedule_days,
      is_active: formData.is_active
    });
    setEditingCourse(null);
    setFormData(emptyForm);
  };

  const openEditDialog = (course: { id: string; code: string; name: string; description?: string | null; start_date?: string | null; schedule_days?: string[] | null; is_active: boolean }) => {
    setFormData({
      code: course.code,
      name: course.name,
      description: course.description || '',
      start_date: course.start_date || '',
      schedule_days: course.schedule_days || ['monday', 'wednesday', 'friday'],
      is_active: course.is_active
    });
    setEditingCourse(course.id);
  };

  const toggleScheduleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const CourseForm = ({ onSubmit, isLoading: formLoading, submitLabel }: { onSubmit: () => void; isLoading: boolean; submitLabel: string }) => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Course Code *</Label>
          <Input
            placeholder="e.g., EREL"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Course Name *</Label>
        <Input
          placeholder="e.g., English Real-Life Elementary"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Course description..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Schedule Days
        </Label>
        <p className="text-xs text-muted-foreground">
          Select days when lessons are scheduled. Used to calculate deadlines.
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map(day => (
            <Button
              key={day.id}
              type="button"
              size="sm"
              variant={formData.schedule_days.includes(day.id) ? "default" : "outline"}
              onClick={() => toggleScheduleDay(day.id)}
              className="w-12"
            >
              {day.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-3 pt-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Course Active</Label>
      </div>
      
      <DialogFooter className="pt-4">
        <Button 
          variant="outline" 
          onClick={() => {
            setIsCreateOpen(false);
            setEditingCourse(null);
            setFormData(emptyForm);
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={!formData.code || !formData.name || formLoading}
        >
          {formLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold">Courses</h2>
          <p className="text-muted-foreground">Manage course catalog & schedules</p>
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
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setFormData(emptyForm);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>
                  Add a new course with schedule settings
                </DialogDescription>
              </DialogHeader>
              <CourseForm 
                onSubmit={handleCreate} 
                isLoading={createCourse.isPending}
                submitLabel="Create Course"
              />
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
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(course)}
                      >
                        <Edit className="w-4 h-4 text-primary" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{course.name}"? This will also delete all lessons and enrollments.
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
                  </div>
                </CardHeader>
                
                <CardContent>
                  {course.description && (
                    <CardDescription className="mb-3 line-clamp-2">
                      {course.description}
                    </CardDescription>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {course.start_date && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(course.start_date).toLocaleDateString()}
                        </Badge>
                      )}
                      <Badge variant={course.is_active ? "default" : "secondary"} className="text-xs">
                        {course.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    {course.schedule_days && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatScheduleDays(course.schedule_days)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCourse} onOpenChange={(open) => {
        if (!open) {
          setEditingCourse(null);
          setFormData(emptyForm);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details and schedule
            </DialogDescription>
          </DialogHeader>
          <CourseForm 
            onSubmit={handleUpdate} 
            isLoading={updateCourse.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseManagement;
