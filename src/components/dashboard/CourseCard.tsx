import { motion } from "framer-motion";
import { BookOpen, Clock, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CourseCardProps {
  code: string;
  name: string;
  description: string;
  lessonsCount: number;
  studentsCount: number;
  progress?: number;
  deadline?: string;
  enrolled?: boolean;
  onEnroll?: () => void;
  onContinue?: () => void;
}

export const CourseCard = ({
  code,
  name,
  description,
  lessonsCount,
  studentsCount,
  progress,
  deadline,
  enrolled,
  onEnroll,
  onContinue,
}: CourseCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <BookOpen size={24} className="text-primary-foreground" />
          </div>
          <div>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {code}
            </span>
            <h3 className="text-lg font-display font-semibold text-foreground mt-1">
              {name}
            </h3>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {description}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <BookOpen size={14} />
          <span>{lessonsCount} lessons</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={14} />
          <span>{studentsCount} students</span>
        </div>
        {deadline && (
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>{deadline}</span>
          </div>
        )}
      </div>

      {/* Progress or Enroll */}
      {enrolled ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <Button 
            onClick={onContinue}
            className="w-full mt-2 group/btn"
            variant="default"
          >
            Continue Learning
            <ChevronRight size={16} className="ml-1 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      ) : (
        <Button 
          onClick={onEnroll}
          className="w-full gradient-primary text-primary-foreground hover:opacity-90"
        >
          Enroll Now
        </Button>
      )}
    </motion.div>
  );
};
