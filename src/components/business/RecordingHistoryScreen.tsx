import { useState } from 'react';
import {
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  FileAudio,
} from 'lucide-react';
import type { RecordingItem, RecordingStatus } from '../../types/business';
import type { QueueStats } from '../../services/businessApi';
import { formatBytes, formatDateTime, formatDuration } from '../../utils/businessMath';

interface RecordingHistoryScreenProps {
  recordings: RecordingItem[];
  queue: QueueStats;
  isSampleMode: boolean;
  onRetryOne: (id: string) => Promise<void>;
  onRetryAll: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type StatusFilter = 'all' | 'processing' | 'completed' | 'failed';

export function RecordingHistoryScreen({
  recordings,
  queue,
  isSampleMode,
  onRetryOne,
  onRetryAll,
  onDelete,
}: RecordingHistoryScreenProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filtered = recordings.filter((rec) => {
    if (filter === 'all') return true;
    if (filter === 'processing') {
      return rec.status === 'queued' || rec.status === 'transcribing' || rec.status === 'extracting';
    }
    return rec.status === filter;
  });

  const handleRetryClick = async (id: string) => {
    if (isSampleMode) return;
    setRetryingId(id);
    try {
      await onRetryOne(id);
    } finally {
      setRetryingId(null);
    }
  };

  const statusLabel = (status: RecordingStatus) => {
    switch (status) {
      case 'queued':
        return { text: 'Queued', color: 'text-amber-700', Icon: Clock };
      case 'transcribing':
        return { text: 'Transcribing audio...', color: 'text-amber-700', Icon: Loader2, spin: true };
      case 'extracting':
        return { text: 'Extracting Onion/Garlic data...', color: 'text-emerald-700', Icon: Loader2, spin: true };
      case 'completed':
        return { text: 'Completed', color: 'text-emerald-700', Icon: CheckCircle2 };
      case 'failed':
        return { text: 'Failed', color: 'text-rose-700', Icon: AlertCircle };
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar + Filter Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Recording History & Processing Queue
            </h2>
            <p className="mt-1 text-sm text-slate-600 tabular-nums">
              Total: {queue.total} · Active/Queued: {queue.active + queue.queued} · Completed: {queue.completed} · Failed: {queue.failed}
            </p>
          </div>

          {queue.failed > 0 && (
            <button
              type="button"
              onClick={() => void onRetryAll()}
              disabled={isSampleMode}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Retry All Failed ({queue.failed})</span>
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              { id: 'all', label: `All (${recordings.length})` },
              {
                id: 'processing',
                label: `Queue (${queue.queued + queue.active})`,
              },
              { id: 'completed', label: `Completed (${queue.completed})` },
              { id: 'failed', label: `Failed (${queue.failed})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recordings List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileAudio className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
          <h3 className="mt-3 text-base font-bold text-slate-900">
            No recordings in this view
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Record audio or import multiple files from Samsung My Files to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => {
            const st = statusLabel(rec.status);
            const StatusIcon = st.Icon;

            return (
              <article
                key={rec.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">{rec.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 tabular-nums">
                      {rec.fileName} · {formatBytes(rec.fileSizeBytes)}
                      {rec.durationSeconds > 0 ? ` · ${formatDuration(rec.durationSeconds)}` : ''} ·{' '}
                      {rec.source === 'samsung-my-files' ? 'Samsung My Files' : 'Microphone'} ·{' '}
                      {formatDateTime(rec.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${st.color}`}>
                      <StatusIcon
                        className={`h-4 w-4 ${st.spin ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                      <span>{st.text}</span>
                    </span>
                  </div>
                </div>

                {/* Audio Player */}
                {rec.audioPath && !isSampleMode ? (
                  <div className="mt-3">
                    <audio
                      controls
                      preload="none"
                      src={`/api/recordings/${encodeURIComponent(rec.id)}/audio`}
                      className="h-10 w-full"
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    {isSampleMode
                      ? 'Audio playback is active for live uploaded/recorded files.'
                      : 'Audio stream unavailable.'}
                  </p>
                )}

                {/* Error & Retry */}
                {rec.status === 'failed' && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="text-xs font-medium text-rose-900">
                      {rec.errorMessage || 'Processing failed.'} (Attempts: {rec.retryCount + 1})
                    </p>
                    {!isSampleMode && (
                      <button
                        type="button"
                        onClick={() => void handleRetryClick(rec.id)}
                        disabled={retryingId === rec.id}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60 whitespace-nowrap"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{retryingId === rec.id ? 'Retrying...' : 'Retry Processing'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Transcript */}
                {rec.transcript && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-bold text-slate-700">Automatic Transcript</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {rec.transcript}
                    </p>
                  </div>
                )}

                {/* Delete Footer */}
                {!isSampleMode && (
                  <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => void onDelete(rec.id)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Delete Recording</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
