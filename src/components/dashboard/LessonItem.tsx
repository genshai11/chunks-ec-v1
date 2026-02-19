import { motion } from "framer-motion";
import { Check, Lock, Play, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonItemProps {
  index: number;
  name: string;
  categories: { name: string; count: number }[];
  deadline?: string;
  status: "locked" | "available" | "in-progress" | "completed";
  score?: number;
  onClick?: () => void;
}

export const LessonItem = ({
  index,
  name,
  categories,
  deadline,
  status,
  score,
  onClick,
}: LessonItemProps) => {
  const statusConfig = {
    locked: {
      icon: Lock,
      bg: "bg-muted/30",
      border: "border-muted/20",
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
    },
    available: {
      icon: Play,
      bg: "bg-card hover:bg-card-elevated",
      border: "border-border/50 hover:border-primary/30",
      iconBg: "gradient-primary",
      iconColor: "text-primary-foreground",
    },
    "in-progress": {
      icon: Play,
      bg: "bg-primary/5",
      border: "border-primary/30",
      iconBg: "gradient-primary glow-primary",
      iconColor: "text-primary-foreground",
    },
    completed: {
      icon: Check,
      bg: "bg-success/5",
      border: "border-success/30",
      iconBg: "bg-success",
      iconColor: "text-success-foreground",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isClickable = status !== "locked";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={isClickable ? { x: 4 } : {}}
      onClick={isClickable ? onClick : undefined}
      className={cn(
        "p-4 rounded-xl border transition-all duration-200",
        config.bg,
        config.border,
        isClickable && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Index & Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          config.iconBg
        )}>
          <Icon size={20} className={config.iconColor} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">Day {index}</span>
            {status === "completed" && score && (
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                {score}%
              </span>
            )}
          </div>
          <h4 className={cn(
            "font-medium truncate",
            status === "locked" ? "text-muted-foreground" : "text-foreground"
          )}>
            {name}
          </h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {categories.slice(0, 3).map((cat, i) => (
              <span 
                key={i} 
                className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded"
              >
                {cat.name}: {cat.count}
              </span>
            ))}
          </div>
        </div>

        {/* Deadline */}
        {deadline && status !== "completed" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Clock size={12} />
            <span>{deadline}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
