import { FormEvent, MouseEvent, useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { TrafficCampaign, TrafficCampaignPlatform, TrafficCampaignStatus } from '../../types';
import { parseCurrencyInput } from '../../lib/currency';

export type TrafficCampaignInput = Omit<TrafficCampaign, 'id' | 'createdAt'>;

interface CampaignFormModalProps {
  campaign?: TrafficCampaign;
  onClose: () => void;
  onSave: (campaign: TrafficCampaignInput) => Promise<boolean>;
}

const platformLabels: Record<TrafficCampaignPlatform, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  tiktok_ads: 'TikTok Ads',
  linkedin_ads: 'LinkedIn Ads',
  other: 'Outra plataforma'
};

const statusLabels: Record<TrafficCampaignStatus, string> = {
  active: 'ON · Ativa',
  paused: 'Pausada',
  completed: 'Encerrada'
};

const localDateKey = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const emptyCampaign: TrafficCampaignInput = {
  name: '',
  platform: 'meta_ads',
  status: 'active',
  monthlyBudget: 0,
  startDate: localDateKey(),
  endDate: '',
  notes: ''
};

const fieldClass = 'mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#090e19] px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-violet-500/70 focus:ring-4 focus:ring-violet-500/10 [color-scheme:dark]';
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-400';

const toInput = (campaign: TrafficCampaign): TrafficCampaignInput => ({
  name: campaign.name,
  platform: campaign.platform,
  status: campaign.status,
  monthlyBudget: campaign.monthlyBudget,
  startDate: campaign.startDate,
  endDate: campaign.endDate || '',
  notes: campaign.notes || ''
});

export default function CampaignFormModal({ campaign, onClose, onSave }: CampaignFormModalProps) {
  const [form, setForm] = useState<TrafficCampaignInput>(() => campaign ? toInput(campaign) : emptyCampaign);
  const [budget, setBudget] = useState(() =>
    campaign?.monthlyBudget
      ? campaign.monthlyBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : ''
  );
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
    const monthlyBudget = budget.trim() ? parseCurrencyInput(budget) : 0;
    if (!form.name.trim()) return;
    if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
      alert('Informe um orçamento mensal válido.');
      return;
    }
    if (form.status === 'completed' && !form.endDate) {
      alert('Informe a data de encerramento da campanha.');
      return;
    }
    if (form.endDate && form.endDate < form.startDate) {
      alert('A data final não pode ser anterior ao início.');
      return;
    }

    setSaving(true);
    try {
      const saved = await onSave({
        ...form,
        name: form.name.trim(),
        monthlyBudget,
        endDate: form.status === 'completed' ? form.endDate : ''
      });
      if (saved) onClose();
    } finally {
      setSaving(false);
    }
  };

  return <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="campaign-form-title"
    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    onMouseDown={closeFromBackdrop}
  >
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1424] shadow-2xl">
      <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
            <Megaphone size={19}/>
          </span>
          <div>
            <b id="campaign-form-title" className="text-lg text-white">{campaign ? 'Editar campanha' : 'Nova campanha'}</b>
            <p className="mt-1 text-xs text-slate-500">Cadastre os tráfegos que estão rodando agora.</p>
          </div>
        </div>
        <button type="button" aria-label="Fechar" disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-40" onClick={onClose}>
          <X size={20}/>
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-5 p-6 md:grid-cols-2">
        <label className={`${labelClass} md:col-span-2`}>Nome da campanha
          <input
            required
            autoFocus
            className={fieldClass}
            placeholder="Ex: Landing pages · Outubro"
            value={form.name}
            onChange={event => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className={labelClass}>Plataforma
          <select className={fieldClass} value={form.platform} onChange={event => setForm({ ...form, platform: event.target.value as TrafficCampaignPlatform })}>
            {Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={labelClass}>Status
          <select className={fieldClass} value={form.status} onChange={event => setForm({ ...form, status: event.target.value as TrafficCampaignStatus })}>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={labelClass}>Orçamento mensal · BRL
          <input
            className={fieldClass}
            inputMode="decimal"
            placeholder="Ex: 1.500,00"
            value={budget}
            onChange={event => setBudget(event.target.value)}
          />
        </label>
        <label className={labelClass}>Data de início
          <input required type="date" className={fieldClass} value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })}/>
        </label>
        {form.status === 'completed' && <label className={labelClass}>Data de encerramento
          <input required min={form.startDate} type="date" className={fieldClass} value={form.endDate} onChange={event => setForm({ ...form, endDate: event.target.value })}/>
        </label>}
        <label className={`${labelClass} md:col-span-2`}>Observações
          <textarea
            className={`${fieldClass} min-h-24 py-3`}
            placeholder="Público, criativo, objetivo ou qualquer contexto útil..."
            value={form.notes}
            onChange={event => setForm({ ...form, notes: event.target.value })}
          />
        </label>

        <div className="flex justify-end gap-3 border-t border-white/5 pt-5 md:col-span-2">
          <button type="button" disabled={saving} onClick={onClose} className="px-5 py-3 text-sm text-slate-400 hover:text-white disabled:opacity-40">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-glow-primary min-w-36 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar campanha'}
          </button>
        </div>
      </form>
    </div>
  </div>;
}
