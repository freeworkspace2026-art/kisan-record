import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Pause, Play, UploadCloud, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { businessApi } from '../../services/businessApi';
import { formatDuration } from '../../utils/businessMath';
import type { ScreenId } from '../../types/business';

interface AudioRecorderScreenProps {
  isSampleMode: boolean;
  onExitSampleMode: () => void;
  onRecordingQueued: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export function AudioRecorderScreen({
  isSampleMode,
  onExitSampleMode,
  onRecordingQueued,
  onNavigate,
}: AudioRecorderScreenProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'recorded'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [title, setTitle] = useState('');
  const [languageHint, setLanguageHint] = useState('Hindi, Hinglish, and English');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const cleanupStreams = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupStreams();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startWaveform = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const cCtx = canvas.getContext('2d');
        if (!cCtx) return;

        analyser.getByteFrequencyData(dataArray);
        cCtx.clearRect(0, 0, canvas.width, canvas.height);

        const barCount = 32;
        const barWidth = Math.floor(canvas.width / barCount) - 3;
        for (let i = 0; i < barCount; i += 1) {
          const val = dataArray[i % dataArray.length] || 0;
          const barHeight = Math.max(6, (val / 255) * (canvas.height - 12));
          const x = i * (barWidth + 3);
          const y = (canvas.height - barHeight) / 2;
          cCtx.fillStyle = '#15803D';
          cCtx.fillRect(x, y, barWidth, barHeight);
        }

        animFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch {
      // Ignore Web Audio visualizer errors on restricted devices
    }
  };

  const handleStartRecording = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg(
        'Microphone recording is not available in this browser context. You can still import audio files from Samsung My Files.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setRecordingState('recorded');
        cleanupStreams();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setElapsedSeconds(0);
      setRecordingState('recording');
      startWaveform(stream);

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      cleanupStreams();
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setErrorMsg(
          'Microphone permission was denied. Please allow microphone access in your browser settings.'
        );
      } else {
        setErrorMsg('Could not access microphone. Please check your audio device or import files from My Files.');
      }
    }
  };

  const handlePauseResume = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (recordingState === 'recording' && rec.state === 'recording') {
      rec.pause();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingState('paused');
    } else if (recordingState === 'paused' && rec.state === 'paused') {
      rec.resume();
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      setRecordingState('recording');
    }
  };

  const handleStopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
  };

  const handleDiscard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsedSeconds(0);
    setRecordingState('idle');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveAndProcess = async () => {
    if (!audioBlob || isUploading) return;
    if (isSampleMode) {
      onExitSampleMode();
    }

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const resolvedTitle =
        title.trim() ||
        `Mandi Voice Note (${new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })})`;

      await businessApi.uploadRecording({
        blob: audioBlob,
        title: resolvedTitle,
        durationSeconds: elapsedSeconds,
        languageHint,
      });

      setSuccessMsg(
        'Recording saved and added to the Automatic AI Processing Queue! Check Recording History for live transcription & extraction.'
      );
      setTitle('');
      handleDiscard();
      onRecordingQueued();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to upload recording.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-bold text-slate-900">Audio Recording Studio</h2>
        <p className="mt-1 text-sm text-slate-600">
          Record farmer negotiations, mandi rates, or dispatch updates. Saved recordings automatically enter the AI transcription and Onion & Garlic extraction queue.
        </p>

        {isSampleMode && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            You are currently viewing Prototype Preview mode. Saving a real recording will switch to Live Business Mode automatically.
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
            >
              View Queue & History
            </button>
          </div>
        )}

        {/* Metadata Inputs */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rec-title" className="block text-sm font-semibold text-slate-800">
              Recording Title (Optional)
            </label>
            <input
              id="rec-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Ramlal Onion Deal - Pipariya"
              className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div>
            <label htmlFor="rec-lang" className="block text-sm font-semibold text-slate-800">
              Spoken Language Hint
            </label>
            <select
              id="rec-lang"
              value={languageHint}
              onChange={(e) => setLanguageHint(e.target.value)}
              className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="Hindi, Hinglish, and English">Hindi / Hinglish / English</option>
              <option value="Hindi and Marathi">Hindi & Marathi</option>
              <option value="Hindi and Gujarati">Hindi & Gujarati</option>
              <option value="English">English Only</option>
            </select>
          </div>
        </div>

        {/* Recorder Pad */}
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-[#F4FAF5] p-6 text-center">
          <div className="font-mono-num text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {formatDuration(elapsedSeconds)}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600">
            {recordingState === 'idle' && 'Tap Start Recording to capture trade details'}
            {recordingState === 'recording' && 'Recording active — speak clearly about farmer, village, bags, kg & rates'}
            {recordingState === 'paused' && 'Recording paused'}
            {recordingState === 'recorded' && 'Ready to review and send to AI Queue'}
          </p>

          {/* Waveform Canvas */}
          <div className="mx-auto mt-4 max-w-md overflow-hidden rounded-xl border border-emerald-200 bg-white px-3 py-2">
            <canvas
              ref={canvasRef}
              width={400}
              height={68}
              className="h-[68px] w-full"
              aria-label="Live audio waveform"
            />
          </div>

          {/* Primary Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {recordingState === 'idle' && (
              <button
                type="button"
                onClick={() => void handleStartRecording()}
                className="inline-flex min-h-[54px] items-center gap-2.5 rounded-2xl bg-emerald-700 px-7 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 active:scale-[0.98]"
              >
                <Mic className="h-5 w-5" aria-hidden="true" />
                <span>Start Recording</span>
              </button>
            )}

            {(recordingState === 'recording' || recordingState === 'paused') && (
              <>
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  {recordingState === 'recording' ? (
                    <>
                      <Pause className="h-5 w-5" aria-hidden="true" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" aria-hidden="true" />
                      <span>Resume</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white hover:bg-rose-700"
                >
                  <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span>Stop Recording</span>
                </button>
              </>
            )}

            {recordingState === 'recorded' && audioUrl && (
              <div className="w-full max-w-md space-y-4">
                <audio controls src={audioUrl} className="w-full" />
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={isUploading}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>Discard & Re-record</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSaveAndProcess()}
                    disabled={isUploading}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    <UploadCloud className="h-5 w-5" aria-hidden="true" />
                    <span>{isUploading ? 'Uploading & Queuing...' : 'Save & Auto-Process with AI'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
