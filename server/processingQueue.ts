import path from 'path';
import {
  AUDIO_DIR,
  addAiNote,
  addCommodityRecord,
  addPaymentRecord,
  addPurchaseRecord,
  addSaleRecord,
  loadDatabase,
  makeId,
  saveDatabase,
  updateRecording,
  upsertFarmer,
  upsertVillage,
} from './store.js';
import { extractBusinessData, transcribeAudioFile } from './geminiProcessor.js';

const pendingIds: string[] = [];
let isProcessing = false;

async function processSingleRecording(recordingId: string): Promise<void> {
  const db = loadDatabase();
  const recording = db.recordings.find((r) => r.id === recordingId);
  if (!recording) return;

  const filePath = path.join(AUDIO_DIR, recording.audioPath);

  try {
    updateRecording(recordingId, (rec) => {
      rec.status = 'transcribing';
      rec.errorMessage = undefined;
    });

    const transcript = await transcribeAudioFile(
      filePath,
      recording.mimeType,
      recording.fileName,
      recording.languageHint
    );

    updateRecording(recordingId, (rec) => {
      rec.transcript = transcript;
      rec.status = 'extracting';
    });

    const extracted = await extractBusinessData(transcript);
    const currentDb = loadDatabase();

    // Remove previous auto-extracted records if this is a retry
    currentDb.notes = currentDb.notes.filter((n) => n.recordingId !== recordingId);
    currentDb.commodities = currentDb.commodities.filter((c) => c.recordingId !== recordingId);
    currentDb.purchases = currentDb.purchases.filter((p) => p.recordingId !== recordingId);
    currentDb.sales = currentDb.sales.filter((s) => s.recordingId !== recordingId);
    saveDatabase(currentDb);

    // 1. Save AI Business Note
    addAiNote({
      id: makeId('note'),
      recordingId,
      title: extracted.noteTitle,
      summary: extracted.summary,
      actionItems: extracted.actionItems,
      extractedNumbers: extracted.extractedNumbers,
      pinned: false,
      createdAt: new Date().toISOString(),
    });

    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);

    // 2. Upsert Villages mentioned
    for (const vil of extracted.villagesMentioned) {
      if (vil.name?.trim()) {
        upsertVillage(loadDatabase(), {
          name: vil.name,
          district: vil.district,
          notes: vil.notes,
        });
      }
    }

    // 3. Upsert Farmers mentioned
    for (const frm of extracted.farmersMentioned) {
      if (frm.name?.trim()) {
        const crop =
          frm.primaryCrop === 'garlic' || frm.primaryCrop === 'both' ? frm.primaryCrop : 'onion';
        upsertFarmer(loadDatabase(), {
          name: frm.name,
          phone: frm.phone,
          village: frm.village,
          primaryCrop: crop,
          notes: frm.notes,
        });
      }
    }

    // 4. Create Commodity, Purchase, Sale & Payment Records
    for (const deal of extracted.deals) {
      const commodity = deal.commodity === 'garlic' ? 'garlic' : 'onion';
      const direction = deal.direction === 'sale' ? 'sale' : 'purchase';
      const bags = Number(deal.bags) || 0;
      const weightKg = Number(deal.weightKg) || 0;
      const ratePerKg =
        Number(deal.ratePerKg) ||
        (Number(deal.ratePerQuintal) ? Number(deal.ratePerQuintal) / 100 : 0);
      const ratePerQuintal = Number(deal.ratePerQuintal) || ratePerKg * 100;
      const totalAmount =
        Number(deal.totalAmount) ||
        (weightKg > 0 && ratePerKg > 0 ? Math.round(weightKg * ratePerKg) : 0);
      const paidOrReceived = Number(deal.paidOrReceivedAmount) || 0;

      const farmerObj = deal.farmerName?.trim()
        ? upsertFarmer(loadDatabase(), {
            name: deal.farmerName,
            phone: deal.phone,
            village: deal.village,
            primaryCrop: commodity,
          })
        : null;

      if (deal.village?.trim()) {
        upsertVillage(loadDatabase(), { name: deal.village });
      }

      addCommodityRecord({
        id: makeId('cmd'),
        recordingId,
        commodity,
        direction,
        variety: deal.variety || '',
        farmerName: deal.farmerName || '',
        buyerName: deal.buyerName || '',
        village: deal.village || '',
        phone: deal.phone || '',
        bags,
        weightKg,
        ratePerKg,
        ratePerQuintal,
        totalAmount,
        notes: deal.notes || '',
        date: todayDate,
        createdAt: nowIso,
      });

      if (direction === 'purchase') {
        const status: 'paid' | 'partial' | 'pending' =
          deal.paymentStatus === 'paid' || (totalAmount > 0 && paidOrReceived >= totalAmount)
            ? 'paid'
            : deal.paymentStatus === 'partial' || paidOrReceived > 0
              ? 'partial'
              : 'pending';

        const purchase = addPurchaseRecord({
          id: makeId('pur'),
          recordingId,
          commodity,
          variety: deal.variety || '',
          farmerId: farmerObj?.id,
          farmerName: deal.farmerName || 'Unknown Farmer',
          village: deal.village || '',
          bags,
          weightKg,
          ratePerKg,
          totalAmount,
          paidAmount: status === 'paid' && paidOrReceived === 0 ? totalAmount : paidOrReceived,
          status,
          date: todayDate,
          notes: deal.notes || '',
          createdAt: nowIso,
        });

        if (paidOrReceived > 0) {
          addPaymentRecord({
            id: makeId('pay'),
            direction: 'outgoing',
            partyName: deal.farmerName || 'Farmer',
            farmerId: farmerObj?.id,
            purchaseId: purchase.id,
            amount: paidOrReceived,
            method: 'Cash',
            reference: 'Auto-extracted from voice note',
            date: todayDate,
            notes: `${commodity.toUpperCase()} purchase payment`,
            createdAt: nowIso,
          });
        }
      } else {
        addSaleRecord({
          id: makeId('sal'),
          recordingId,
          commodity,
          buyerName: deal.buyerName || deal.farmerName || 'Mandi Buyer',
          villageOrMarket: deal.village || 'Mandi Market',
          bags,
          weightKg,
          ratePerKg,
          totalAmount,
          receivedAmount:
            deal.paymentStatus === 'paid' && paidOrReceived === 0 ? totalAmount : paidOrReceived,
          date: todayDate,
          notes: deal.notes || '',
          createdAt: nowIso,
        });

        if (paidOrReceived > 0) {
          addPaymentRecord({
            id: makeId('pay'),
            direction: 'incoming',
            partyName: deal.buyerName || deal.farmerName || 'Mandi Buyer',
            amount: paidOrReceived,
            method: 'Cash',
            reference: 'Auto-extracted from voice note',
            date: todayDate,
            notes: `${commodity.toUpperCase()} sale receipt`,
            createdAt: nowIso,
          });
        }
      }
    }

    saveDatabase(loadDatabase());

    updateRecording(recordingId, (rec) => {
      rec.status = 'completed';
      rec.processedAt = new Date().toISOString();
      rec.errorMessage = undefined;
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Processing failed due to an unknown error.';
    updateRecording(recordingId, (rec) => {
      rec.status = 'failed';
      rec.errorMessage = message;
    });
  }
}

async function drainQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (pendingIds.length > 0) {
      const nextId = pendingIds.shift();
      if (nextId) {
        await processSingleRecording(nextId);
      }
    }
  } finally {
    isProcessing = false;
  }
}

