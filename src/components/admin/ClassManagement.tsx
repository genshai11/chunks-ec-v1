import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  useAllCourseClasses, 
  useCreateCourseClass, 
  useUpdateCourseClass, 
  useDeleteCourseClass,
  useClassEnrollments,
  useAddUserToClass,
  useRemoveUserFromClass,
  useAvailableUsers
} from '@/hooks/useCourseClasses';
import { useCourses, useCourseLessons } from '@/hooks/useCourses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateLessonDeadlines, formatScheduleDays } from '@/lib/scheduleUtils';
import { format } from 'date-fns';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Users,
  Calendar,
  Edit,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  UserPlus,
  UserMinus,
  Search
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WEEKDAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

interface ClassFormData {
  course_id: string;
  class_name: string;
  class_code: string;
  start_date: string;
  schedule_days: string[];
  is_active: boolean;
}

const emptyForm: ClassFormData = {
  course_id: '',
  class_name: '',
  class_code: '',
  start_date: '',
  schedule_days: ['monday', 'wednesday', 'friday'],
  is_active: true
};

const ClassManagement: React.FC = () => {
  const { data: courseClasses, isLoading } = useAllCourseClasses();
  const { data: courses } = useCourses();
  const createClass = useCreateCourseClass();
  const updateClass = useUpdateCourseClass();
  const deleteClass = useDeleteCourseClass();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClassFormData>(emptyForm);

  const handleCreate = async () => {
    await createClass.mutateAsync({
      course_id: formData.course_id,
      class_name: formData.class_name,
      class_code: formData.class_code,
      start_date: formData.start_date,
      schedule_days: formData.schedule_days,
      is_active: formData.is_active
    });
    setIsCreateOpen(false);
    setFormData(emptyForm);
  };

  const handleUpdate = async () => {
    if (!editingClass) return;
    await updateClass.mutateAsync({
      id: editingClass,
      course_id: formData.course_id,
      class_name: formData.class_name,
      class_code: formData.class_code,
      start_date: formData.start_date,
      schedule_days: formData.schedule_days,
      is_active: formData.is_active
    });
    setEditingClass(null);
    setFormData(emptyForm);
  };

  const openEditDialog = (cls: any) => {
    setFormData({
      course_id: cls.course_id,
      class_name: cls.class_name,
      class_code: cls.class_code,
      start_date: cls.start_date,
      schedule_days: cls.schedule_days || ['monday', 'wednesday', 'friday'],
      is_active: cls.is_active
    });
    setEditingClass(cls.id);
  };

  const toggleScheduleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  // Auto-generate class code from course code and date
  const generateClassCode = (courseId: string, startDate: string) => {
    const course = courses?.find(c => c.id === courseId);
    if (course && startDate) {
      const date = new Date(startDate);
      return `${course.code}-${format(date, 'yyyy-MM')}`;
    }
    return '';
  };

  const handleCourseSelect = (courseId: string) => {
    const code = generateClassCode(courseId, formData.start_date);
    const course = courses?.find(c => c.id === courseId);
    setFormData(prev => ({
      ...prev,
      course_id: courseId,
      class_code: code || prev.class_code,
      class_name: course?.name ? `${course.name} Class` : prev.class_name
    }));
  };

  const handleDateChange = (date: string) => {
    const code = generateClassCode(formData.course_id, date);
    setFormData(prev => ({
      ...prev,
      start_date: date,
      class_code: code || prev.class_code
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const ClassForm = ({ onSubmit, isLoading: formLoading, submitLabel }: { onSubmit: () => void; isLoading: boolean; submitLabel: string }) => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Course *</Label>
        <Select value={formData.course_id} onValueChange={handleCourseSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a course template" />
          </SelectTrigger>
          <SelectContent>
            {courses?.map(course => (
              <SelectItem key={course.id} value={course.id}>
                <span className="font-medium">{course.code}</span> - {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Class Code *</Label>
          <Input
            placeholder="e.g., EREL-2026-01"
            value={formData.class_code}
            onChange={(e) => setFormData({ ...formData, class_code: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Class Name *</Label>
        <Input
          placeholder="e.g., EREL Listening - Jan 2026"
          value={formData.class_name}
          onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
        />
      </div>
      
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Schedule Days
        </Label>
        <p className="text-xs text-muted-foreground">
          Select days when lessons are scheduled. Deadlines will be calculated based on this.
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
        <Label htmlFor="is_active">Class Active</Label>
      </div>
      
      <DialogFooter className="pt-4">
        <Button 
          variant="outline" 
          onClick={() => {
            setIsCreateOpen(false);
            setEditingClass(null);
            setFormData(emptyForm);
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={!formData.course_id || !formData.class_code || !formData.class_name || !formData.start_date || formLoading}
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
          <h2 className="text-2xl font-display font-bold">Classes</h2>
          <p className="text-muted-foreground">Manage class instances, learners & schedules</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setFormData(emptyForm);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
              <DialogDescription>
                Create a class instance from a course template with specific schedule
              </DialogDescription>
            </DialogHeader>
            <ClassForm 
              onSubmit={handleCreate} 
              isLoading={createClass.isPending}
              submitLabel="Create Class"
            />
          </DialogContent>
        </Dialog>
      </div>

      {(!courseClasses || courseClasses.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No classes yet. Create a class to start enrolling learners.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              A class is an instance of a course with specific start date and schedule.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {courseClasses?.map((cls, index) => (
            <ClassCard 
              key={cls.id}
              cls={cls}
              index={index}
              isExpanded={expandedClass === cls.id}
              onToggleExpand={() => setExpandedClass(expandedClass === cls.id ? null : cls.id)}
              onEdit={() => openEditDialog(cls)}
              onDelete={() => deleteClass.mutate(cls.id)}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingClass} onOpenChange={(open) => {
        if (!open) {
          setEditingClass(null);
          setFormData(emptyForm);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update class details and schedule
            </DialogDescription>
          </DialogHeader>
          <ClassForm 
            onSubmit={handleUpdate} 
            isLoading={updateClass.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Separate component for class card with learner management
const ClassCard: React.FC<{
  cls: any;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ cls, index, isExpanded, onToggleExpand, onEdit, onDelete }) => {
  const { data: lessons } = useCourseLessons(cls.course_id);
  const { data: enrollments, isLoading: enrollmentsLoading } = useClassEnrollments(cls.id);
  const { data: allUsers } = useAvailableUsers();
  const addUser = useAddUserToClass();
  const removeUser = useRemoveUserFromClass();
  
  // Get learner count
  const learnerCount = enrollments?.length || 0;
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  
  // Calculate deadlines for this class
  const lessonDeadlines = lessons && cls.start_date
    ? calculateLessonDeadlines(
        cls.start_date,
        cls.schedule_days || ['monday', 'wednesday', 'friday'],
        lessons.map(l => ({ id: l.id, lesson_name: l.lesson_name, order_index: l.order_index }))
      )
    : [];

  // Filter users not already enrolled
  const enrolledUserIds = new Set(enrollments?.map(e => (e.profiles as any)?.id) || []);
  const availableUsers = allUsers?.filter(u => !enrolledUserIds.has(u.id)) || [];
  const filteredUsers = availableUsers.filter(u => 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!selectedUserId) return;
    await addUser.mutateAsync({
      userId: selectedUserId,
      classId: cls.id,
      courseId: cls.course_id
    });
    setIsAddUserOpen(false);
    setSelectedUserId('');
    setUserSearch('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group hover:border-primary/50 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded">
                      {cls.class_code}
                    </span>
                    {cls.courses && (
                      <Badge variant="outline" className="text-xs">
                        {cls.courses.code}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Users className="w-3 h-3" />
                      {(cls as any).learner_count ?? learnerCount}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-1">{cls.class_name}</CardTitle>
                </div>
              </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onEdit}
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
                    <AlertDialogTitle>Delete Class</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{cls.class_name}"? This will remove all learner enrollments.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
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
        
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              Starts: {format(new Date(cls.start_date), 'MMM d, yyyy')}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="w-3 h-3" />
              {formatScheduleDays(cls.schedule_days)}
            </Badge>
            <Badge variant={cls.is_active ? "default" : "secondary"} className="text-xs">
              {cls.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          {/* Collapsible content with tabs */}
          <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {((cls as any).learner_count ?? learnerCount)} Learners • {lessons?.length || 0} Lessons
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Tabs defaultValue="learners" className="mt-3">
                <TabsList className="w-full">
                  <TabsTrigger value="learners" className="flex-1 gap-2">
                    <Users className="w-4 h-4" />
                    Learners
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="flex-1 gap-2">
                    <BookOpen className="w-4 h-4" />
                    Schedule
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="learners" className="mt-3 space-y-3">
                  {/* Add User Button */}
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <UserPlus className="w-4 h-4" />
                        Add Learner
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Learner to Class</DialogTitle>
                        <DialogDescription>
                          Search and select a user to add to {cls.class_name}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name or email..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {filteredUsers.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-4">
                              {availableUsers.length === 0 ? 'All users are already enrolled' : 'No users found'}
                            </p>
                          ) : (
                            filteredUsers.slice(0, 10).map(user => (
                              <div
                                key={user.id}
                                onClick={() => setSelectedUserId(user.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                  selectedUserId === user.id 
                                    ? 'bg-primary/10 border border-primary/30' 
                                    : 'bg-secondary/30 hover:bg-secondary/50'
                                }`}
                              >
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {user.display_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{user.display_name || 'No name'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddUser}
                          disabled={!selectedUserId || addUser.isPending}
                        >
                          {addUser.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Add to Class
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Enrolled Users List */}
                  {enrollmentsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : !enrollments || enrollments.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No learners enrolled yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {enrollments.map((enrollment: any) => (
                        <div 
                          key={enrollment.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={enrollment.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {enrollment.profiles?.display_name?.[0]?.toUpperCase() || enrollment.profiles?.email?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{enrollment.profiles?.display_name || 'No name'}</p>
                              <p className="text-xs text-muted-foreground">{enrollment.profiles?.email}</p>
                            </div>
                          </div>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <UserMinus className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Learner</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove {enrollment.profiles?.display_name || enrollment.profiles?.email} from this class?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeUser.mutate(enrollment.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="schedule" className="mt-3">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {lessonDeadlines.map((ld, i) => (
                      <div 
                        key={ld.lessonId}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {ld.orderIndex}
                          </span>
                          <span className="truncate max-w-[200px]">{ld.lessonName}</span>
                        </div>
                        <Badge 
                          variant={ld.isPast ? "destructive" : ld.isToday ? "default" : "outline"}
                          className="text-xs shrink-0"
                        >
                          {ld.deadlineFormatted}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ClassManagement;
