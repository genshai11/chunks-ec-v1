import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { AudioLevelMeter } from "@/components/ui/AudioLevelMeter";
import { useRealtimeAudio } from "@/hooks/useRealtimeAudio";
import { getCalibrationProfile, saveCalibrationProfile, createCalibrationProfile } from "@/lib/lufsNormalization";
import { Pause, Play, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

export function CalibrationTest() {
  const [isTestMode, setIsTestMode] = useState(false);
  const [manualGain, setManualGain] = useState(1.0);
  const [hasChanges, setHasChanges] = useState(false);
  const profile = getCalibrationProfile("default");
  const { audioLevel, lufs, isActive, error } = useRealtimeAudio(isTestMode);

  useEffect(() => {
    if (profile && !hasChanges) setManualGain(profile.gainAdjustment);
  }, [profile, hasChanges]);

  const adjustedLUFS = lufs != null ? lufs + 20 * Math.log10(manualGain) : null;

  const handleSave = () => {
    const next =
      profile ??
      createCalibrationProfile("default", "Default Microphone", -40, -23);
    next.gainAdjustment = manualGain;
    saveCalibrationProfile(next);
    setHasChanges(false);
    toast.success("Calibration gain saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calibration Test</CardTitle>
        <CardDescription>Live LUFS monitoring + manual gain adjustment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full"
          variant={isTestMode ? "destructive" : "default"}
          onClick={() => setIsTestMode((v) => !v)}
        >
          {isTestMode ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isTestMode ? "Stop Test Mode" : "Start Test Mode"}
        </Button>

        {error && <div className="text-sm text-destructive">{error}</div>}

        {isTestMode && (
          <AudioLevelMeter audioLevel={audioLevel} lufs={adjustedLUFS} targetLUFS={-23} showWaveform height={80} />
        )}

        {isActive && adjustedLUFS != null && (
          <div className="text-sm text-muted-foreground">
            {adjustedLUFS < -28 && "Too quiet - increase gain"}
            {adjustedLUFS >= -28 && adjustedLUFS < -20 && "Good level"}
            {adjustedLUFS >= -20 && "Slightly loud - reduce gain"}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Manual Gain</Label>
            <span className="text-sm font-medium">{manualGain.toFixed(3)}x</span>
          </div>
          <Slider
            value={[manualGain]}
            onValueChange={([v]) => {
              setManualGain(v);
              setHasChanges(true);
            }}
            min={0.5}
            max={2.0}
            step={0.01}
          />
          {hasChanges && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setManualGain(profile?.gainAdjustment ?? 1);
                  setHasChanges(false);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

