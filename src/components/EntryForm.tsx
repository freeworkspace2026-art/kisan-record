import { FormEvent, useEffect, useState } from 'react';
import { Mic, MicOff, Clock, X, RotateCcw } from 'lucide-react';
import { MandiEntry, MandiEntryInput, VoiceFieldKey } from '../types/diary';
import { useHindiVoice } from '../hooks/useHindiVoice';
import { getDefaultDateTimeLocal } from '../utils/formatters';

interface EntryFormProps {
  editingEntry: MandiEntry | null;
  onSave: (data: MandiEntryInput, editingId?: string) => void;
  onCancelEdit: () => void;
}

const EMPTY_FORM: MandiEntryInput = {
  farmerName: '',
  village: '',
  quantity: '',
  driverName: '',
  vehicleNumber: '',
  farmerPhone: '',
  driverPhone: '',
  departureDateTime: '',
};

interface TextFieldConfig {
  key: VoiceFieldKey;
  order: number;
  emoji: string;
  label: string;
  placeholder: string;
  inputType: 'text' | 'tel';
  inputMode?: 'text' | 'numeric' | 'tel';
  tintClass: string;
}

const TEXT_FIELDS: TextFieldConfig[] = [
  {
    key: 'farmerName',
    order: 1,
    emoji: '👨‍🌾',
    label: 'किसान का नाम',
    placeholder: 'जैसे: रामलाल पटेल',
    inputType: 'text',
    inputMode: 'text',
    tintClass: 'bg-[#F3FCF5] border-emerald-200 focus-within:border-emerald-600',
  },
  {
    key: 'village',
    order: 2,
    emoji: '🏡',
    label: 'गाँव',
    placeholder: 'जैसे: पिपरिया',
    inputType: 'text',
    inputMode: 'text',
    tintClass: 'bg-[#FFFDF2] border-amber-200 focus-within:border-emerald-600',
  },
  {
    key: 'quantity',
    order: 3,
    emoji: '📦',
    label: 'कितने कटे / नग',
    placeholder: 'जैसे: 45 कट्टे',
    inputType: 'text',
    inputMode: 'text',
    tintClass: 'bg-[#F2FAFF] border-sky-200 focus-within:border-emerald-600',
  },
  {
    key: 'driverName',
    order: 4,
    emoji: '🚚',
    label: 'ड्राइवर का नाम',
    placeholder: 'जैसे: सुरेश यादव',
    inputType: 'text',
    inputMode: 'text',
    tintClass: 'bg-[#FFF7F0] border-orange-200 focus-within:border-emerald-600',
  },
  {
    key: 'vehicleNumber',
    order: 5,
    emoji: '🔢',
    label: 'गाड़ी नंबर',
    placeholder: 'जैसे: MP 09 AB 1234',
    inputType: 'text',
    inputMode: 'text',
    tintClass: 'bg-[#F3FCF5] border-emerald-200 focus-within:border-emerald-600',
  },
  {
    key: 'farmerPhone',
    order: 6,
    emoji: '📞',
    label: 'किसान का फोन नंबर',
    placeholder: 'जैसे: 9876543210',
    inputType: 'tel',
    inputMode: 'tel',
    tintClass: 'bg-[#FFFDF2] border-amber-200 focus-within:border-emerald-600',
  },
  {
    key: 'driverPhone',
    order: 7,
    emoji: '📱',
    label: 'ड्राइवर का फोन नंबर',
    placeholder: 'जैसे: 9826012345',
    inputType: 'tel',
    inputMode: 'tel',
    tintClass: 'bg-[#F2FAFF] border-sky-200 focus-within:border-emerald-600',
  },
];

