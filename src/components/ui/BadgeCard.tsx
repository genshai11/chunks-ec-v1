import { motion } from 'framer-motion';
import { 
  Trophy, Star, Target, Flame, Book, Coins, Gem, 
  Zap, Moon, Sunrise, Medal, GraduationCap, BookOpen,
  Footprints, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/hooks/useBadges';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconComponents: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  target: Target,
  flame: Flame,
  fire: Flame,
  book: Book,
  coins: Coins,
  gem: Gem,
  zap: Zap,
  moon: Moon,
  sunrise: Sunrise,
  medal: Medal,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  footprints: Footprints,
};

const rarityStyles: Record<string, { bg: string; border: string; glow: string }> = {
  common: {
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
    glow: ''
  },
  uncommon: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    glow: 'shadow-green-500/20'
  },
  rare: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/30 shadow-lg'
  },
  epic: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/40 shadow-xl'
  }
};

const rarityTextColors: Record<string, string> = {
  common: 'text-zinc-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400'
};

interface BadgeCardProps {
  badge: Badge;
  earned?: boolean;
  earnedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const BadgeCard = ({ 
  badge, 
  earned = false, 
  earnedAt,
  size = 'md',
  showDetails = true 
}: BadgeCardProps) => {
  const IconComponent = iconComponents[badge.icon] || Trophy;
  const styles = rarityStyles[badge.rarity] || rarityStyles.common;
  const textColor = rarityTextColors[badge.rarity] || rarityTextColors.common;

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 36
  };

  const badgeElement = (
    <motion.div
      whileHover={earned ? { scale: 1.05 } : undefined}
      className={cn(
        "relative rounded-xl border-2 flex flex-col items-center justify-center transition-all",
        sizeClasses[size],
        earned ? styles.bg : 'bg-muted/30',
        earned ? styles.border : 'border-muted/50',
        earned && styles.glow,
        !earned && 'opacity-40 grayscale'
      )}
    >
      {earned ? (
        <IconComponent 
          size={iconSizes[size]} 
          className={textColor}
        />
      ) : (
        <Lock 
          size={iconSizes[size] * 0.7} 
          className="text-muted-foreground"
        />
      )}
      
      {earned && badge.rarity === 'epic' && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 via-transparent to-purple-500/20"
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.div>
  );

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeElement}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <div className={cn("font-semibold", textColor)}>{badge.name}</div>
              <div className="text-xs text-muted-foreground">{badge.description}</div>
              {earned && earnedAt && (
                <div className="text-xs text-muted-foreground">
                  Earned: {new Date(earnedAt).toLocaleDateString()}
                </div>
              )}
              {!earned && (
                <div className="text-xs text-muted-foreground italic">
                  Not yet earned
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border flex items-center gap-4",
        earned ? styles.bg : 'bg-muted/20',
        earned ? styles.border : 'border-muted/30',
        earned && styles.glow
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center",
        earned ? styles.bg : 'bg-muted/30',
        earned ? styles.border : 'border-muted/50',
        'border'
      )}>
        {earned ? (
          <IconComponent size={28} className={textColor} />
        ) : (
          <Lock size={20} className="text-muted-foreground" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("font-semibold truncate", earned ? textColor : 'text-muted-foreground')}>
            {badge.name}
          </span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full capitalize",
            earned ? styles.bg : 'bg-muted/30',
            earned ? styles.border : 'border-muted/50',
            'border',
            textColor
          )}>
            {badge.rarity}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {badge.description}
        </p>
        {badge.coins_reward > 0 && (
          <div className="text-xs text-amber-400 mt-1">
            +{badge.coins_reward} coins reward
          </div>
        )}
      </div>

      {earned && earnedAt && (
        <div className="text-xs text-muted-foreground text-right">
          {new Date(earnedAt).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  );
};
