import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MetricId =
  | "volume"
  | "speechRate"
  | "acceleration"
  | "responseTime"
  | "pauseManagement";

export interface MetricSetting {
  id: string;
  metric_id: MetricId;
  weight: number;
  min_threshold: number;
  ideal_threshold: number;
  max_threshold: number;
  method: string | null;
  enabled: boolean;
}

const DB_TO_UI: Record<string, MetricId> = {
  volume: "volume",
  speech_rate: "speechRate",
  end_intensity: "acceleration",
  latency: "responseTime",
  pauses: "pauseManagement",
};

const UI_TO_DB: Record<MetricId, string> = {
  volume: "volume",
  speechRate: "speech_rate",
  acceleration: "end_intensity",
  responseTime: "latency",
  pauseManagement: "pauses",
};

const DEFAULTS: Record<MetricId, Omit<MetricSetting, "id" | "metric_id">> = {
  volume: { weight: 30, min_threshold: -35, ideal_threshold: -15, max_threshold: 0, method: null, enabled: true },
  speechRate: { weight: 30, min_threshold: 90, ideal_threshold: 150, max_threshold: 220, method: "energy-peaks", enabled: true },
  acceleration: { weight: 15, min_threshold: 0, ideal_threshold: 50, max_threshold: 100, method: null, enabled: true },
  responseTime: { weight: 10, min_threshold: 2000, ideal_threshold: 200, max_threshold: 0, method: null, enabled: true },
  pauseManagement: { weight: 15, min_threshold: 3, ideal_threshold: 0, max_threshold: 2.71, method: null, enabled: true },
};

const allMetricIds: MetricId[] = ["volume", "speechRate", "acceleration", "responseTime", "pauseManagement"];

export const useMetricSettings = () =>
  useQuery({
    queryKey: ["metric-settings"],
    queryFn: async (): Promise<MetricSetting[]> => {
      const { data, error } = await supabase.from("scoring_config").select("*");
      if (error) throw error;

      const byId = new Map<MetricId, MetricSetting>();

      for (const row of data ?? []) {
        const metricId = DB_TO_UI[row.metric_name];
        if (!metricId) continue;
        const fallback = DEFAULTS[metricId];
        const weight = Math.round(Number(row.weight) * 100);
        byId.set(metricId, {
          id: row.id,
          metric_id: metricId,
          weight,
          min_threshold: Number(row.min_value ?? fallback.min_threshold),
          ideal_threshold: Number(row.max_value ?? fallback.ideal_threshold),
          max_threshold: metricId === "pauseManagement"
            ? Number(row.max_value ?? fallback.max_threshold)
            : fallback.max_threshold,
          method: metricId === "speechRate" ? (localStorage.getItem("speechRateMethod") ?? fallback.method) : null,
          enabled: weight > 0,
        });
      }

      const settings = allMetricIds.map((metricId) => {
        const existing = byId.get(metricId);
        if (existing) return existing;
        return {
          id: `virtual-${metricId}`,
          metric_id: metricId,
          ...DEFAULTS[metricId],
        };
      });

      return settings;
    },
  });

export const useUpdateMetricSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: MetricSetting[]) => {
      for (const metric of settings) {
        const dbMetric = UI_TO_DB[metric.metric_id];
        const payload = {
          weight: (metric.enabled ? metric.weight : 0) / 100,
          min_value: metric.min_threshold,
          max_value: metric.metric_id === "pauseManagement" ? metric.max_threshold : metric.ideal_threshold,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("scoring_config").update(payload).eq("metric_name", dbMetric);
        if (error) throw error;

        if (metric.metric_id === "speechRate" && metric.method) {
          localStorage.setItem("speechRateMethod", metric.method);
        }
      }

      const localMetricConfig = settings.map((m) => ({
        id: m.metric_id,
        weight: m.enabled ? m.weight : 0,
        enabled: m.enabled,
        thresholds: {
          min: m.min_threshold,
          ideal: m.ideal_threshold,
          max: m.max_threshold,
        },
        method: m.method,
      }));
      localStorage.setItem("metricConfig", JSON.stringify(localMetricConfig));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-settings"] });
      queryClient.invalidateQueries({ queryKey: ["scoring-config"] });
      toast.success("Metric settings updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
};

