import { FormEvent, MouseEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  AcquisitionSource,
  Client,
  ClientPaymentMethod,
  ClientPaymentStatus,
  ClientProjectStatus,
  TrafficCampaign
} from '../../types';
import { parseCurrencyInput } from '../../lib/currency';

export type ClientInput = Omit<Client, 'id' | 'createdAt'>;
type PaymentMode = 'none' | 'half' | 'full' | 'custom';

interface ClientFormModalProps {
  client?: Client;
  campaigns: TrafficCampaign[];
  onClose: () => void;
  onSave: (client: ClientInput) => Promise<boolean>;
}

const stages: Record<ClientProjectStatus, string> = {
  awaiting_info: 'Aguardando informações',
  started: 'Iniciado',
  review: 'Em revisão',
  delivered: 'Entregue'
};

const acquisitionSources: Record<AcquisitionSource, string> = {
  not_informed: 'Selecione a origem',
  paid_traffic: 'Tráfego pago',
  active_prospecting: 'Prospecção ativa',
  organic: 'Orgânico / conteúdo',
  referral: 'Indicação',
  partnership: 'Parceria',
  other: 'Outro'
};

const localDateKey = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const blankClient: ClientInput = {
  name: '',
  contact: '',
  project: '',
  amount: 0,
  paymentStatus: 'pending',
  paymentMethod: 'pix',
  paidAmount: 0,
  paymentDate: '',
  currency: 'BRL',
  projectStatus: 'awaiting_info',
  pageCount: 1,
  startedAt: '',
  deliveredAt: '',
  acquisitionSource: 'not_informed',
  closedAfterFollowUp: undefined,
  trafficCampaignId: '',
  acquiredAt: localDateKey(),
  acquisitionDetail: '',
  notes: ''
};

const fieldClass = 'mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#090e19] px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 [color-scheme:dark]';
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-400';
const roundMoney = (value: number) => Number(value.toFixed(2));
const money = (value: number, currency: Client['currency']) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency });

const toClientInput = (client: Client): ClientInput => ({
  name: client.name,
  contact: client.contact || '',
  project: client.project || '',
  amount: client.amount,
  currency: client.currency || 'BRL',
  paymentStatus: client.paymentStatus,
  paymentMethod: client.paymentMethod || 'pix',
  paidAmount: client.paidAmount || 0,
  paymentDate: client.paymentDate || '',
  projectStatus: client.projectStatus,
  pageCount: client.pageCount || 1,
  startedAt: client.startedAt || '',
  deliveredAt: client.deliveredAt || '',
  acquisitionSource: client.acquisitionSource || 'not_informed',
  closedAfterFollowUp: client.closedAfterFollowUp,
  trafficCampaignId: client.trafficCampaignId || '',
  acquiredAt: client.acquiredAt || '',
  acquisitionDetail: client.acquisitionDetail || '',
  notes: client.notes || ''
});

