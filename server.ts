import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  AUDIO_DIR,
  addAiNote,
  addCommodityRecord,
  addPaymentRecord,
  addPurchaseRecord,
  addRecording,
  addSaleRecord,
  loadDatabase,
  makeId,
  saveDatabase,
  upsertFarmer,
  upsertVillage,
} from './server/store.js';
import {
  enqueueRecording,
  getQueueStats,
  resumePendingOnBoot,
  retryAllFailed,
  retryRecording,
} from './server/processingQueue.js';

const PORT = 3000;

// Ensure audio storage dir exists before configuring multer
loadDatabase();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AUDIO_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.webm';
    cb(null, `${makeId('aud')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per audio file
    files: 25,
  },
});

interface LegacyMandiEntry {
  id: string;
  farmerName: string;
  village: string;
  quantity: string;
  driverName: string;
  vehicleNumber: string;
  farmerPhone: string;
  driverPhone: string;
  departureDateTime: string;
  createdAt: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, queue: getQueueStats() });
  });

  app.get('/api/data', (_req, res) => {
    const db = loadDatabase();
    res.json({
      data: db,
      queue: getQueueStats(),
    });
  });

  // Migrate any existing localStorage Meri Mandi Dairy records into My Business AI cleanly
  app.post('/api/migrate-legacy', (req, res) => {
    const entries = Array.isArray(req.body?.entries)
      ? (req.body.entries as LegacyMandiEntry[])
      : [];
    if (entries.length === 0) {
      res.json({ importedCount: 0 });
      return;
    }

    const db = loadDatabase();
    let importedCount = 0;

    for (const entry of entries) {
      if (!entry?.id || !entry?.farmerName?.trim()) continue;
      const alreadyImported = db.commodities.some(
        (c) => c.legacyDiaryId === entry.id
      );
      if (alreadyImported) continue;

      const numericQty = parseFloat((entry.quantity || '').replace(/[^\d.]/g, '')) || 0;
      const lowerQty = (entry.quantity || '').toLowerCase();
      const commodity = lowerQty.includes('लहसुन') || lowerQty.includes('garlic') ? 'garlic' : 'onion';

      upsertFarmer(db, {
        name: entry.farmerName,
        phone: entry.farmerPhone,
        village: entry.village,
        primaryCrop: commodity,
        legacyDiaryId: entry.id,
        notes: entry.driverName
          ? `Driver: ${entry.driverName} (${entry.vehicleNumber || 'No vehicle'})`
          : '',
      });

      if (entry.village?.trim()) {
        upsertVillage(db, { name: entry.village });
      }

      db.commodities.push({
        id: makeId('cmd'),
        legacyDiaryId: entry.id,
        commodity,
        direction: 'purchase',
        variety: 'Mandi Dairy Entry',
        farmerName: entry.farmerName,
        village: entry.village || '',
        phone: entry.farmerPhone || '',
        driverName: entry.driverName || '',
        vehicleNumber: entry.vehicleNumber || '',
        bags: numericQty,
        weightKg: numericQty > 0 ? numericQty * 50 : 0,
        ratePerKg: 0,
        ratePerQuintal: 0,
        totalAmount: 0,
        notes: `Imported from Meri Mandi Dairy (${entry.quantity || 'N/A'}) · Driver Phone: ${entry.driverPhone || 'N/A'}`,
        date: (entry.departureDateTime || entry.createdAt || new Date().toISOString()).slice(0, 10),
        createdAt: entry.createdAt || new Date().toISOString(),
      });

      importedCount += 1;
    }

    if (importedCount > 0) {
      saveDatabase(db);
    }

    res.json({ importedCount });
  });

  // Upload a single microphone audio recording and auto-queue for Gemini processing
  app.post('/api/recordings', upload.single('audio'), (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No audio file uploaded.' });
      return;
    }

    const title =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim()
        : `Voice Note ${new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}`;
    const durationSeconds = Number(req.body?.durationSeconds) || 0;
    const languageHint =
      typeof req.body?.languageHint === 'string' && req.body.languageHint.trim()
        ? req.body.languageHint.trim()
        : 'Hindi, Hinglish, and English';

    const record = addRecording({
      id: makeId('rec'),
      title,
      fileName: file.originalname || file.filename,
      mimeType: file.mimetype || 'audio/webm',
      fileSizeBytes: file.size,
      durationSeconds,
      source: 'microphone',
      languageHint,
      status: 'queued',
      retryCount: 0,
      transcript: '',
      audioPath: file.filename,
      createdAt: new Date().toISOString(),
    });

    enqueueRecording(record.id);
    res.status(201).json({ recording: record, queue: getQueueStats() });
  });

  // Import multiple recordings (e.g. from Samsung My Files / Android file picker)
  app.post('/api/recordings/import', upload.array('files', 25), (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      res.status(400).json({ error: 'No audio files selected for import.' });
      return;
    }

    const languageHint =
      typeof req.body?.languageHint === 'string' && req.body.languageHint.trim()
        ? req.body.languageHint.trim()
        : 'Hindi, Hinglish, and English';

    const created = files.map((file) => {
      const baseTitle = path.basename(file.originalname, path.extname(file.originalname));
      const record = addRecording({
        id: makeId('rec'),
        title: baseTitle || file.originalname,
        fileName: file.originalname,
        mimeType: file.mimetype || 'audio/mp4',
        fileSizeBytes: file.size,
        durationSeconds: 0,
        source: 'samsung-my-files',
        languageHint,
        status: 'queued',
        retryCount: 0,
        transcript: '',
        audioPath: file.filename,
        createdAt: new Date().toISOString(),
      });
      enqueueRecording(record.id);
      return record;
    });

    res.status(201).json({ recordings: created, queue: getQueueStats() });
  });

  // Stream stored audio file for HTML5 playback
  app.get('/api/recordings/:id/audio', (req, res) => {
    const db = loadDatabase();
    const rec = db.recordings.find((r) => r.id === req.params.id);
    if (!rec) {
      res.status(404).json({ error: 'Recording not found.' });
      return;
    }
    const filePath = path.join(AUDIO_DIR, rec.audioPath);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Audio file missing on disk.' });
      return;
    }
    res.setHeader('Content-Type', rec.mimeType || 'audio/webm');
    res.sendFile(filePath);
  });

  // Retry failed recording
  app.post('/api/recordings/:id/retry', (req, res) => {
    const ok = retryRecording(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Recording not found.' });
      return;
    }
    res.json({ ok: true, queue: getQueueStats() });
  });

  // Retry all failed recordings
  app.post('/api/recordings/retry-all', (_req, res) => {
    const count = retryAllFailed();
    res.json({ retriedCount: count, queue: getQueueStats() });
  });

  // Delete recording (keeps linked business records intact unless user deletes them separately)
  app.delete('/api/recordings/:id', (req, res) => {
    const db = loadDatabase();
    const idx = db.recordings.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Recording not found.' });
      return;
    }
    const [removed] = db.recordings.splice(idx, 1);
    saveDatabase(db);

    const filePath = path.join(AUDIO_DIR, removed.audioPath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Ignore cleanup error
      }
    }
    res.json({ ok: true });
  });

  // AI Business Notes CRUD
  app.post('/api/notes', (req, res) => {
    const { title, summary, actionItems } = req.body || {};
    if (!title?.trim() && !summary?.trim()) {
      res.status(400).json({ error: 'Note title or summary is required.' });
      return;
    }
    const note = addAiNote({
      id: makeId('note'),
      title: (title || 'Business Note').trim(),
      summary: (summary || '').trim(),
      actionItems: Array.isArray(actionItems) ? actionItems : [],
      extractedNumbers: [],
      pinned: false,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ note });
  });

  app.patch('/api/notes/:id', (req, res) => {
    const db = loadDatabase();
    const note = db.notes.find((n) => n.id === req.params.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }
    if (typeof req.body?.pinned === 'boolean') note.pinned = req.body.pinned;
    if (typeof req.body?.title === 'string') note.title = req.body.title.trim();
    if (typeof req.body?.summary === 'string') note.summary = req.body.summary.trim();
    if (Array.isArray(req.body?.actionItems)) note.actionItems = req.body.actionItems;
    saveDatabase(db);
    res.json({ note });
  });

  app.delete('/api/notes/:id', (req, res) => {
    const db = loadDatabase();
    db.notes = db.notes.filter((n) => n.id !== req.params.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  // Commodity Records
  app.post('/api/commodities', (req, res) => {
    const b = req.body || {};
    const commodity = b.commodity === 'garlic' ? 'garlic' : 'onion';
    const direction = b.direction === 'sale' ? 'sale' : 'purchase';
    const bags = Number(b.bags) || 0;
    const weightKg = Number(b.weightKg) || 0;
    const ratePerKg = Number(b.ratePerKg) || 0;
    const totalAmount =
      Number(b.totalAmount) || (weightKg > 0 && ratePerKg > 0 ? Math.round(weightKg * ratePerKg) : 0);

    const db = loadDatabase();
    if (b.farmerName?.trim()) {
      upsertFarmer(db, {
        name: b.farmerName,
        phone: b.phone,
        village: b.village,
        primaryCrop: commodity,
      });
    }
    if (b.village?.trim()) {
      upsertVillage(db, { name: b.village });
    }

    const record = addCommodityRecord({
      id: makeId('cmd'),
      commodity,
      direction,
      variety: (b.variety || '').trim(),
      farmerName: (b.farmerName || '').trim(),
      buyerName: (b.buyerName || '').trim(),
      village: (b.village || '').trim(),
      phone: (b.phone || '').trim(),
      bags,
      weightKg,
      ratePerKg,
      ratePerQuintal: ratePerKg * 100,
      totalAmount,
      notes: (b.notes || '').trim(),
      date: b.date || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ record });
  });

  app.delete('/api/commodities/:id', (req, res) => {
    const db = loadDatabase();
    db.commodities = db.commodities.filter((c) => c.id !== req.params.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  // Farmers
  app.post('/api/farmers', (req, res) => {
    const b = req.body || {};
    if (!b.name?.trim()) {
      res.status(400).json({ error: 'Farmer name is required.' });
      return;
    }
    const db = loadDatabase();
    const farmer = upsertFarmer(db, {
      name: b.name,
      phone: b.phone,
      village: b.village,
      primaryCrop: b.primaryCrop || 'onion',
      notes: b.notes,
    });
    saveDatabase(db);
    res.status(201).json({ farmer });
  });

  app.delete('/api/farmers/:id', (req, res) => {
    const db = loadDatabase();
    db.farmers = db.farmers.filter((f) => f.id !== req.params.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  // Villages
  app.post('/api/villages', (req, res) => {
    const b = req.body || {};
    if (!b.name?.trim()) {
      res.status(400).json({ error: 'Village name is required.' });
      return;
    }
    const db = loadDatabase();
    const village = upsertVillage(db, {
      name: b.name,
      district: b.district,
      notes: b.notes,
    });
    saveDatabase(db);
    res.status(201).json({ village });
  });

  // Purchases
  app.post('/api/purchases', (req, res) => {
    const b = req.body || {};
    const commodity = b.commodity === 'garlic' ? 'garlic' : 'onion';
    const bags = Number(b.bags) || 0;
    const weightKg = Number(b.weightKg) || 0;
    const ratePerKg = Number(b.ratePerKg) || 0;
    const totalAmount =
      Number(b.totalAmount) || (weightKg > 0 && ratePerKg > 0 ? Math.round(weightKg * ratePerKg) : 0);
    const paidAmount = Number(b.paidAmount) || 0;
    const status: 'paid' | 'partial' | 'pending' =
      totalAmount > 0 && paidAmount >= totalAmount
        ? 'paid'
        : paidAmount > 0
          ? 'partial'
          : 'pending';

    const db = loadDatabase();
    const farmer = b.farmerName?.trim()
      ? upsertFarmer(db, {
          name: b.farmerName,
          phone: b.phone,
          village: b.village,
          primaryCrop: commodity,
        })
      : null;

    const purchase = addPurchaseRecord({
      id: makeId('pur'),
      commodity,
      variety: (b.variety || '').trim(),
      farmerId: farmer?.id,
      farmerName: (b.farmerName || 'Farmer').trim(),
      village: (b.village || '').trim(),
      bags,
      weightKg,
      ratePerKg,
      totalAmount,
      paidAmount,
      status,
      date: b.date || new Date().toISOString().slice(0, 10),
      notes: (b.notes || '').trim(),
      createdAt: new Date().toISOString(),
    });

    addCommodityRecord({
      id: makeId('cmd'),
      commodity,
      direction: 'purchase',
      variety: (b.variety || '').trim(),
      farmerName: purchase.farmerName,
      village: purchase.village,
      phone: (b.phone || '').trim(),
      bags,
      weightKg,
      ratePerKg,
      ratePerQuintal: ratePerKg * 100,
      totalAmount,
      notes: purchase.notes,
      date: purchase.date,
      createdAt: purchase.createdAt,
    });

    if (paidAmount > 0) {
      addPaymentRecord({
        id: makeId('pay'),
        direction: 'outgoing',
        partyName: purchase.farmerName,
        farmerId: farmer?.id,
        purchaseId: purchase.id,
        amount: paidAmount,
        method: b.method || 'Cash',
        reference: 'Initial purchase payment',
        date: purchase.date,
        notes: `${commodity} purchase`,
        createdAt: purchase.createdAt,
      });
    }

    res.status(201).json({ purchase });
  });

  // Sales
  app.post('/api/sales', (req, res) => {
    const b = req.body || {};
    const commodity = b.commodity === 'garlic' ? 'garlic' : 'onion';
    const bags = Number(b.bags) || 0;
    const weightKg = Number(b.weightKg) || 0;
    const ratePerKg = Number(b.ratePerKg) || 0;
    const totalAmount =
      Number(b.totalAmount) || (weightKg > 0 && ratePerKg > 0 ? Math.round(weightKg * ratePerKg) : 0);
    const receivedAmount = Number(b.receivedAmount) || 0;

    const sale = addSaleRecord({
      id: makeId('sal'),
      commodity,
      buyerName: (b.buyerName || 'Mandi Buyer').trim(),
      villageOrMarket: (b.villageOrMarket || 'Mandi Market').trim(),
      bags,
      weightKg,
      ratePerKg,
      totalAmount,
      receivedAmount,
      date: b.date || new Date().toISOString().slice(0, 10),
      notes: (b.notes || '').trim(),
      createdAt: new Date().toISOString(),
    });

    addCommodityRecord({
      id: makeId('cmd'),
      commodity,
      direction: 'sale',
      variety: (b.variety || '').trim(),
      farmerName: '',
      buyerName: sale.buyerName,
      village: sale.villageOrMarket,
      phone: '',
      bags,
      weightKg,
      ratePerKg,
      ratePerQuintal: ratePerKg * 100,
      totalAmount,
      notes: sale.notes,
      date: sale.date,
      createdAt: sale.createdAt,
    });

    if (receivedAmount > 0) {
      addPaymentRecord({
        id: makeId('pay'),
        direction: 'incoming',
        partyName: sale.buyerName,
        amount: receivedAmount,
        method: b.method || 'Bank Transfer',
        reference: 'Sale receipt',
        date: sale.date,
        notes: `${commodity} sale`,
        createdAt: sale.createdAt,
      });
    }

    res.status(201).json({ sale });
  });

  // Payments
  app.post('/api/payments', (req, res) => {
    const b = req.body || {};
    const amount = Number(b.amount) || 0;
    if (!b.partyName?.trim() || amount <= 0) {
      res.status(400).json({ error: 'Party name and valid positive amount are required.' });
      return;
    }

    const payment = addPaymentRecord({
      id: makeId('pay'),
      direction: b.direction === 'incoming' ? 'incoming' : 'outgoing',
      partyName: b.partyName.trim(),
      farmerId: b.farmerId,
      purchaseId: b.purchaseId,
      amount,
      method: b.method || 'Cash',
      reference: (b.reference || '').trim(),
      date: b.date || new Date().toISOString().slice(0, 10),
      notes: (b.notes || '').trim(),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ payment });
  });

  // Resume any pending recordings after boot
  resumePendingOnBoot();

  // Mount Vite dev middleware or serve static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`My Business AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start My Business AI server:', err);
  process.exit(1);
});
