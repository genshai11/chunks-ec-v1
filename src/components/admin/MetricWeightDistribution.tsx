import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { MetricSetting } from "@/hooks/useMetricSettings";

interface MetricWeightDistributionProps {
  metrics: MetricSetting[];
  metricLabels: Record<string, { name: string; color: string }>;
}

export function MetricWeightDistribution({ metrics, metricLabels }: MetricWeightDistributionProps) {
  const enabledMetrics = metrics.filter((m) => m.enabled);
  const totalWeight = enabledMetrics.reduce((sum, m) => sum + m.weight, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Weight Distribution</CardTitle>
        <CardDescription>Visual allocation of active metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Total Weight</span>
          <span className={`text-lg font-bold ${totalWeight === 100 ? "text-green-600" : "text-orange-600"}`}>
            {totalWeight}%
          </span>
        </div>
        <div className="h-6 bg-secondary rounded-full overflow-hidden flex">
          {enabledMetrics.map((metric) => {
            const label = metricLabels[metric.metric_id];
            return (
              <div
                key={metric.metric_id}
                className={`${label?.color ?? "bg-gray-500"} flex items-center justify-center text-xs text-white font-medium`}
                style={{ width: `${metric.weight}%` }}
                title={`${label?.name}: ${metric.weight}%`}
              >
                {metric.weight >= 10 ? `${metric.weight}%` : ""}
              </div>
            );
          })}
        </div>
        {totalWeight !== 100 && (
          <div className="mt-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-orange-600">Weights should total 100%. Use Rebalance to auto-fix.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

