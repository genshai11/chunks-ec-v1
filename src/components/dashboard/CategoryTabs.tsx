import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  count: number;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export const CategoryTabs = ({ categories, activeCategory, onSelect }: CategoryTabsProps) => {
  return (
    <div className="flex items-center gap-2 p-1 bg-secondary/30 rounded-xl overflow-x-auto">
      {categories.map((category) => (
        <motion.button
          key={category.id}
          onClick={() => onSelect(category.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
            activeCategory === category.id
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {activeCategory === category.id && (
            <motion.div
              layoutId="activeCategory"
              className="absolute inset-0 gradient-primary rounded-lg"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {category.name}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              activeCategory === category.id
                ? "bg-primary-foreground/20"
                : "bg-secondary"
            )}>
              {category.count}
            </span>
          </span>
        </motion.button>
      ))}
    </div>
  );
};