export default function ClientFormModal({ client, campaigns, onClose, onSave }: ClientFormModalProps) {
  const editing = Boolean(client);
  const [form, setForm] = useState<ClientInput>(() => client ? toClientInput(client) : blankClient);
  const [amount, setAmount] = useState(() => client ? client.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
  const [customPayment, setCustomPayment] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(client ? 'none' : 'full');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, saving]);

  const parsedAmount = parseCurrencyInput(amount);
  const alreadyReceived = client?.paidAmount || 0;
  const paymentBalance = Number.isFinite(parsedAmount)
    ? Math.max(0, roundMoney(parsedAmount - alreadyReceived))
    : 0;

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !saving) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const total = parseCurrencyInput(amount);
    const remaining = roundMoney(total - alreadyReceived);
    const halfPayment = roundMoney(total / 2);
    const newPayment = paymentMode === 'none'
      ? 0
      : paymentMode === 'full'
        ? remaining
        : paymentMode === 'half'
          ? editing ? Math.min(remaining, halfPayment) : halfPayment
          : parseCurrencyInput(customPayment);
    const received = roundMoney(alreadyReceived + newPayment);

    if (!Number.isFinite(total) || total <= 0) {
      alert('Informe um valor total válido.');
      return;
    }
    if (!Number.isFinite(newPayment) || newPayment < 0 || received > total) {
      alert('O novo pagamento deve estar entre zero e o saldo restante.');
      return;
    }
    if (paymentMode !== 'none' && newPayment <= 0) {
      alert('Informe um valor maior que zero para o novo pagamento.');
      return;
    }
    if (paymentMode !== 'none' && !paymentDate) {
      alert('Informe a data do novo recebimento.');
      return;
    }
    if (form.startedAt && form.deliveredAt && form.deliveredAt < form.startedAt) {
      alert('A data final não pode ser anterior à data de início.');
      return;
    }

    if (!editing && form.acquisitionSource === 'not_informed') {
      alert('Informe como este cliente foi conquistado.');
      return;
    }
    if (form.acquisitionSource !== 'not_informed' && !form.acquiredAt) {
      alert('Informe a data em que o cliente foi conquistado.');
      return;
    }

    const paymentStatus: ClientPaymentStatus = received <= 0 ? 'pending' : received >= total ? 'paid' : 'half';
    const payload: ClientInput = {
      ...form,
      amount: total,
      paidAmount: received,
      paymentStatus,
      paymentDate: newPayment > 0 ? paymentDate : form.paymentDate,
      trafficCampaignId: form.acquisitionSource === 'paid_traffic' ? form.trafficCampaignId : '',
      deliveredAt: form.projectStatus === 'delivered' ? form.deliveredAt : ''
    };

    setSaving(true);
    try {
      if (await onSave(payload)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="client-form-title"
    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    onMouseDown={closeFromBackdrop}
  >
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1424]">
      <div className="flex justify-between border-b border-white/10 px-6 py-5">
        <div>
          <b id="client-form-title" className="text-lg text-white">{editing ? 'Editar' : 'Novo'} cliente</b>
          <p className="mt-1 text-xs text-slate-500">Projeto, aquisição, pagamento e produção</p>
        </div>
        <button type="button" aria-label="Fechar" disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-40" onClick={onClose}>
          <X size={20}/>
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-5 p-6 md:grid-cols-2">
        <label className={labelClass}>Nome do cliente
          <input required className={fieldClass} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/>
        </label>
        <label className={labelClass}>Contato
          <input className={fieldClass} value={form.contact} onChange={event => setForm({ ...form, contact: event.target.value })}/>
        </label>
        <label className={labelClass}>Projeto
          <input className={fieldClass} placeholder="Ex: Landing page" value={form.project} onChange={event => setForm({ ...form, project: event.target.value })}/>
        </label>
        <label className={labelClass}>Quantidade de páginas
          <input type="number" min="1" required className={fieldClass} value={form.pageCount} onChange={event => setForm({ ...form, pageCount: Math.max(1, Number(event.target.value)) })}/>
        </label>

        <div className="md:col-span-2 rounded-2xl border border-blue-500/15 bg-blue-500/[0.035] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-300">Aquisição do cliente</p>
          <p className="mt-1 text-xs normal-case tracking-normal text-slate-500">Origem e toque de conversão são separados para a atribuição ficar fiel.</p>
        </div>

        <label className={labelClass}>Origem principal
          <select
            required
            className={fieldClass}
            value={form.acquisitionSource}
            onChange={event => setForm({
              ...form,
              acquisitionSource: event.target.value as AcquisitionSource,
              trafficCampaignId: event.target.value === 'paid_traffic' ? form.trafficCampaignId : ''
            })}
          >
            {Object.entries(acquisitionSources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={labelClass}>Data da conquista
          <input
            type="date"
            required={form.acquisitionSource !== 'not_informed'}
            className={fieldClass}
            value={form.acquiredAt}
            onChange={event => setForm({ ...form, acquiredAt: event.target.value })}
          />
        </label>

        {form.acquisitionSource === 'paid_traffic' && <label className={labelClass}>Campanha
          <select
            className={fieldClass}
            value={form.trafficCampaignId}
            onChange={event => setForm({ ...form, trafficCampaignId: event.target.value })}
          >
            <option value="">Tráfego sem campanha identificada</option>
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}{campaign.status === 'active' ? ' · ON' : ''}
              </option>
            ))}
          </select>
        </label>}
        <label className={labelClass}>Fechou após follow-up?
          <select
            className={fieldClass}
            value={form.closedAfterFollowUp === undefined ? '' : form.closedAfterFollowUp ? 'yes' : 'no'}
            onChange={event => setForm({
              ...form,
              closedAfterFollowUp: event.target.value === '' ? undefined : event.target.value === 'yes'
            })}
          >
            <option value="">Não informado</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </label>
        <label className={`${labelClass} ${form.acquisitionSource === 'paid_traffic' ? 'md:col-span-2' : ''}`}>Detalhe da origem
          <input
            className={fieldClass}
            placeholder="Ex: indicação da Ana, lista outbound, campanha de outubro..."
            value={form.acquisitionDetail}
            onChange={event => setForm({ ...form, acquisitionDetail: event.target.value })}
          />
        </label>

        <div className="grid grid-cols-[1fr_120px] gap-3">
          <label className={labelClass}>Valor total
            <input required className={fieldClass} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)}/>
          </label>
          <label className={labelClass}>Moeda
            <select className={fieldClass} value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value as Client['currency'] })}>
              <option value="BRL">R$ Real</option>
              <option value="USD">$ Dólar</option>
              <option value="EUR">EUR Euro</option>
            </select>
          </label>
        </div>

        <label className={labelClass}>Forma de pagamento
          <select className={fieldClass} value={form.paymentMethod} onChange={event => setForm({ ...form, paymentMethod: event.target.value as ClientPaymentMethod })}>
            <option value="pix">Pix</option>
            <option value="card">Cartão</option>
          </select>
        </label>

        {editing && <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:col-span-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Já recebido</p>
            <p className="mt-1 font-bold text-emerald-300">{money(alreadyReceived, form.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Saldo restante</p>
            <p className="mt-1 font-bold text-white">{money(paymentBalance, form.currency)}</p>
          </div>
        </div>}

        <label className={labelClass}>{editing ? 'Novo recebimento' : 'Recebimento'}
          <select className={fieldClass} value={paymentMode} onChange={event => setPaymentMode(event.target.value as PaymentMode)}>
            <option value="none">{editing ? 'Sem novo pagamento' : 'Ainda não recebido'}</option>
            <option value="half">{editing ? 'Adicionar 50% do projeto' : '50% do projeto'}</option>
            <option value="full">{editing ? 'Quitar saldo restante' : '100% do projeto'}</option>
            <option value="custom">{editing ? 'Adicionar valor personalizado' : 'Valor personalizado'}</option>
          </select>
        </label>

        {paymentMode === 'custom' && <label className={labelClass}>{editing ? 'Valor deste pagamento' : 'Valor recebido'}
          <input required className={fieldClass} inputMode="decimal" placeholder="Ex: 1.250,00" value={customPayment} onChange={event => setCustomPayment(event.target.value)}/>
        </label>}

        <label className={labelClass}>{editing ? 'Data do novo recebimento' : 'Data do recebimento'}
          <input required={paymentMode !== 'none'} disabled={paymentMode === 'none'} type="date" className={`${fieldClass} disabled:opacity-40`} value={paymentDate} onChange={event => setPaymentDate(event.target.value)}/>
        </label>
        <label className={labelClass}>Etapa
          <select className={fieldClass} value={form.projectStatus} onChange={event => setForm({ ...form, projectStatus: event.target.value as ClientProjectStatus })}>
            {Object.entries(stages).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={labelClass}>Data de início
          <input type="date" required={form.projectStatus !== 'awaiting_info'} className={fieldClass} value={form.startedAt} onChange={event => setForm({ ...form, startedAt: event.target.value })}/>
        </label>
        <label className={labelClass}>Data final
          <input type="date" disabled={form.projectStatus !== 'delivered'} required={form.projectStatus === 'delivered'} min={form.startedAt} className={`${fieldClass} disabled:opacity-40`} value={form.deliveredAt} onChange={event => setForm({ ...form, deliveredAt: event.target.value })}/>
        </label>
        <label className={`${labelClass} md:col-span-2`}>Observações
          <textarea className={`${fieldClass} min-h-28 py-3`} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })}/>
        </label>

        <div className="flex justify-end gap-3 border-t border-white/5 pt-5 md:col-span-2">
          <button type="button" disabled={saving} onClick={onClose} className="px-5 py-3 text-slate-400 disabled:opacity-40">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-glow-primary min-w-36 rounded-xl px-6 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      </form>
    </div>
  </div>;
}
