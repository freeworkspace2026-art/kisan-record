import type {
  AiBusinessNote,
  BusinessDatabase,
  CommodityRecord,
  FarmerRecord,
  PaymentRecord,
  PurchaseRecord,
  RecordingItem,
  SaleRecord,
  VillageRecord,
} from '../types/business';

export interface QueueStats {
  queued: number;
  active: number;
  completed: number;
  failed: number;
  total: number;
}

export interface ApiDataResponse {
  data: BusinessDatabase;
  queue: QueueStats;
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body?.error === 'string'
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export const businessApi = {
  fetchAll(): Promise<ApiDataResponse> {
    return requestJson<ApiDataResponse>('/api/data');
  },

  migrateLegacyEntries(entries: unknown[]): Promise<{ importedCount: number }> {
    return requestJson('/api/migrate-legacy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
  },

  uploadRecording(params: {
    blob: Blob;
    title: string;
    durationSeconds: number;
    languageHint: string;
  }): Promise<{ recording: RecordingItem; queue: QueueStats }> {
    const form = new FormData();
    const ext = params.blob.type.includes('mp4')
      ? 'm4a'
      : params.blob.type.includes('ogg')
        ? 'ogg'
        : 'webm';
    form.append('audio', params.blob, `recording_${Date.now()}.${ext}`);
    form.append('title', params.title);
    form.append('durationSeconds', String(params.durationSeconds));
    form.append('languageHint', params.languageHint);
    return requestJson('/api/recordings', { method: 'POST', body: form });
  },

  importAudioFiles(
    files: File[],
    languageHint: string
  ): Promise<{ recordings: RecordingItem[]; queue: QueueStats }> {
    const form = new FormData();
    for (const file of files) {
      form.append('files', file, file.name);
    }
    form.append('languageHint', languageHint);
    return requestJson('/api/recordings/import', { method: 'POST', body: form });
  },

  retryRecording(id: string): Promise<{ ok: boolean; queue: QueueStats }> {
    return requestJson(`/api/recordings/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
    });
  },

  retryAllFailed(): Promise<{ retriedCount: number; queue: QueueStats }> {
    return requestJson('/api/recordings/retry-all', { method: 'POST' });
  },

  deleteRecording(id: string): Promise<{ ok: boolean }> {
    return requestJson(`/api/recordings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  createNote(input: {
    title: string;
    summary: string;
    actionItems: string[];
  }): Promise<{ note: AiBusinessNote }> {
    return requestJson('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  updateNote(
    id: string,
    patch: Partial<Pick<AiBusinessNote, 'pinned' | 'title' | 'summary' | 'actionItems'>>
  ): Promise<{ note: AiBusinessNote }> {
    return requestJson(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  },

  deleteNote(id: string): Promise<{ ok: boolean }> {
    return requestJson(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  createCommodityRecord(input: Partial<CommodityRecord>): Promise<{ record: CommodityRecord }> {
    return requestJson('/api/commodities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  deleteCommodityRecord(id: string): Promise<{ ok: boolean }> {
    return requestJson(`/api/commodities/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  createFarmer(input: Partial<FarmerRecord>): Promise<{ farmer: FarmerRecord }> {
    return requestJson('/api/farmers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  deleteFarmer(id: string): Promise<{ ok: boolean }> {
    return requestJson(`/api/farmers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  createVillage(input: Partial<VillageRecord>): Promise<{ village: VillageRecord }> {
    return requestJson('/api/villages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  createPurchase(input: {
    commodity: 'onion' | 'garlic';
    variety: string;
    farmerName: string;
    village: string;
    phone: string;
    bags: number;
    weightKg: number;
    ratePerKg: number;
    totalAmount?: number;
    paidAmount: number;
    method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    date: string;
    notes: string;
  }): Promise<{ purchase: PurchaseRecord }> {
    return requestJson('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  createSale(input: {
    commodity: 'onion' | 'garlic';
    variety?: string;
    buyerName: string;
    villageOrMarket: string;
    bags: number;
    weightKg: number;
    ratePerKg: number;
    totalAmount?: number;
    receivedAmount: number;
    method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    date: string;
    notes: string;
  }): Promise<{ sale: SaleRecord }> {
    return requestJson('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  createPayment(input: {
    direction: 'outgoing' | 'incoming';
    partyName: string;
    farmerId?: string;
    purchaseId?: string;
    amount: number;
    method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    reference: string;
    date: string;
    notes: string;
  }): Promise<{ payment: PaymentRecord }> {
    return requestJson('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};
