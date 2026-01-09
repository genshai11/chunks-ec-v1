import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCourses, useAllLessons, useCreateLesson, useDeleteLesson, useUpdateLessonDeadline } from '@/hooks/useCourses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  BookOpen,
  Calendar,
  Upload,
  FileJson
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const LessonManagement: React.FC = () => {
  const { data: courses } = useCourses();
  const { data: lessons, isLoading } = useAllLessons();
  const createLesson = useCreateLesson();
  const deleteLesson = useDeleteLesson();
  const updateDeadline = useUpdateLessonDeadline();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [newLesson, setNewLesson] = useState({
    course_id: '',
    lesson_name: '',
    lesson_file: '',
    categories: {},
    order_index: 0,
    deadline_date: ''
  });
  const [jsonInput, setJsonInput] = useState('');

  const handleJsonPaste = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setNewLesson({
        ...newLesson,
        lesson_name: parsed.lesson_name || '',
        categories: parsed.categories || {}
      });
      toast.success('JSON parsed successfully');
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  const handleCreate = async () => {
    await createLesson.mutateAsync({
      course_id: newLesson.course_id,
      lesson_name: newLesson.lesson_name,
      lesson_file: newLesson.lesson_file || null,
      categories: newLesson.categories,
      order_index: newLesson.order_index,
      deadline_date: newLesson.deadline_date || null
    });
    setIsCreateOpen(false);
    setNewLesson({
      course_id: '',
      lesson_name: '',
      lesson_file: '',
      categories: {},
      order_index: 0,
      deadline_date: ''
    });
    setJsonInput('');
  };

  const filteredLessons = selectedCourse 
    ? lessons?.filter(l => l.course_id === selectedCourse)
    : lessons;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Lessons</h2>
          <p className="text-muted-foreground">Manage lesson content and deadlines</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedCourse || "all"} onValueChange={(v) => setSelectedCourse(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses?.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Import Lesson
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import New Lesson</DialogTitle>
                <DialogDescription>
                  Paste lesson JSON or enter details manually
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Course</label>
                  <Select 
                    value={newLesson.course_id} 
                    onValueChange={(v) => setNewLesson({ ...newLesson, course_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    Paste Lesson JSON
                  </label>
                  <Textarea
                    placeholder='{"lesson_name": "D1 - Food Tour", "categories": {...}}'
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="font-mono text-xs h-32"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleJsonPaste}
                    disabled={!jsonInput}
                  >
                    Parse JSON
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lesson Name</label>
                    <Input
                      placeholder="e.g., D1 - Food Tour"
                      value={newLesson.lesson_name}
                      onChange={(e) => setNewLesson({ ...newLesson, lesson_name: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Order Index</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newLesson.order_index}
                      onChange={(e) => setNewLesson({ ...newLesson, order_index: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deadline</label>
                  <Input
                    type="date"
                    value={newLesson.deadline_date}
                    onChange={(e) => setNewLesson({ ...newLesson, deadline_date: e.target.value })}
                  />
                </div>

                {Object.keys(newLesson.categories).length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Parsed Categories:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(newLesson.categories).map(([cat, items]) => (
                        <span key={cat} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {cat}: {(items as any[]).length} items
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={!newLesson.course_id || !newLesson.lesson_name || createLesson.isPending}
                >
                  {createLesson.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Import Lesson
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredLessons?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No lessons found. Import your first lesson to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLessons?.map((lesson, index) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="group hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {(lesson as any).courses?.code || 'No course'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          #{lesson.order_index}
                        </span>
                      </div>
                      <h3 className="font-medium">{lesson.lesson_name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {Object.entries(lesson.categories || {}).map(([cat, items]) => (
                          <span key={cat}>
                            {cat}: {(items as any[]).length}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={lesson.deadline_date || ''}
                        onChange={(e) => updateDeadline.mutate({ 
                          lessonId: lesson.id, 
                          deadline: e.target.value || null 
                        })}
                        className="w-[140px] h-8 text-sm"
                      />
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
                          <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{lesson.lesson_name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteLesson.mutate(lesson.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

export default LessonManagement;
