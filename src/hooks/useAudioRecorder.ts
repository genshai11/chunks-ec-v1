import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioBuffer: Float32Array | null;
  audioBase64: string | null;
  audioUrl: string | null;
  sampleRate: number;
  error: string | null;
}

interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ audioBuffer: Float32Array; sampleRate: number; audioBase64: string | null; audioUrl: string | null }>;
  resetRecording: () => void;
  getAudioLevel: () => number;
  playRecording: () => void;
  stopPlayback: () => void;
  isPlaying: boolean;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    audioBlob: null,
    audioBuffer: null,
    audioBase64: null,
    audioUrl: null,
    sampleRate: 44100,
    error: null,
  });
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelRef = useRef<number>(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const onStopPromiseRef = useRef<{
    resolve: (value: { audioBuffer: Float32Array; sampleRate: number; audioBase64: string | null; audioUrl: string | null }) => void;
    reject: (reason?: unknown) => void;
  } | null>(null);

  const updateAudioLevel = useCallback(() => {
    if (analyzerRef.current) {
      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      analyzerRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      audioLevelRef.current = average / 255;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      
      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      source.connect(analyzerRef.current);
      
      // Update audio level periodically
      const levelInterval = setInterval(updateAudioLevel, 50);
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('✅ Chunk added, total:', chunksRef.current.length);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🛑 MediaRecorder onstop fired!');
        clearInterval(levelInterval);
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('✅ Blob created:', audioBlob.size, 'bytes');
        
        // Create audio URL for playback
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('✅ Audio URL created');
        
        // Convert to base64 for API calls
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            console.log('✅ Base64 created');
            resolve(base64);
          };
          reader.readAsDataURL(audioBlob);
        });
        
        // Convert to audio buffer for analysis
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          console.log('✅ ArrayBuffer created:', arrayBuffer.byteLength, 'bytes');
          
          const audioContext = new AudioContext();
          const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const audioBuffer = decodedBuffer.getChannelData(0);
          const audioBase64 = await base64Promise;
          
          console.log('✅ Audio decoded:', {
            bufferLength: audioBuffer.length,
            sampleRate: decodedBuffer.sampleRate,
            duration: (audioBuffer.length / decodedBuffer.sampleRate).toFixed(2) + 's'
          });
          
          // Update state
          setState(prev => ({
            ...prev,
            isRecording: false,
            audioBlob,
            audioBuffer,
            audioBase64,
            audioUrl,
            sampleRate: decodedBuffer.sampleRate,
          }));
          
          // Resolve the stopRecording promise with the data
          if (onStopPromiseRef.current) {
            onStopPromiseRef.current.resolve({
              audioBuffer,
              sampleRate: decodedBuffer.sampleRate,
              audioBase64,
              audioUrl
            });
            onStopPromiseRef.current = null;
          }
          
          audioContext.close();
        } catch (error) {
          console.error('❌ Error decoding audio:', error);
          if (onStopPromiseRef.current) {
            onStopPromiseRef.current.reject(error);
            onStopPromiseRef.current = null;
          }
        }
      };
      
      mediaRecorder.start(100);
      console.log('🎙️ MediaRecorder started');
      
      // Start timer
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingTime: prev.recordingTime + 1,
        }));
      }, 1000);
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
        recordingTime: 0,
        audioBlob: null,
        audioBuffer: null,
      }));
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: 'Microphone access denied. Please enable microphone permissions.',
      }));
    }
  }, [updateAudioLevel]);

  const stopRecording = useCallback((): Promise<{ audioBuffer: Float32Array; sampleRate: number; audioBase64: string | null; audioUrl: string | null }> => {
    return new Promise((resolve, reject) => {
      console.log('⏹️ Stopping recording...');
      
      // Clean up timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Store the resolve/reject functions for the onstop handler
      onStopPromiseRef.current = { resolve, reject };
      
      // Stop the media recorder - this will trigger the onstop handler
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('Current recorder state:', mediaRecorderRef.current.state);
        mediaRecorderRef.current.stop();
        console.log('⏹️ Stop() called');
      } else {
        console.log('MediaRecorder already inactive');
      }
      
      // Stop the stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Close the audio context (visualization only, not the one used for decoding)
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    });
  }, []);

  const playRecording = useCallback(() => {
    if (state.audioUrl) {
      // Stop any existing playback
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      
      const audio = new Audio(state.audioUrl);
      audioElementRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      
      audio.play().catch(console.error);
    }
  }, [state.audioUrl]);

  const stopPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const resetRecording = useCallback(() => {
    // Clean up old audio URL
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    // Stop any playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setIsPlaying(false);
    
    setState({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      audioBlob: null,
      audioBuffer: null,
      audioBase64: null,
      audioUrl: null,
      sampleRate: 44100,
      error: null,
    });
    audioLevelRef.current = 0;
    chunksRef.current = [];
    onStopPromiseRef.current = null;
  }, [state.audioUrl]);

  const getAudioLevel = useCallback(() => {
    return audioLevelRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, [state.audioUrl]);

  return {
    ...state,
    isPlaying,
    startRecording,
    stopRecording,
    resetRecording,
    getAudioLevel,
    playRecording,
    stopPlayback,
  };
}
