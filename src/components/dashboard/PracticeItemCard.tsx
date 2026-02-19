import { motion } from "framer-motion";
import { Check, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PracticeItemCardProps {
  english: string;
  vietnamese: string;
  mastered?: boolean;
  score?: number;
  onClick?: () => void;
  onListen?: () => void;
}

export const PracticeItemCard = ({
  english,
  vietnamese,
  mastered,
  score,
  onClick,
  onListen,
}: PracticeItemCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "group p-4 rounded-xl border cursor-pointer transition-all duration-200",
        mastered
          ? "bg-success/5 border-success/20 hover:border-success/40"
          : "bg-card border-border/50 hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-1 line-clamp-1">
            {vietnamese}
          </p>
          <p className="font-medium text-foreground line-clamp-2">
            {english}
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {score !== undefined && (
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              score >= 70 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}>
              {score}%
            </span>
          )}
          
          {mastered ? (
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <Check size={16} className="text-success" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={14} className="text-primary ml-0.5" />
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onListen?.();
            }}
            className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <Volume2 size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
