import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricSettingsCard } from "@/components/admin/MetricSettingsCard";
import { MetricWeightDistribution } from "@/components/admin/MetricWeightDistribution";
import { useMetricSettings, useUpdateMetricSettings, type MetricSetting } from "@/hooks/useMetricSettings";

const METRIC_LABELS: Record<string, { name: string; description: string; unit: string; color: string }> = {
  volume: { name: "Energy (Volume)", description: "Average loudness in dB", unit: "dB", color: "bg-blue-500" },
  speechRate: { name: "Fluency (Speech Rate)", description: "Words per minute", unit: "WPM", color: "bg-green-500" },
  acceleration: { name: "Dynamics (Acceleration)", description: "Energy increase over time", unit: "%", color: "bg-purple-500" },
  responseTime: { name: "Readiness (Response Time)", description: "Time before speaking", unit: "ms", color: "bg-orange-500" },
  pauseManagement: { name: "Fluidity (Pauses)", description: "Pause quality", unit: "ratio", color: "bg-pink-500" },
};

export default function MetricsTab() {
  const { data, isLoading } = useMetricSettings();
  const saveMutation = useUpdateMetricSettings();

  const [metrics, setMetrics] = useState<MetricSetting[]>([]);
  const [initialMetrics, setInitialMetrics] = useState<MetricSetting[]>([]);

  useEffect(() => {
    if (!data) return;
    setMetrics(data);
    setInitialMetrics(JSON.parse(JSON.stringify(data)));
  }, [data]);

  const totalWeight = useMemo(
    () => metrics.filter((m) => m.enabled).reduce((sum, m) => sum + m.weight, 0),
    [metrics],
  );

  const hasChanges = useMemo(
    () => JSON.stringify(metrics) !== JSON.stringify(initialMetrics),
    [metrics, initialMetrics],
  );

  const rebalance = (input: MetricSetting[]) => {
    const enabled = input.filter((m) => m.enabled);
    if (enabled.length === 0) return input;
    const total = enabled.reduce((sum, m) => sum + m.weight, 0);
    if (total === 100) return input;

    const scaled = input.map((m) => {
      if (!m.enabled) return { ...m, weight: 0 };
      return { ...m, weight: Math.round((m.weight / total) * 100) };
    });
    const diff = 100 - scaled.filter((m) => m.enabled).reduce((sum, m) => sum + m.weight, 0);
    const firstEnabled = scaled.find((m) => m.enabled);
    if (firstEnabled) firstEnabled.weight += diff;
    return scaled;
  };

  const onToggle = (id: MetricSetting["metric_id"], checked: boolean) => {
    setMetrics((prev) => rebalance(prev.map((m) => (m.metric_id === id ? { ...m, enabled: checked, weight: checked ? Math.max(m.weight, 5) : 0 } : m))));
  };
  const onWeightChange = (id: MetricSetting["metric_id"], weight: number) => setMetrics((prev) => prev.map((m) => (m.metric_id === id ? { ...m, weight } : m)));
  const onThresholdChange = (id: MetricSetting["metric_id"], field: "min_threshold" | "ideal_threshold" | "max_threshold", value: number) =>
    setMetrics((prev) => prev.map((m) => (m.metric_id === id ? { ...m, [field]: value } : m)));
  const onMethodChange = (id: MetricSetting["metric_id"], method: string) => setMetrics((prev) => prev.map((m) => (m.metric_id === id ? { ...m, method } : m)));

  const handleReset = () => setMetrics(initialMetrics);
  const handleRebalance = () => setMetrics((prev) => rebalance(prev));
  const handleSave = async () => {
    const balanced = rebalance(metrics);
    setMetrics(balanced);
    await saveMutation.mutateAsync(balanced);
    setInitialMetrics(JSON.parse(JSON.stringify(balanced)));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Reused metrics admin module with project-compatible scoring backend.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRebalance} disabled={totalWeight === 100}>
            Rebalance
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending || !hasChanges}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <MetricWeightDistribution metrics={metrics} metricLabels={METRIC_LABELS} />

      <div className="grid gap-4 md:grid-cols-2">
        {metrics.map((metric) => (
          <MetricSettingsCard
            key={metric.metric_id}
            metric={metric}
            label={METRIC_LABELS[metric.metric_id]}
            onToggle={onToggle}
            onWeightChange={onWeightChange}
            onThresholdChange={onThresholdChange}
            onMethodChange={onMethodChange}
          />
        ))}
      </div>
    </div>
  );
}