export function enqueueRecording(recordingId: string): void {
  if (!pendingIds.includes(recordingId)) {
    pendingIds.push(recordingId);
  }
  void drainQueue();
}

export function retryRecording(recordingId: string): boolean {
  const updated = updateRecording(recordingId, (rec) => {
    rec.status = 'queued';
    rec.errorMessage = undefined;
    rec.retryCount += 1;
  });
  if (!updated) return false;
  enqueueRecording(recordingId);
  return true;
}

export function retryAllFailed(): number {
  const db = loadDatabase();
  const failed = db.recordings.filter((r) => r.status === 'failed');
  for (const rec of failed) {
    rec.status = 'queued';
    rec.errorMessage = undefined;
    rec.retryCount += 1;
    if (!pendingIds.includes(rec.id)) {
      pendingIds.push(rec.id);
    }
  }
  saveDatabase(db);
  void drainQueue();
  return failed.length;
}

export function resumePendingOnBoot(): void {
  const db = loadDatabase();
  let changed = false;
  for (const rec of db.recordings) {
    if (
      rec.status === 'queued' ||
      rec.status === 'transcribing' ||
      rec.status === 'extracting'
    ) {
      rec.status = 'queued';
      changed = true;
      if (!pendingIds.includes(rec.id)) {
        pendingIds.push(rec.id);
      }
    }
  }
  if (changed) {
    saveDatabase(db);
    void drainQueue();
  }
}

export function getQueueStats() {
  const db = loadDatabase();
  const queued = db.recordings.filter((r) => r.status === 'queued').length;
  const active = db.recordings.filter(
    (r) => r.status === 'transcribing' || r.status === 'extracting'
  ).length;
  const completed = db.recordings.filter((r) => r.status === 'completed').length;
  const failed = db.recordings.filter((r) => r.status === 'failed').length;
  return { queued, active, completed, failed, total: db.recordings.length };
}
