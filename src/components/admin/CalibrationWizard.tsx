import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AudioLevelMeter } from "@/components/ui/AudioLevelMeter";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import {
  calculateNoiseFloor,
  createCalibrationProfile,
  deleteCalibrationProfile,
  getCalibrationProfiles,
  measureReferenceLevel,
  saveCalibrationProfile,
} from "@/lib/lufsNormalization";
import { CheckCircle2, Mic, Trash2 } from "lucide-react";
import { toast } from "sonner";

type CalibrationStep = "idle" | "noise" | "reference" | "complete";

export function CalibrationWizard() {
  const [step, setStep] = useState<CalibrationStep>("idle");
  const [noiseFloor, setNoiseFloor] = useState<number>(0);
  const [referenceLevel, setReferenceLevel] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const recorder = useAudioRecorder();
  const profiles = getCalibrationProfiles();

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const startNoise = async () => {
    setStep("noise");
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await sleep(1000);
    }
    await recorder.startRecording();
    await sleep(3000);
    const data = await recorder.stopRecording();
    setIsProcessing(true);
    const noise = calculateNoiseFloor(data.audioBuffer, data.sampleRate);
    setNoiseFloor(noise);
    setIsProcessing(false);
    recorder.resetRecording();
    toast.success(`Noise floor measured: ${noise.toFixed(2)} dB`);
    await startReference();
  };

  const startReference = async () => {
    setStep("reference");
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await sleep(1000);
    }
    await recorder.startRecording();
    for (let i = 5; i > 0; i--) {
      setCountdown(i);
      await sleep(1000);
    }
    const data = await recorder.stopRecording();
    setIsProcessing(true);
    const reference = await measureReferenceLevel(data.audioBuffer, data.sampleRate);
    setReferenceLevel(reference);
    const profile = createCalibrationProfile("default", "Default Microphone", noiseFloor, reference);
    saveCalibrationProfile(profile);
    setIsProcessing(false);
    recorder.resetRecording();
    setStep("complete");
    toast.success("Calibration complete");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio Calibration</CardTitle>
        <CardDescription>Reuse-style calibration for fair 5-audio-metric scoring</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {profiles.length > 0 && (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p.deviceId} className="p-3 border rounded-lg flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">{p.deviceLabel}</div>
                  <div className="text-muted-foreground">Noise {p.noiseFloor.toFixed(2)} dB • Ref {p.referenceLevel.toFixed(2)} LUFS</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteCalibrationProfile(p.deviceId)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Progress value={step === "idle" ? 0 : step === "noise" ? 33 : step === "reference" ? 66 : 100} />

        {recorder.isRecording && (
          <AudioLevelMeter audioLevel={recorder.getAudioLevel()} showWaveform height={70} />
        )}

        {step === "idle" && (
          <Button className="w-full" onClick={startNoise} disabled={isProcessing}>
            <Mic className="w-4 h-4 mr-2" />
            Start Calibration
          </Button>
        )}

        {(step === "noise" || step === "reference") && (
          <div className="text-center text-sm text-muted-foreground">
            {step === "noise" ? "Measuring background noise..." : "Speak clearly at normal volume..."} {countdown > 0 ? `(${countdown})` : ""}
          </div>
        )}

        {step === "complete" && (
          <div className="p-4 bg-muted rounded-lg text-sm">
            <div className="flex items-center gap-2 font-medium mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Calibration Complete
            </div>
            <div>Noise floor: {noiseFloor.toFixed(2)} dB</div>
            <div>Reference level: {referenceLevel.toFixed(2)} LUFS</div>
            <Button className="w-full mt-3" variant="outline" onClick={() => setStep("idle")}>
              Calibrate Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

