import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "primary" | "accent" | "success";
}

export const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default" 
}: StatsCardProps) => {
  const variants = {
    default: {
      bg: "bg-card",
      iconBg: "bg-secondary",
      iconColor: "text-foreground",
    },
    primary: {
      bg: "bg-primary/10 border-primary/20",
      iconBg: "gradient-primary glow-primary",
      iconColor: "text-primary-foreground",
    },
    accent: {
      bg: "bg-accent/10 border-accent/20",
      iconBg: "gradient-gold glow-gold",
      iconColor: "text-accent-foreground",
    },
    success: {
      bg: "bg-success/10 border-success/20",
      iconBg: "bg-success",
      iconColor: "text-success-foreground",
    },
  };

  const style = variants[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "p-6 rounded-2xl border border-border/50 backdrop-blur-sm transition-all duration-300",
        style.bg
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", style.iconBg)}>
          <Icon size={24} className={style.iconColor} />
        </div>
        {trend && (
          <span className={cn(
            "text-sm font-medium px-2 py-1 rounded-full",
            trend.value >= 0 
              ? "bg-success/10 text-success" 
              : "bg-destructive/10 text-destructive"
          )}>
            {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <h3 className="text-sm text-muted-foreground mb-1">{title}</h3>
      <p className="text-3xl font-display font-bold text-foreground">{value}</p>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
};
