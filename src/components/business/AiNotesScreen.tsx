import { FormEvent, useState } from 'react';
import { Pin, Plus, Trash2, CheckSquare } from 'lucide-react';
import type { AiBusinessNote } from '../../types/business';
import { formatDateTime } from '../../utils/businessMath';

interface AiNotesScreenProps {
  notes: AiBusinessNote[];
  isSampleMode: boolean;
  onCreateNote: (input: { title: string; summary: string; actionItems: string[] }) => Promise<void>;
  onTogglePin: (id: string, pinned: boolean) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export function AiNotesScreen({
  notes,
  isSampleMode,
  onCreateNote,
  onTogglePin,
  onDeleteNote,
}: AiNotesScreenProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [actionText, setActionText] = useState('');
  const [saving, setSaving] = useState(false);

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !summary.trim()) return;
    setSaving(true);
    try {
      const actionItems = actionText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      await onCreateNote({ title: title.trim() || 'Business Note', summary: summary.trim(), actionItems });
      setTitle('');
      setSummary('');
      setActionText('');
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">AI Business Notes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Summaries, action items, and extracted numbers & quantities generated automatically from audio recordings.
            </p>
          </div>
          {!isSampleMode && (
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{showAdd ? 'Close Form' : 'Add Note'}</span>
            </button>
          )}
        </div>

        {showAdd && !isSampleMode && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title (e.g., Mandi rate update)"
              className="min-h-[46px] w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Write business note summary..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
            <textarea
              rows={2}
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              placeholder="Follow-up action items (one per line, optional)"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Business Note'}
            </button>
          </form>
        )}
      </div>

      {sortedNotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-base font-bold text-slate-900">No AI Business Notes yet</p>
          <p className="mt-1 text-sm text-slate-600">
            Record or import audio to generate structured notes automatically, or add a manual note above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedNotes.map((note) => (
            <article
              key={note.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{note.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      {note.pinned ? 'Pinned · ' : ''}
                      {note.recordingId ? 'AI Generated · ' : 'Manual Note · '}
                      {formatDateTime(note.createdAt)}
                    </p>
                  </div>

                  {!isSampleMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void onTogglePin(note.id, !note.pinned)}
                        aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          note.pinned
                            ? 'bg-amber-100 text-amber-800'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Pin className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteNote(note.id)}
                        aria-label="Delete note"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {note.summary}
                </p>

                {/* Extracted Numbers & Quantities Table */}
                {note.extractedNumbers.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold text-slate-700">
                      Extracted Numbers & Quantities
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {note.extractedNumbers.map((num, i) => (
                        <div
                          key={`${note.id}_num_${i}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                        >
                          <p className="truncate text-[11px] font-medium text-slate-500">
                            {num.label}
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900 font-mono-num">
                            {num.value} {num.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {note.actionItems.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold text-slate-700">Action Items</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {note.actionItems.map((item, idx) => (
                        <li
                          key={`${note.id}_act_${idx}`}
                          className="flex items-start gap-2 text-xs text-slate-700"
                        >
                          <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
