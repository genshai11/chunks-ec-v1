import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useScoringConfig, useUpdateAllScoringWeights, ScoringMetric } from '@/hooks/useScoringConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Loader2, 
  Save,
  Volume2,
  Mic,
  TrendingUp,
  Clock,
  Pause,
  Info
} from 'lucide-react';

interface MetricDisplay {
  id: string;
  name: string;
  nameVi: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  formula?: string;
  details: string[];
}

const metricDisplayInfo: Record<string, MetricDisplay> = {
  volume: {
    id: 'volume',
    name: 'Volume (RMS)',
    nameVi: 'Âm lượng',
    icon: <Volume2 className="w-5 h-5" />,
    color: 'primary',
    description: 'Measures average audio energy using RMS algorithm',
    formula: 'dB = 20 × log₁₀(RMS)',
    details: [
      'Analyzes raw audio buffer samples',
      'Converts to decibel (dB) scale',
      '-45dB → 0%, -20dB → 100%'
    ]
  },
  speech_rate: {
    id: 'speech_rate',
    name: 'Speech Rate',
    nameVi: 'Tốc độ nói',
    icon: <Mic className="w-5 h-5" />,
    color: 'success',
    description: 'Words per minute using AI transcription',
    formula: 'WPM = (wordCount / duration) × 60',
    details: [
      'Uses Deepgram for accurate word count',
      '80 WPM → 0%, 150 WPM → 100%',
      'Optimal range: 120-150 WPM'
    ]
  },
  pauses: {
    id: 'pauses',
    name: 'Pause Management',
    nameVi: 'Quản lý khoảng dừng',
    icon: <Pause className="w-5 h-5" />,
    color: 'warning',
    description: 'Detects silent periods and measures quality',
    formula: 'Score: 100 if minimal pauses',
    details: [
      'Detects silences below -40dB',
      'Minimum pause duration: 300ms',
      'Penalizes excessive pausing'
    ]
  },
  latency: {
    id: 'latency',
    name: 'Response Latency',
    nameVi: 'Thời gian phản hồi',
    icon: <Clock className="w-5 h-5" />,
    color: 'accent',
    description: 'Time from prompt to first speech',
    formula: 'responseTime = firstVoiceFrame / sampleRate',
    details: [
      '≤500ms → 100%',
      '>3000ms → 0%',
      'Faster response = higher score'
    ]
  },
  end_intensity: {
    id: 'end_intensity',
    name: 'End Intensity',
    nameVi: 'Cường độ kết thúc',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'destructive',
    description: 'Compares energy at end vs beginning',
    formula: 'Score based on: ΔVolume + ΔSpeechRate',
    details: [
      'Splits audio into segments',
      'Rewards maintaining energy',
      'Higher end energy = higher score'
    ]
  }
};

const ScoringConfigPanel: React.FC = () => {
  const { data: scoringConfig, isLoading } = useScoringConfig();
  const updateWeights = useUpdateAllScoringWeights();
  
  const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (scoringConfig) {
      const weights: Record<string, number> = {};
      scoringConfig.forEach(m => {
        weights[m.metric_name] = Math.round(Number(m.weight) * 100);
      });
      setLocalWeights(weights);
    }
  }, [scoringConfig]);

  const totalWeight = Object.values(localWeights).reduce((sum, w) => sum + w, 0);

  const handleWeightChange = (metricName: string, newWeight: number) => {
    setLocalWeights(prev => ({ ...prev, [metricName]: newWeight }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!scoringConfig) return;
    
    const updates = scoringConfig.map(m => ({
      id: m.id,
      weight: localWeights[m.metric_name] / 100
    }));
    
    await updateWeights.mutateAsync(updates);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selected = selectedMetric ? metricDisplayInfo[selectedMetric] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Speech Analysis Scoring</h2>
          <p className="text-muted-foreground">Configure how speech is analyzed and scored</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            totalWeight === 100 
              ? 'bg-success/10 text-success' 
              : 'bg-destructive/10 text-destructive'
          }`}>
            Total: {totalWeight}%
          </div>
          
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || totalWeight !== 100 || updateWeights.isPending}
            className="gap-2"
          >
            {updateWeights.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {totalWeight !== 100 && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          ⚠️ Total weight must equal 100%. Currently at {totalWeight}%.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Metrics Grid */}
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {Object.entries(metricDisplayInfo).map(([key, info], index) => {
            const weight = localWeights[key] || 0;
            const isSelected = selectedMetric === key;
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'ring-2 ring-primary border-primary/50' 
                      : 'hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedMetric(isSelected ? null : key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg bg-${info.color}/10 text-${info.color}`}>
                        {info.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{info.name}</h3>
                        <p className="text-xs text-muted-foreground">{info.nameVi}</p>
                      </div>
                    </div>

                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Weight</span>
                        <span className="text-sm font-bold text-primary">{weight}%</span>
                      </div>
                      <Slider
                        value={[weight]}
                        onValueChange={([v]) => handleWeightChange(key, v)}
                        min={0}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-1">
          {selected ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {selected.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selected.name}</CardTitle>
                      <CardDescription>{selected.nameVi}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-foreground/80">{selected.description}</p>
                  
                  {selected.formula && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <code className="text-xs font-mono text-primary">
                        {selected.formula}
                      </code>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      How it works
                    </span>
                    <ul className="space-y-1.5">
                      {selected.details.map((detail, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-foreground/70">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Info className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Click on a metric to see details about how it's calculated
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Presets</CardTitle>
          <CardDescription>Apply preset weight configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalWeights({
                  volume: 20,
                  speech_rate: 25,
                  pauses: 15,
                  latency: 15,
                  end_intensity: 25
                });
                setHasChanges(true);
              }}
            >
              Balanced (Default)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalWeights({
                  volume: 30,
                  speech_rate: 30,
                  pauses: 20,
                  latency: 10,
                  end_intensity: 10
                });
                setHasChanges(true);
              }}
            >
              Focus: Fluency
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalWeights({
                  volume: 25,
                  speech_rate: 15,
                  pauses: 10,
                  latency: 25,
                  end_intensity: 25
                });
                setHasChanges(true);
              }}
            >
              Focus: Confidence
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalWeights({
                  volume: 15,
                  speech_rate: 35,
                  pauses: 25,
                  latency: 15,
                  end_intensity: 10
                });
                setHasChanges(true);
              }}
            >
              Focus: Speed
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoringConfigPanel;
