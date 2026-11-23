import { useState } from 'react';
import { BookOpen, PenSquare, CheckCircle2, X } from 'lucide-react';
import { AppSection, MandiEntry, MandiEntryInput } from './types/diary';
import { localDiaryRepository } from './services/diaryStorage';
import { EntryForm } from './components/EntryForm';
import { DiaryList } from './components/DiaryList';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';

export default function App() {
  const [entries, setEntries] = useState<MandiEntry[]>(() => localDiaryRepository.getAll());
  const [activeSection, setActiveSection] = useState<AppSection>('new-entry');
  const [editingEntry, setEditingEntry] = useState<MandiEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MandiEntry | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveEntry = (data: MandiEntryInput, editingId?: string) => {
    if (editingId) {
      const updated = localDiaryRepository.update(editingId, data);
      if (updated) {
        setEntries(localDiaryRepository.getAll());
        setEditingEntry(null);
        setActiveSection('my-diary');
        setSuccessMessage('एंट्री सफलतापूर्वक बदलकर सेव हो गई!');
      }
      return;
    }

    localDiaryRepository.create(data);
    setEntries(localDiaryRepository.getAll());
    setSuccessMessage('नई एंट्री मेरी डायरी में सेव हो गई!');
  };

  const handleStartEdit = (entry: MandiEntry) => {
    setEditingEntry(entry);
    setSuccessMessage(null);
    setActiveSection('new-entry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    localDiaryRepository.remove(deleteTarget.id);
    setEntries(localDiaryRepository.getAll());
    if (editingEntry?.id === deleteTarget.id) {
      setEditingEntry(null);
    }
    setDeleteTarget(null);
    setSuccessMessage('एंट्री डायरी से हटा दी गई।');
  };

  const handleTabSwitch = (section: AppSection) => {
    setActiveSection(section);
    setSuccessMessage(null);
    if (section === 'my-diary') {
      setEditingEntry(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FAF4] text-[#17281C] flex flex-col print:bg-white">
      {/* Top Green Register Header (hidden during print) */}
      <header className="bg-gradient-to-r from-[#14532D] via-[#166534] to-[#15803D] text-white shadow-sm print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl"
              aria-hidden="true"
            >
              📒
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
                मेरी मंडी डायरी
              </h1>
              <p className="truncate text-xs font-medium text-emerald-100 sm:text-sm">
                आसान डिजिटल बही-खाता
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-xl bg-white/15 px-3.5 py-2 text-right tabular-nums">
            <span className="block text-xs font-medium text-emerald-100">कुल एंट्री</span>
            <span className="text-lg font-extrabold leading-tight">{entries.length}</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-[#FACC15]" />
      </header>

      {/* Main Content Container */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-7 print:max-w-none print:p-0">
        {/* Two Main Section Tabs (hidden during print) */}
        <nav
          aria-label="मुख्य भाग"
          className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-emerald-200 bg-white p-1.5 shadow-xs print:hidden"
        >
          <button
            type="button"
            onClick={() => handleTabSwitch('new-entry')}
            className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-base font-bold transition-colors sm:text-lg whitespace-nowrap ${
              activeSection === 'new-entry'
                ? 'bg-[#15803D] text-white shadow-xs'
                : 'text-emerald-950 hover:bg-emerald-50'
            }`}
          >
            <PenSquare className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>नई एंट्री</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('my-diary')}
            className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-base font-bold transition-colors sm:text-lg whitespace-nowrap ${
              activeSection === 'my-diary'
                ? 'bg-[#15803D] text-white shadow-xs'
                : 'text-emerald-950 hover:bg-emerald-50'
            }`}
          >
            <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>मेरी डायरी ({entries.length})</span>
          </button>
        </nav>

        {/* Success Feedback Banner */}
        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400 bg-[#DCFCE7] px-4 py-3.5 text-emerald-950 shadow-xs print:hidden"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="text-base font-bold">{successMessage}</span>
            </div>

            <div className="flex items-center gap-2">
              {activeSection === 'new-entry' && (
                <button
                  type="button"
                  onClick={() => handleTabSwitch('my-diary')}
                  className="min-h-[40px] rounded-xl bg-emerald-800 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-emerald-900 whitespace-nowrap"
                >
                  मेरी डायरी देखें
                </button>
              )}
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                aria-label="संदेश बंद करें"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-900 hover:bg-emerald-200/70"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Active Section */}
        {activeSection === 'new-entry' ? (
          <>
            <div className="print:hidden">
              <EntryForm
                editingEntry={editingEntry}
                onSave={handleSaveEntry}
                onCancelEdit={handleCancelEdit}
              />
            </div>
            <div className="hidden print:block">
              <DiaryList
                entries={entries}
                onEdit={handleStartEdit}
                onRequestDelete={setDeleteTarget}
                onGoToNewEntry={() => handleTabSwitch('new-entry')}
              />
            </div>
          </>
        ) : (
          <DiaryList
            entries={entries}
            onEdit={handleStartEdit}
            onRequestDelete={setDeleteTarget}
            onGoToNewEntry={() => handleTabSwitch('new-entry')}
          />
        )}
      </main>

      {/* Simple Footer (hidden during print) */}
      <footer className="border-t border-emerald-200/80 bg-white/70 py-4 text-center text-sm font-medium text-emerald-900 print:hidden">
        मेरी मंडी डायरी — आपका सारा डेटा इसी ब्राउज़र में सुरक्षित रहता है।
      </footer>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        entry={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
