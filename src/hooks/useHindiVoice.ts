import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceFieldKey } from '../types/diary';
import { normalizeDevanagariDigits } from '../utils/formatters';

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function cleanRecognizedText(field: VoiceFieldKey, rawTranscript: string): string {
  const trimmed = rawTranscript.trim();
  if (!trimmed) return '';

  const normalizedDigits = normalizeDevanagariDigits(trimmed);

  if (field === 'farmerPhone' || field === 'driverPhone') {
    // Keep digits and + if spoken, remove spaces between spoken digits
    const compact = normalizedDigits.replace(/\s+/g, '');
    const digitsOnly = compact.replace(/[^\d+]/g, '');
    return digitsOnly || normalizedDigits;
  }

  if (field === 'vehicleNumber') {
    return normalizedDigits.toUpperCase();
  }

  return normalizedDigits;
}

export interface UseHindiVoiceReturn {
  isSupported: boolean;
  listeningField: VoiceFieldKey | null;
  interimText: string;
  voiceError: string | null;
  startListening: (field: VoiceFieldKey, onRecognized: (text: string) => void) => void;
  stopListening: () => void;
  clearError: () => void;
}

export function useHindiVoice(): UseHindiVoiceReturn {
  const [isSupported] = useState<boolean>(() => getSpeechRecognitionConstructor() !== null);
  const [listeningField, setListeningField] = useState<VoiceFieldKey | null>(null);
  const [interimText, setInterimText] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeFieldRef = useRef<VoiceFieldKey | null>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already ended
      }
    }
    setListeningField(null);
    setInterimText('');
    activeFieldRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setVoiceError(null);
  }, []);

  const startListening = useCallback(
    (field: VoiceFieldKey, onRecognized: (text: string) => void) => {
      setVoiceError(null);

      const SpeechRec = getSpeechRecognitionConstructor();
      if (!SpeechRec) {
        setVoiceError(
          'इस ब्राउज़र में बोलकर लिखने (Voice) की सुविधा उपलब्ध नहीं है। कृपया हाथ से टाइप करें।'
        );
        return;
      }

      // If tapping the same field that is currently listening, stop it
      if (activeFieldRef.current === field) {
        stopListening();
        return;
      }

      // Abort any previous recognition session before starting a new one
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors
        }
      }

      try {
        const recognition = new SpeechRec();
        recognition.lang = 'hi-IN';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        activeFieldRef.current = field;
        recognitionRef.current = recognition;
        setListeningField(field);
        setInterimText('');

        let gotFinalResult = false;

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let combinedInterim = '';
          let combinedFinal = '';

          for (let i = 0; i < event.results.length; i += 1) {
            const result = event.results[i];
            const transcript = result[0]?.transcript ?? '';
            if (result.isFinal) {
              combinedFinal += `${transcript} `;
            } else {
              combinedInterim += `${transcript} `;
            }
          }

          if (combinedInterim.trim()) {
            setInterimText(combinedInterim.trim());
          }

          if (combinedFinal.trim()) {
            gotFinalResult = true;
            const cleaned = cleanRecognizedText(field, combinedFinal);
            onRecognized(cleaned);
            setInterimText('');
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          if (event.error === 'aborted') {
            return;
          }
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setVoiceError(
              'माइक्रोफ़ोन की अनुमति बंद है। कृपया ब्राउज़र में माइक की अनुमति दें या हाथ से टाइप करें।'
            );
          } else if (event.error === 'no-speech') {
            setVoiceError(
              'कोई आवाज़ सुनाई नहीं दी। कृपया माइक दबाकर साफ़ बोलें या हाथ से टाइप करें।'
            );
          } else if (event.error === 'audio-capture') {
            setVoiceError('फ़ोन या कंप्यूटर में माइक्रोफ़ोन नहीं मिला। कृपया हाथ से टाइप करें।');
          } else if (event.error === 'network') {
            setVoiceError(
              'बोलकर लिखने के लिए इंटरनेट कनेक्शन की ज़रूरत है। कृपया हाथ से टाइप करें।'
            );
          } else {
            setVoiceError('आवाज़ पहचानने में समस्या आई। कृपया फिर से बोलें या हाथ से टाइप करें।');
          }
          setListeningField(null);
          setInterimText('');
          activeFieldRef.current = null;
        };

        recognition.onend = () => {
          // If only interim text arrived before end, pass it so user can review/edit
          if (!gotFinalResult) {
            setInterimText((latestInterim) => {
              if (latestInterim.trim()) {
                onRecognized(cleanRecognizedText(field, latestInterim));
              }
              return '';
            });
          }
          setListeningField(null);
          activeFieldRef.current = null;
          recognitionRef.current = null;
        };

        recognition.start();
      } catch {
        setVoiceError('माइक्रोफ़ोन शुरू नहीं हो सका। कृपया हाथ से टाइप करें।');
        setListeningField(null);
        setInterimText('');
        activeFieldRef.current = null;
      }
    },
    [stopListening]
  );

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup error
        }
      }
    };
  }, []);

  return {
    isSupported,
    listeningField,
    interimText,
    voiceError,
    startListening,
    stopListening,
    clearError,
  };
}