export function EntryForm({ editingEntry, onSave, onCancelEdit }: EntryFormProps) {
  const [formData, setFormData] = useState<MandiEntryInput>(() => ({
    ...EMPTY_FORM,
    departureDateTime: getDefaultDateTimeLocal(),
  }));
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    isSupported,
    listeningField,
    interimText,
    voiceError,
    startListening,
    stopListening,
    clearError,
  } = useHindiVoice();

  useEffect(() => {
    if (editingEntry) {
      setFormData({
        farmerName: editingEntry.farmerName,
        village: editingEntry.village,
        quantity: editingEntry.quantity,
        driverName: editingEntry.driverName,
        vehicleNumber: editingEntry.vehicleNumber,
        farmerPhone: editingEntry.farmerPhone,
        driverPhone: editingEntry.driverPhone,
        departureDateTime: editingEntry.departureDateTime || getDefaultDateTimeLocal(),
      });
      setValidationError(null);
      clearError();
    } else {
      setFormData({
        ...EMPTY_FORM,
        departureDateTime: getDefaultDateTimeLocal(),
      });
    }
  }, [editingEntry, clearError]);

  const handleFieldChange = (key: keyof MandiEntryInput, value: string) => {
    if (validationError && key === 'farmerName' && value.trim()) {
      setValidationError(null);
    }
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleMicClick = (field: VoiceFieldKey) => {
    startListening(field, (recognizedText) => {
      setFormData((prev) => ({
        ...prev,
        [field]: recognizedText,
      }));
      if (field === 'farmerName' && recognizedText.trim()) {
        setValidationError(null);
      }
    });
  };

  const handleResetForm = () => {
    stopListening();
    clearError();
    setValidationError(null);
    setFormData({
      ...EMPTY_FORM,
      departureDateTime: getDefaultDateTimeLocal(),
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    stopListening();

    if (!formData.farmerName.trim()) {
      setValidationError('कृपया कम से कम किसान का नाम लिखें या बोलकर भरें।');
      return;
    }

    const cleaned: MandiEntryInput = {
      farmerName: formData.farmerName.trim(),
      village: formData.village.trim(),
      quantity: formData.quantity.trim(),
      driverName: formData.driverName.trim(),
      vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
      farmerPhone: formData.farmerPhone.trim(),
      driverPhone: formData.driverPhone.trim(),
      departureDateTime: formData.departureDateTime,
    };

    onSave(cleaned, editingEntry?.id);

    if (!editingEntry) {
      setFormData({
        ...EMPTY_FORM,
        departureDateTime: getDefaultDateTimeLocal(),
      });
    }
    setValidationError(null);
  };

  const activeFieldLabel =
    TEXT_FIELDS.find((f) => f.key === listeningField)?.label ?? '';

  return (
    <section
      aria-label="नई एंट्री फॉर्म"
      className="rounded-3xl border border-emerald-200 bg-white shadow-sm overflow-hidden"
    >
      {/* Register Page Top Header */}
      <div className="border-b border-emerald-200 bg-gradient-to-r from-[#E6F7EA] via-[#F2FBF4] to-[#FEF9E7] px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-emerald-950 sm:text-2xl">
              {editingEntry ? '✏️ पुरानी एंट्री बदलें' : '📝 नई एंट्री लिखें'}
            </h2>
            <p className="mt-1 text-sm text-emerald-800">
              बोलने के लिए 🎤 माइक दबाएं या हाथ से लिखें। जांचने के बाद ही सेव करें।
            </p>
          </div>
          {editingEntry ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              बदलना रद्द करें
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResetForm}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              साफ़ करें
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-7">
        {/* Browser Voice Availability Notice */}
        {!isSupported && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
          >
            ℹ️ इस ब्राउज़र में हिंदी आवाज़ (माइक) की सुविधा उपलब्ध नहीं है। आप नीचे दिए बॉक्स में आसानी से हाथ से टाइप कर सकते हैं।
          </div>
        )}

        {/* Active Listening Banner */}
        {listeningField && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400 bg-emerald-50 px-4 py-3.5 text-emerald-950"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white animate-pulse">
                <Mic className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-bold">
                  सुन रहे हैं: {activeFieldLabel}... बोलिए
                </p>
                <p className="text-sm text-emerald-800">
                  {interimText ? `पहचाना गया: "${interimText}"` : 'साफ़ आवाज़ में हिंदी में बोलें'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="min-h-[44px] rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 whitespace-nowrap shrink-0"
            >
              रोकें
            </button>
          </div>
        )}

        {/* Friendly Voice Error Banner */}
        {voiceError && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900"
          >
            <span>⚠️ {voiceError}</span>
            <button
              type="button"
              onClick={clearError}
              aria-label="संदेश बंद करें"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-base font-semibold text-rose-900"
          >
            ⚠️ {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {TEXT_FIELDS.map((field) => {
              const isListeningThis = listeningField === field.key;
              return (
                <div
                  key={field.key}
                  className={`rounded-2xl border p-3.5 transition-colors sm:p-4 ${field.tintClass}`}
                >
                  <label
                    htmlFor={`field-${field.key}`}
                    className="mb-2 flex items-center gap-2 text-base font-bold text-slate-900"
                  >
                    <span className="text-lg" aria-hidden="true">
                      {field.emoji}
                    </span>
                    <span>
                      {field.order}. {field.label}
                    </span>
                    {field.key === 'farmerName' && (
                      <span className="text-sm font-semibold text-rose-600">*</span>
                    )}
                  </label>

                  <div className="flex items-stretch gap-2.5">
                    <input
                      id={`field-${field.key}`}
                      name={field.key}
                      type={field.inputType}
                      inputMode={field.inputMode}
                      value={formData[field.key]}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="min-h-[52px] w-full min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 tabular-nums"
                    />

                    <button
                      type="button"
                      onClick={() => handleMicClick(field.key)}
                      aria-label={
                        isListeningThis
                          ? `${field.label} के लिए माइक बंद करें`
                          : `${field.label} बोलकर भरें`
                      }
                      title={
                        isSupported
                          ? 'बोलकर लिखने के लिए दबाएं'
                          : 'बोलकर लिखने की सुविधा उपलब्ध नहीं है'
                      }
                      className={`flex min-h-[52px] min-w-[54px] shrink-0 items-center justify-center rounded-xl border px-3 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                        isListeningThis
                          ? 'border-rose-600 bg-rose-600 text-white shadow-md'
                          : isSupported
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                            : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {isListeningThis ? (
                        <MicOff className="h-6 w-6" aria-hidden="true" />
                      ) : (
                        <Mic className="h-6 w-6" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Field 8: गाड़ी कब निकलेगी? (date and time) */}
            <div className="rounded-2xl border border-purple-200 bg-[#FAF5FF] p-3.5 transition-colors focus-within:border-emerald-600 sm:p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="field-departureDateTime"
                  className="flex items-center gap-2 text-base font-bold text-slate-900"
                >
                  <span className="text-lg" aria-hidden="true">
                    🕒
                  </span>
                  <span>8. गाड़ी कब निकलेगी?</span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    handleFieldChange('departureDateTime', getDefaultDateTimeLocal())
                  }
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-xs font-semibold text-purple-900 hover:bg-purple-100 whitespace-nowrap"
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  अभी का समय भरें
                </button>
              </div>

              <input
                id="field-departureDateTime"
                name="departureDateTime"
                type="datetime-local"
                value={formData.departureDateTime}
                onChange={(e) => handleFieldChange('departureDateTime', e.target.value)}
                className="min-h-[52px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-medium text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 tabular-nums"
              />
            </div>
          </div>

          {/* Save Button Row */}
          <div className="mt-6 border-t border-emerald-100 pt-5">
            <button
              type="submit"
              className="flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#15803D] px-6 py-4 text-xl font-bold text-white shadow-md shadow-emerald-900/15 transition-all hover:bg-[#166534] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              <span>{editingEntry ? '💾 बदलाव सेव करें' : '💾 एंट्री सेव करें'}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
