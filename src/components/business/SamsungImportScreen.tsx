import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { FolderOpen, UploadCloud, Trash2, CheckCircle2, AlertCircle, FileAudio } from 'lucide-react';
import { businessApi } from '../../services/businessApi';
import { formatBytes } from '../../utils/businessMath';
import type { ScreenId } from '../../types/business';

interface SamsungImportScreenProps {
  isSampleMode: boolean;
  onExitSampleMode: () => void;
  onImported: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export function SamsungImportScreen({
  isSampleMode,
  onExitSampleMode,
  onImported,
  onNavigate,
}: SamsungImportScreenProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [languageHint, setLanguageHint] = useState('Hindi, Hinglish, and English');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const appendFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const incoming = Array.from(fileList);
    setSelectedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}_${f.lastModified}`));
      const uniqueNew = incoming.filter(
        (f) => !existingKeys.has(`${f.name}_${f.size}_${f.lastModified}`)
      );
      return [...prev, ...uniqueNew];
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    appendFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    appendFiles(e.dataTransfer.files);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleImportAll = async () => {
    if (selectedFiles.length === 0 || isUploading) return;
    if (isSampleMode) {
      onExitSampleMode();
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await businessApi.importAudioFiles(selectedFiles, languageHint);
      setSuccessMsg(
        `Imported ${result.recordings.length} audio file(s) and added them to the Automatic AI Processing Queue.`
      );
      setSelectedFiles([]);
      onImported();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to import selected audio files.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Import from Samsung My Files / Android Storage
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Select multiple voice recordings, call recordings, or WhatsApp audio notes (.m4a, .mp3, .wav, .aac, .amr, .ogg, .3gp). All files enter the automatic Gemini transcription & extraction queue.
        </p>

        {/* 3-Step Samsung My Files Guide */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <p className="text-xs font-bold text-emerald-800">01. Open Picker</p>
            <p className="mt-1 text-sm text-slate-700">
              Tap <strong>Select Audio Files</strong> below and choose <strong>My Files</strong> on your Samsung/Android phone.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <p className="text-xs font-bold text-emerald-800">02. Multi-Select</p>
            <p className="mt-1 text-sm text-slate-700">
              Open <strong>Audio</strong> or <strong>Voice Recorder</strong>, long-press to select multiple recordings, and tap <strong>Done</strong>.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <p className="text-xs font-bold text-emerald-800">03. Auto Queue</p>
            <p className="mt-1 text-sm text-slate-700">
              Tap <strong>Import & Queue All</strong>. Gemini transcribes each file and updates Onion/Garlic & Farmer ledgers.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950"
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
              Monitor Queue
            </button>
          </div>
        )}

        {/* Language Hint */}
        <div className="mt-5 max-w-sm">
          <label htmlFor="import-lang" className="block text-sm font-semibold text-slate-800">
            Audio Language Hint
          </label>
          <select
            id="import-lang"
            value={languageHint}
            onChange={(e) => setLanguageHint(e.target.value)}
            className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="Hindi, Hinglish, and English">Hindi / Hinglish / English</option>
            <option value="Hindi and Marathi">Hindi & Marathi</option>
            <option value="Hindi and Gujarati">Hindi & Gujarati</option>
            <option value="English">English</option>
          </select>
        </div>

        {/* Dropzone & Android Multi-File Trigger */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-5 rounded-2xl border-2 border-dashed p-7 text-center transition-colors ${
            isDragging
              ? 'border-emerald-600 bg-emerald-50'
              : 'border-emerald-300 bg-[#F7FBF8]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.m4a,.mp3,.wav,.aac,.amr,.3gp,.ogg,.opus,.flac,.webm"
            onChange={handleFileChange}
            className="hidden"
          />

          <FolderOpen className="mx-auto h-10 w-10 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-3 text-base font-bold text-slate-900">
            Choose Multiple Audio Recordings
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Supports up to 25 audio files per batch (50 MB max per file)
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            <span>Select Audio Files (My Files)</span>
          </button>
        </div>

        {/* Selected Files Queue Preview */}
        {selectedFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 tabular-nums">
                Ready to Import ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''})
              </h3>
              <button
                type="button"
                onClick={() => void handleImportAll()}
                disabled={isUploading}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap"
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                <span>
                  {isUploading
                    ? 'Uploading to Queue...'
                    : `Import & Queue All (${selectedFiles.length})`}
                </span>
              </button>
            </div>

            <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {selectedFiles.map((file, idx) => (
                <li
                  key={`${file.name}_${file.size}_${file.lastModified}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileAudio className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {formatBytes(file.size)} · {file.type || 'Audio file'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    disabled={isUploading}
                    aria-label={`Remove ${file.name}`}
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
