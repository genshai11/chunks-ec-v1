import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Volume2, Zap, TrendingUp, Clock, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type SpeechRateMethod = "energy-peaks" | "deepgram-stt" | "zero-crossing-rate";

export interface MetricConfig {
  id: string;
  name: string;
  nameVi: string;
  icon: React.ReactNode;
  weight: number;
  tag: string;
  tagColor: string;
  thresholds: {
    min: number;
    ideal: number;
    max: number;
  };
  labels: {
    low: string;
    ideal: string;
    high: string;
  };
  unit: string;
  method?: SpeechRateMethod;
}

const defaultMetrics: MetricConfig[] = [
  {
    id: "volume",
    name: "Volume Level",
    nameVi: "Độ lớn âm thanh",
    icon: <Volume2 className="w-5 h-5" />,
    weight: 40,
    tag: "ENERGY",
    tagColor: "blue",
    thresholds: { min: -35, ideal: -15, max: 0 },
    labels: { low: "Too Quiet", ideal: "Perfect", high: "Too Loud" },
    unit: "dB",
  },
  {
    id: "speechRate",
    name: "Speech Rate",
    nameVi: "Tốc độ nói",
    icon: <Zap className="w-5 h-5" />,
    weight: 40,
    tag: "FLUENCY",
    tagColor: "green",
    thresholds: { min: 90, ideal: 150, max: 220 },
    labels: { low: "Too Slow", ideal: "Optimal", high: "Too Fast" },
    unit: "WPM",
    method: "energy-peaks",
  },
  {
    id: "acceleration",
    name: "Acceleration",
    nameVi: "Tăng tốc & âm lượng",
    icon: <TrendingUp className="w-5 h-5" />,
    weight: 5,
    tag: "DYNAMICS",
    tagColor: "purple",
    thresholds: { min: 0, ideal: 50, max: 100 },
    labels: { low: "Flat", ideal: "Dynamic", high: "Energetic" },
    unit: "%",
  },
  {
    id: "responseTime",
    name: "Response Time",
    nameVi: "Tốc độ phản hồi",
    icon: <Clock className="w-5 h-5" />,
    weight: 5,
    tag: "READINESS",
    tagColor: "yellow",
    thresholds: { min: 2000, ideal: 200, max: 0 },
    labels: { low: "Slow Start", ideal: "Quick", high: "Instant" },
    unit: "ms",
  },
  {
    id: "pauseManagement",
    name: "Pause Management",
    nameVi: "Quản lý ngừng nghỉ",
    icon: <Pause className="w-5 h-5" />,
    weight: 10,
    tag: "FLUIDITY",
    tagColor: "pink",
    thresholds: { min: 2, ideal: 0, max: 2.71 },
    labels: { low: "Max Pauses", ideal: "Perfect (No Pause)", high: "Max Duration" },
    unit: "",
  },
];

function loadSavedConfig(): MetricConfig[] {
  try {
    const saved = localStorage.getItem("metricConfig");
    if (saved) {
      const savedConfigs = JSON.parse(saved);
      return defaultMetrics.map((defaultMetric) => {
        const savedMetric = savedConfigs.find((s: { id: string }) => s.id === defaultMetric.id);
        if (savedMetric) {
          return {
            ...defaultMetric,
            weight: savedMetric.weight ?? defaultMetric.weight,
            thresholds: savedMetric.thresholds ?? defaultMetric.thresholds,
            method: savedMetric.method ?? defaultMetric.method,
          };
        }
        return defaultMetric;
      });
    }
  } catch (e) {
    console.warn("Failed to load saved config:", e);
  }
  return defaultMetrics;
}

