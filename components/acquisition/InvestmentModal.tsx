import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { ReceiptText, X } from 'lucide-react';
import { TrafficCampaign } from '../../types';
import { parseCurrencyInput } from '../../lib/currency';

interface InvestmentModalProps {
  campaign: TrafficCampaign;
  selectedMonth: string;
  onClose: () => void;
  onSave: (campaignId: string, amount: number, date: Date) => Promise<boolean>;
}

const fieldClass = 'mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#090e19] px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10 [color-scheme:dark]';
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-400';

const localDateKey = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const lastDayOfMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber, 0);
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function InvestmentModal({ campaign, selectedMonth, onClose, onSave }: InvestmentModalProps) {
  const today = localDateKey();
  const monthStart = selectedMonth + '-01';
  const monthEnd = useMemo(() => lastDayOfMonth(selectedMonth), [selectedMonth]);
  const allowedStart = campaign.startDate > monthStart ? campaign.startDate : monthStart;
  const allowedEnd = campaign.endDate && campaign.endDate < monthEnd ? campaign.endDate : monthEnd;
  const hasValidPeriod = allowedStart <= allowedEnd;
  const defaultDate = today >= allowedStart && today <= allowedEnd ? today : allowedStart;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, saving]);

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !saving) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = parseCurrencyInput(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('Informe uma cobrança maior que zero.');
      return;
    }
    if (!hasValidPeriod || !date || date < allowedStart || date > allowedEnd) {
      alert('A data da cobrança precisa estar dentro do mês selecionado e da vigência da campanha.');
      return;
    }

    setSaving(true);
    try {
      const saved = await onSave(campaign.id, parsedAmount, new Date(date + 'T12:00:00'));
      if (saved) onClose();
    } finally {
      setSaving(false);
    }
  };

  return <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="investment-form-title"
    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    onMouseDown={closeFromBackdrop}
  >
    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1424] shadow-2xl">
      <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
            <ReceiptText size={19}/>
          </span>
          <div>
            <b id="investment-form-title" className="text-lg text-white">Registrar cobrança</b>
            <p className="mt-1 text-xs text-slate-500">{campaign.name}</p>
          </div>
        </div>
        <button type="button" aria-label="Fechar" disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-40" onClick={onClose}>
          <X size={20}/>
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-5 p-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-4 text-xs leading-relaxed text-slate-400 sm:col-span-2">
          Cada cobrança vira uma despesa de <b className="text-blue-300">Tráfego pago</b> no Financeiro e entra no total desta campanha.
        </div>
        {!hasValidPeriod && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-xs leading-relaxed text-amber-200 sm:col-span-2">
          Esta campanha não estava vigente no mês selecionado. Navegue até um mês dentro do período da campanha para adicionar a cobrança.
        </div>}
        <label className={labelClass}>Valor cobrado · BRL
          <input
            required
            autoFocus
            inputMode="decimal"
            className={fieldClass}
            placeholder="Ex: 500,00"
            value={amount}
            onChange={event => setAmount(event.target.value)}
          />
        </label>
        <label className={labelClass}>Data da cobrança
          <input
            required
            type="date"
            min={allowedStart}
            max={allowedEnd}
            className={fieldClass}
            value={date}
            disabled={!hasValidPeriod}
            onChange={event => setDate(event.target.value)}
          />
        </label>

        <div className="flex justify-end gap-3 border-t border-white/5 pt-5 sm:col-span-2">
          <button type="button" disabled={saving} onClick={onClose} className="px-5 py-3 text-sm text-slate-400 hover:text-white disabled:opacity-40">Cancelar</button>
          <button type="submit" disabled={saving || !hasValidPeriod} className="btn-glow-primary min-w-36 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Salvando...' : 'Adicionar cobrança'}
          </button>
        </div>
      </form>
    </div>
  </div>;
}
