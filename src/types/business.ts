export type ScreenId =
  | 'dashboard'
  | 'record'
  | 'import'
  | 'history'
  | 'notes'
  | 'commodities'
  | 'farmers'
  | 'villages'
  | 'weekly'
  | 'ledger'
  | 'reports';

export type RecordingStatus =
  | 'queued'
  | 'transcribing'
  | 'extracting'
  | 'completed'
  | 'failed';

export type RecordingSource = 'microphone' | 'samsung-my-files';

export interface ExtractedNumber {
  label: string;
  value: number;
  unit: string;
  rawText: string;
}

export interface RecordingItem {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number;
  source: RecordingSource;
  languageHint: string;
  status: RecordingStatus;
  retryCount: number;
  errorMessage?: string;
  transcript: string;
  audioPath: string;
  createdAt: string;
  processedAt?: string;
}

export interface AiBusinessNote {
  id: string;
  recordingId?: string;
  title: string;
  summary: string;
  actionItems: string[];
  extractedNumbers: ExtractedNumber[];
  pinned: boolean;
  createdAt: string;
}

export type CommodityType = 'onion' | 'garlic';
export type TradeDirection = 'purchase' | 'sale';

export interface CommodityRecord {
  id: string;
  recordingId?: string;
  legacyDiaryId?: string;
  commodity: CommodityType;
  direction: TradeDirection;
  variety: string;
  farmerName: string;
  buyerName?: string;
  village: string;
  phone: string;
  driverName?: string;
  vehicleNumber?: string;
  bags: number;
  weightKg: number;
  ratePerKg: number;
  ratePerQuintal: number;
  totalAmount: number;
  notes: string;
  date: string;
  createdAt: string;
}

export interface FarmerRecord {
  id: string;
  name: string;
  phone: string;
  village: string;
  primaryCrop: 'onion' | 'garlic' | 'both';
  notes: string;
  legacyDiaryId?: string;
  createdAt: string;
}

export interface VillageRecord {
  id: string;
  name: string;
  district: string;
  notes: string;
  createdAt: string;
}

export interface PurchaseRecord {
  id: string;
  recordingId?: string;
  commodity: CommodityType;
  variety: string;
  farmerId?: string;
  farmerName: string;
  village: string;
  bags: number;
  weightKg: number;
  ratePerKg: number;
  totalAmount: number;
  paidAmount: number;
  status: 'paid' | 'partial' | 'pending';
  date: string;
  notes: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  direction: 'outgoing' | 'incoming';
  partyName: string;
  farmerId?: string;
  purchaseId?: string;
  amount: number;
  method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  reference: string;
  date: string;
  notes: string;
  createdAt: string;
}

export interface SaleRecord {
  id: string;
  recordingId?: string;
  commodity: CommodityType;
  buyerName: string;
  villageOrMarket: string;
  bags: number;
  weightKg: number;
  ratePerKg: number;
  totalAmount: number;
  receivedAmount: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface BusinessDatabase {
  recordings: RecordingItem[];
  notes: AiBusinessNote[];
  commodities: CommodityRecord[];
  farmers: FarmerRecord[];
  villages: VillageRecord[];
  purchases: PurchaseRecord[];
  payments: PaymentRecord[];
  sales: SaleRecord[];
}
