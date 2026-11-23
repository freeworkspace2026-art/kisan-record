import { AlertTriangle } from 'lucide-react';
import { MandiEntry } from '../types/diary';

interface ConfirmDeleteModalProps {
  entry: MandiEntry | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ entry, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 id="delete-modal-title" className="text-lg font-bold text-slate-900">
              क्या आप यह एंट्री हटाना चाहते हैं?
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-900">
                {entry.farmerName || 'बिना नाम'}
              </span>
              {entry.village ? ` (गाँव: ${entry.village})` : ''} की यह एंट्री डायरी से हमेशा के लिए हट जाएगी।
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:scale-[0.98]"
          >
            नहीं, रहने दें
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[48px] rounded-xl bg-rose-600 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 active:scale-[0.98]"
          >
            हाँ, हटाएं
          </button>
        </div>
      </div>
    </div>
  );
}
