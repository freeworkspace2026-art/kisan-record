import fs from 'fs';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { ExtractedNumber } from '../src/types/business.js';

export interface ExtractedDeal {
  commodity: 'onion' | 'garlic';
  direction: 'purchase' | 'sale';
  variety: string;
  farmerName: string;
  buyerName: string;
  village: string;
  phone: string;
  bags: number;
  weightKg: number;
  ratePerKg: number;
  ratePerQuintal: number;
  totalAmount: number;
  paidOrReceivedAmount: number;
  paymentStatus: 'paid' | 'partial' | 'pending';
  notes: string;
}

export interface ExtractedFarmer {
  name: string;
  phone: string;
  village: string;
  primaryCrop: 'onion' | 'garlic' | 'both';
  notes: string;
}

export interface ExtractedVillage {
  name: string;
  district: string;
  notes: string;
}

export interface GeminiExtractionResult {
  noteTitle: string;
  summary: string;
  actionItems: string[];
  extractedNumbers: ExtractedNumber[];
  deals: ExtractedDeal[];
  farmersMentioned: ExtractedFarmer[];
  villagesMentioned: ExtractedVillage[];
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('network');
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      const delayMs = 800 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function normalizeMimeType(mimeType: string, fileName: string): string {
  const lower = (mimeType || '').toLowerCase().split(';')[0].trim();
  if (lower.startsWith('audio/')) {
    if (lower === 'audio/m4a' || lower === 'audio/x-m4a') return 'audio/mp4';
    return lower;
  }
  const ext = fileName.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'mp3':
      return 'audio/mp3';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
    case 'aac':
      return 'audio/mp4';
    case 'ogg':
    case 'opus':
      return 'audio/ogg';
    case 'flac':
      return 'audio/flac';
    case '3gp':
      return 'audio/3gpp';
    case 'amr':
      return 'audio/amr';
    default:
      return 'audio/webm';
  }
}

export async function transcribeAudioFile(
  filePath: string,
  mimeType: string,
  fileName: string,
  languageHint = 'Hindi, Hinglish, and English'
): Promise<string> {
  const ai = getAiClient();
  const audioBuffer = fs.readFileSync(filePath);
  if (audioBuffer.length === 0) {
    throw new Error('The audio file is empty (0 bytes).');
  }

  const base64Audio = audioBuffer.toString('base64');
  const resolvedMime = normalizeMimeType(mimeType, fileName);

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: resolvedMime,
              data: base64Audio,
            },
          },
          {
            text: `Transcribe this agricultural mandi business audio recording verbatim. Expected language(s): ${languageHint}. Pay close attention to onion (प्याज/kanda) and garlic (लहसुन/lahsun) quantities, bags/kattas, weights in kg or quintals, prices/rates in rupees, phone numbers, farmer names, buyer names, and village names. Output only the accurate transcription text.`,
          },
        ],
      },
    })
  );

  const transcript = (response.text ?? '').trim();
  if (!transcript) {
    throw new Error('Transcription returned empty text. Please verify the audio contains speech.');
  }
  return transcript;
}

export async function extractBusinessData(
  transcript: string
): Promise<GeminiExtractionResult> {
  const ai = getAiClient();

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this agricultural trade transcript and extract structured Onion & Garlic business records, all numbers/quantities, farmers, villages, purchases, sales, and business notes.\n\nTranscript:\n"""\n${transcript}\n"""`,
      config: {
        systemInstruction:
          'You are an expert agricultural commodity trade analyst for an Onion & Garlic mandi merchant. Extract accurate structured records from Hindi, Hinglish, Marathi, Gujarati, or English speech transcripts. Convert spoken Hindi numbers (like पचास, दो हजार, साठ कट्टे) into numeric values. If weightKg is omitted but bags are given (standard mandi bag ~50kg), set weightKg = bags * 50 only if reasonable or 0 if unknown; compute totalAmount = weightKg * ratePerKg if totalAmount is not explicitly stated and both weight & rate exist. Never invent names or phone numbers that are not in the transcript.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            noteTitle: {
              type: Type.STRING,
              description: 'Short clear title for the business note.',
            },
            summary: {
              type: Type.STRING,
              description: 'Concise 2-3 sentence summary of the trade conversation or voice note.',
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Follow-up tasks, pending payments, or dispatch reminders.',
            },
            extractedNumbers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: 'What the number represents (e.g. Bags, Rate, Total).' },
                  value: { type: Type.NUMBER, description: 'Numeric value.' },
                  unit: { type: Type.STRING, description: 'Unit such as kg, bags, quintal, INR, INR/kg.' },
                  rawText: { type: Type.STRING, description: 'Original phrase from transcript.' },
                },
                required: ['label', 'value', 'unit', 'rawText'],
              },
            },
            deals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  commodity: { type: Type.STRING, description: 'Must be "onion" or "garlic".' },
                  direction: { type: Type.STRING, description: 'Must be "purchase" or "sale".' },
                  variety: { type: Type.STRING, description: 'Grade or variety e.g. Red Nashik, Desi, Ooty.' },
                  farmerName: { type: Type.STRING },
                  buyerName: { type: Type.STRING },
                  village: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  bags: { type: Type.NUMBER },
                  weightKg: { type: Type.NUMBER },
                  ratePerKg: { type: Type.NUMBER },
                  ratePerQuintal: { type: Type.NUMBER },
                  totalAmount: { type: Type.NUMBER },
                  paidOrReceivedAmount: { type: Type.NUMBER },
                  paymentStatus: { type: Type.STRING, description: '"paid", "partial", or "pending".' },
                  notes: { type: Type.STRING },
                },
                required: ['commodity', 'direction'],
              },
            },
            farmersMentioned: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  village: { type: Type.STRING },
                  primaryCrop: { type: Type.STRING, description: '"onion", "garlic", or "both".' },
                  notes: { type: Type.STRING },
                },
                required: ['name'],
              },
            },
            villagesMentioned: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  district: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['name'],
              },
            },
          },
          required: [
            'noteTitle',
            'summary',
            'actionItems',
            'extractedNumbers',
            'deals',
            'farmersMentioned',
            'villagesMentioned',
          ],
        },
      },
    })
  );

  const rawJson = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawJson) as Partial<GeminiExtractionResult>;

  return {
    noteTitle: parsed.noteTitle?.trim() || 'Trade Voice Note',
    summary: parsed.summary?.trim() || transcript.slice(0, 220),
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    extractedNumbers: Array.isArray(parsed.extractedNumbers) ? parsed.extractedNumbers : [],
    deals: Array.isArray(parsed.deals) ? parsed.deals : [],
    farmersMentioned: Array.isArray(parsed.farmersMentioned) ? parsed.farmersMentioned : [],
    villagesMentioned: Array.isArray(parsed.villagesMentioned) ? parsed.villagesMentioned : [],
  };
}
