import { FormEvent, useState } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import type { CommodityType, PaymentRecord, PurchaseRecord } from '../../types/business';
import { formatINR, formatNumber } from '../../utils/businessMath';

interface PurchasesPaymentsScreenProps {
  purchases: PurchaseRecord[];
  payments: PaymentRecord[];
  isSampleMode: boolean;
  onAddPurchase: (input: {
    commodity: CommodityType;
    variety: string;
    farmerName: string;
    village: string;
    phone: string;
    bags: number;
    weightKg: number;
    ratePerKg: number;
    paidAmount: number;
    method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    date: string;
    notes: string;
  }) => Promise<void>;
  onAddPayment: (input: {
    direction: 'outgoing' | 'incoming';
    partyName: string;
    farmerId?: string;
    purchaseId?: string;
    amount: number;
    method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    reference: string;
    date: string;
    notes: string;
  }) => Promise<void>;
}

export function PurchasesPaymentsScreen({
  purchases,
  payments,
  isSampleMode,
  onAddPurchase,
  onAddPayment,
}: PurchasesPaymentsScreenProps) {
  const [subTab, setSubTab] = useState<'purchases' | 'payments'>('purchases');
  const [showAddForm, setShowAddForm] = useState(false);

  // Purchase form state
  const [commodity, setCommodity] = useState<CommodityType>('onion');
  const [variety, setVariety] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState('');
  const [bags, setBags] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [method, setMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Payment form state
  const [payDirection, setPayDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [partyName, setPartyName] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [reference, setReference] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePurchaseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!farmerName.trim()) return;
    setSaving(true);
    try {
      await onAddPurchase({
        commodity,
        variety: variety.trim(),
        farmerName: farmerName.trim(),
        village: village.trim(),
        phone: phone.trim(),
        bags: Number(bags) || 0,
        weightKg: Number(weightKg) || 0,
        ratePerKg: Number(ratePerKg) || 0,
        paidAmount: Number(paidAmount) || 0,
        method,
        date,
        notes: notes.trim(),
      });
      setVariety('');
      setFarmerName('');
      setVillage('');
      setPhone('');
      setBags('');
      setWeightKg('');
      setRatePerKg('');
      setPaidAmount('');
      setNotes('');
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount) || 0;
    if (!partyName.trim() || amt <= 0) return;
    setSaving(true);
    try {
      await onAddPayment({
        direction: payDirection,
        partyName: partyName.trim(),
        amount: amt,
        method: payMethod,
        reference: reference.trim(),
        date: payDate,
        notes: payNotes.trim(),
      });
      setPartyName('');
      setPayAmount('');
      setReference('');
      setPayNotes('');
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSettleBalance = async (p: PurchaseRecord) => {
    if (isSampleMode) return;
    const due = Math.max(0, p.totalAmount - p.paidAmount);
    if (due <= 0) return;
    await onAddPayment({
      direction: 'outgoing',
      partyName: p.farmerName,
      farmerId: p.farmerId,
      purchaseId: p.id,
      amount: due,
      method: 'Cash',
      reference: 'Balance settled',
      date: new Date().toISOString().slice(0, 10),
      notes: `Settled ${p.commodity} purchase`,
    });
  };

  const totalPurchased = purchases.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const totalPending = purchases.reduce(
    (s, p) => s + Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0)),
    0
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Purchases & Payments</h2>
            <p className="mt-1 text-sm text-slate-600 tabular-nums">
              Total Purchased: {formatINR(totalPurchased)} · Pending Balance: {formatINR(totalPending)}
            </p>
          </div>
          {!isSampleMode && (
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>
                {showAddForm
                  ? 'Close Form'
                  : subTab === 'purchases'
                    ? 'Add Purchase'
                    : 'Record Payment'}
              </span>
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          <button
            type="button"
            onClick={() => setSubTab('purchases')}
            className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'purchases'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Purchases ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('payments')}
            className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'payments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payments Ledger ({payments.length})
          </button>
        </div>

        {/* Add Purchase or Payment Form */}
        {showAddForm && !isSampleMode && subTab === 'purchases' && (
          <form onSubmit={handlePurchaseSubmit} className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value as CommodityType)}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="onion">Onion (प्याज)</option>
              <option value="garlic">Garlic (लहसुन)</option>
            </select>
            <input
              type="text"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="Variety / Grade"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="text"
              required
              value={farmerName}
              onChange={(e) => setFarmerName(e.target.value)}
              placeholder="Farmer Name *"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="Village"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <input
              type="number"
              value={bags}
              onChange={(e) => setBags(e.target.value)}
              placeholder="Bags"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Weight (kg)"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <input
              type="number"
              value={ratePerKg}
              onChange={(e) => setRatePerKg(e.target.value)}
              placeholder="Rate (INR/kg)"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="Paid Now (INR)"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <select
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque')
              }
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Purchase'}
            </button>
          </form>
        )}

        {showAddForm && !isSampleMode && subTab === 'payments' && (
          <form onSubmit={handlePaymentSubmit} className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <select
              value={payDirection}
              onChange={(e) => setPayDirection(e.target.value as 'outgoing' | 'incoming')}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="outgoing">Paid to Farmer / Expense</option>
              <option value="incoming">Received from Buyer</option>
            </select>
            <input
              type="text"
              required
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="Farmer or Buyer Name *"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="number"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount (INR) *"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <select
              value={payMethod}
              onChange={(e) =>
                setPayMethod(e.target.value as 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque')
              }
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / Reference / Receipt"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm sm:col-span-2"
            />
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Payment'}
            </button>
          </form>
        )}
      </div>

      {/* Purchases Table */}
      {subTab === 'purchases' ? (
        purchases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-base font-bold text-slate-900">No purchase bills recorded</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Farmer & Village</th>
                    <th className="px-4 py-3">Commodity</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Due</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map((p) => {
                    const due = Math.max(0, p.totalAmount - p.paidAmount);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-xs text-slate-600 font-mono-num whitespace-nowrap">
                          {p.date}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{p.farmerName}</p>
                          <p className="text-xs text-slate-500">{p.village || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold capitalize text-slate-800">{p.commodity}</span>
                          {p.variety ? ` · ${p.variety}` : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-num text-slate-700">
                          {formatNumber(p.bags)} bags · {formatNumber(p.weightKg)} kg
                        </td>
                        <td className="px-4 py-3 text-right font-mono-num font-bold text-slate-900">
                          {formatINR(p.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-num text-emerald-700">
                          {formatINR(p.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-num font-bold text-rose-700">
                          {formatINR(due)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Paid
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <span className="text-xs font-bold capitalize text-amber-700">
                                {p.status}
                              </span>
                              {!isSampleMode && due > 0 && (
                                <button
                                  type="button"
                                  onClick={() => void handleSettleBalance(p)}
                                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 whitespace-nowrap"
                                >
                                  Settle Due
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-base font-bold text-slate-900">No payments recorded yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Method & Ref</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono-num whitespace-nowrap">
                      {pay.date}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold">
                      <span
                        className={
                          pay.direction === 'incoming' ? 'text-emerald-700' : 'text-rose-700'
                        }
                      >
                        {pay.direction === 'incoming' ? 'Received (+)' : 'Paid Out (-)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{pay.partyName}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {pay.method}
                      {pay.reference ? ` · ${pay.reference}` : ''}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono-num font-bold ${
                        pay.direction === 'incoming' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {formatINR(pay.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
