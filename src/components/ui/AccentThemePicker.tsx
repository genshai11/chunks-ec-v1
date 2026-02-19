import { cn } from "@/lib/utils";
import { AccentTheme, useAccentTheme } from "@/hooks/useAccentTheme";

const options: Array<{ id: AccentTheme; label: string; swatch: string }> = [
  { id: "blue", label: "Blue", swatch: "bg-blue-500" },
  { id: "red", label: "Red", swatch: "bg-rose-500" },
  { id: "lime", label: "Lime", swatch: "bg-lime-500" },
];

export function AccentThemePicker() {
  const { accentTheme, setAccentTheme } = useAccentTheme();

  return (
    <div className="flex items-center gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-label={`Use ${option.label} theme`}
          onClick={() => setAccentTheme(option.id)}
          className={cn(
            "h-6 w-6 rounded-full border-2 transition-all",
            option.swatch,
            accentTheme === option.id ? "border-foreground scale-110" : "border-transparent opacity-70 hover:opacity-100"
          )}
        />
      ))}
    </div>
  );
}