export default function ScoreWeightSettings() {
  const [metrics, setMetrics] = useState<MetricConfig[]>(loadSavedConfig);
  const [selectedMetric, setSelectedMetric] = useState<string>("volume");

  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);

  const handleWeightChange = (id: string, newWeight: number) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, weight: newWeight } : m)));
  };

  const handleThresholdChange = (id: string, key: "min" | "ideal" | "max", value: number) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, thresholds: { ...m.thresholds, [key]: value } } : m)));
  };

  const handleMethodChange = (id: string, method: SpeechRateMethod) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, method } : m)));
  };

  const handleSave = () => {
    localStorage.setItem("metricConfig", JSON.stringify(metrics));
    toast.success("Settings Saved", {
      description: "Your metric configuration has been saved successfully.",
    });
  };

  const currentMetric = metrics.find((m) => m.id === selectedMetric);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Score Weight Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure scoring metrics and weights</p>
        </div>
        <Button onClick={handleSave} className="gradient-primary text-primary-foreground">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Total Weight Summary */}
      <div className={`p-4 rounded-xl mb-6 ${totalWeight !== 100 ? "bg-destructive/10 border-2 border-destructive" : "bg-success/10 border-2 border-success"}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total Weight</span>
          <span className={`text-3xl font-bold ${totalWeight !== 100 ? "text-destructive" : "text-success"}`}>
            {totalWeight}%
          </span>
        </div>
        {totalWeight !== 100 && <p className="text-xs text-destructive mt-2">⚠️ Weights must equal 100%</p>}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Metrics List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold mb-4">Metrics</h2>

          {metrics.map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                selectedMetric === metric.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setSelectedMetric(metric.id)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-${metric.tagColor}-500/20`}>
                  {metric.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{metric.name}</h3>
                  <p className="text-xs text-muted-foreground">{metric.nameVi}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Weight</span>
                  <span className="text-sm font-bold text-primary">{metric.weight}%</span>
                </div>
                <Slider
                  value={[metric.weight]}
                  onValueChange={([v]) => handleWeightChange(metric.id, v)}
                  min={0}
                  max={50}
                  step={5}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          {currentMetric && (
            <motion.div
              key={currentMetric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Metric Header */}
              <div className="p-6 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-xl bg-${currentMetric.tagColor}-500/20`}>
                    {currentMetric.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{currentMetric.name}</h3>
                    <p className="text-muted-foreground">{currentMetric.nameVi}</p>
                  </div>
                  <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium bg-${currentMetric.tagColor}-500/20`}>
                    {currentMetric.tag}
                  </span>
                </div>

                {/* Speech Rate Method Selector */}
                {currentMetric.id === "speechRate" && (
                  <div className="pt-6 border-t">
                    <h4 className="text-sm font-medium mb-3">Detection Method</h4>
                    <Select
                      value={currentMetric.method || "energy-peaks"}
                      onValueChange={(value: SpeechRateMethod) => handleMethodChange(currentMetric.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="energy-peaks">Energy Peaks (Fast, Local)</SelectItem>
                        <SelectItem value="zero-crossing-rate">Zero-Crossing Rate (Acoustic)</SelectItem>
                        <SelectItem value="deepgram-stt">Speech-to-Text (Most Accurate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Threshold Configuration */}
              <div className="p-6 rounded-xl border-2 border-border bg-card">
                <h4 className="text-lg font-semibold mb-6">Threshold Configuration</h4>

                <div className="space-y-6">
                  {currentMetric.id === "pauseManagement" ? (
                    <>
                      {/* Max Pause Count */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">Max Pause Count</label>
                          <span className="text-sm font-bold text-destructive">{currentMetric.thresholds.min} pauses</span>
                        </div>
                        <Slider
                          value={[currentMetric.thresholds.min]}
                          onValueChange={([v]) => handleThresholdChange(currentMetric.id, "min", v)}
                          min={1}
                          max={10}
                          step={1}
                        />
                      </div>

                      {/* Max Pause Duration */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">Max Pause Duration</label>
                          <span className="text-sm font-bold text-destructive">{currentMetric.thresholds.max}s</span>
                        </div>
                        <Slider
                          value={[currentMetric.thresholds.max * 100]}
                          onValueChange={([v]) => handleThresholdChange(currentMetric.id, "max", v / 100)}
                          min={50}
                          max={500}
                          step={10}
                        />
                      </div>

                      <div className="p-3 rounded-lg bg-success/10 text-success text-sm">
                        ✓ No pauses = 100% score (perfect fluency)
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Min Threshold */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">Minimum ({currentMetric.labels.low})</label>
                          <span className="text-sm text-muted-foreground">{currentMetric.thresholds.min} {currentMetric.unit}</span>
                        </div>
                        <Slider
                          value={[currentMetric.thresholds.min]}
                          onValueChange={([v]) => handleThresholdChange(currentMetric.id, "min", v)}
                          min={currentMetric.id === "volume" ? -60 : 0}
                          max={currentMetric.id === "volume" ? 0 : 300}
                          step={1}
                        />
                      </div>

                      {/* Ideal Threshold */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">Ideal Target ({currentMetric.labels.ideal})</label>
                          <span className="text-sm font-bold text-success">{currentMetric.thresholds.ideal} {currentMetric.unit}</span>
                        </div>
                        <Slider
                          value={[currentMetric.thresholds.ideal]}
                          onValueChange={([v]) => handleThresholdChange(currentMetric.id, "ideal", v)}
                          min={currentMetric.id === "volume" ? -60 : 0}
                          max={currentMetric.id === "volume" ? 0 : 300}
                          step={1}
                        />
                      </div>

                      {currentMetric.id === "speechRate" && (
                        <div className="p-3 rounded-lg bg-success/10 text-success text-sm">
                          ✓ No maximum limit - reaching target WPM gives 100% score
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
