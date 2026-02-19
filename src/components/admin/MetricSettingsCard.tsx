import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MetricSetting } from "@/hooks/useMetricSettings";

interface MetricSettingsCardProps {
  metric: MetricSetting;
  label: { name: string; description: string; unit: string; color: string };
  onToggle: (id: MetricSetting["metric_id"], checked: boolean) => void;
  onWeightChange: (id: MetricSetting["metric_id"], weight: number) => void;
  onThresholdChange: (id: MetricSetting["metric_id"], field: "min_threshold" | "ideal_threshold" | "max_threshold", value: number) => void;
  onMethodChange: (id: MetricSetting["metric_id"], method: string) => void;
}

export function MetricSettingsCard({
  metric,
  label,
  onToggle,
  onWeightChange,
  onThresholdChange,
  onMethodChange,
}: MetricSettingsCardProps) {
  return (
    <Card className={`transition-all ${!metric.enabled ? "opacity-70" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Switch
              id={`toggle-${metric.metric_id}`}
              checked={metric.enabled}
              onCheckedChange={(checked) => onToggle(metric.metric_id, checked)}
            />
            <div>
              <CardTitle className="text-base">{label.name}</CardTitle>
              <CardDescription className="text-xs">{label.description}</CardDescription>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${label.color}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <Label>Impact Weight</Label>
            <span className="font-mono font-medium">{metric.weight}%</span>
          </div>
          <Slider
            value={[metric.weight]}
            onValueChange={([v]) => onWeightChange(metric.metric_id, v)}
            min={0}
            max={100}
            step={5}
            disabled={!metric.enabled}
          />
        </div>

        {metric.enabled && (
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Thresholds</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  value={metric.min_threshold}
                  onChange={(e) => onThresholdChange(metric.metric_id, "min_threshold", Number(e.target.value) || 0)}
                  className="h-7 text-xs px-2"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Ideal</Label>
                <Input
                  type="number"
                  value={metric.ideal_threshold}
                  onChange={(e) => onThresholdChange(metric.metric_id, "ideal_threshold", Number(e.target.value) || 0)}
                  className="h-7 text-xs px-2"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  value={metric.max_threshold}
                  onChange={(e) => onThresholdChange(metric.metric_id, "max_threshold", Number(e.target.value) || 0)}
                  className="h-7 text-xs px-2"
                />
              </div>
            </div>

            {metric.metric_id === "speechRate" && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Detection Method</Label>
                <Select value={metric.method || "energy-peaks"} onValueChange={(val) => onMethodChange(metric.metric_id, val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="energy-peaks">Energy Peaks</SelectItem>
                    <SelectItem value="zero-crossing-rate">Zero Crossing Rate</SelectItem>
                    <SelectItem value="deepgram-stt">Deepgram STT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

