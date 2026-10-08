import { useMemo, useState } from 'react';
import { Edit2, Search, Trash2 } from 'lucide-react';
import { AcquisitionSource, Client, ClientPaymentStatus, ClientProjectStatus, TrafficCampaign } from '../../types';

interface ClientPortfolioProps {
  clients: Client[];
  campaigns: TrafficCampaign[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => Promise<void>;
}

const paymentLabels: Record<ClientPaymentStatus, string> = {
  pending: 'Não pago',
  half: 'Pagamento parcial',
  paid: '100% pago'
};

const paymentStyles: Record<ClientPaymentStatus, string> = {
  pending: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  half: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  paid: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
};

const stageLabels: Record<ClientProjectStatus, string> = {
  awaiting_info: 'Aguardando informações',
  started: 'Iniciado',
  review: 'Em revisão',
  delivered: 'Entregue'
};

const sourceLabels: Record<AcquisitionSource, string> = {
  not_informed: 'Origem não informada',
  paid_traffic: 'Tráfego pago',
  active_prospecting: 'Prospecção ativa',
  organic: 'Orgânico',
  referral: 'Indicação',
  partnership: 'Parceria',
  other: 'Outro'
};

const currencies = ['BRL', 'USD', 'EUR'] as const;
const fieldClass = 'mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#090e19] px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10';

const money = (value: number, currency: Client['currency']) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency });

const formatDate = (date?: string) => date
  ? new Date(date.includes('T') ? date : `${date}T12:00:00`).toLocaleDateString('pt-BR')
  : '--';

function ClientActions({ client, onEdit, onDelete }: { client: Client; onEdit: (client: Client) => void; onDelete: (id: string) => Promise<void> }) {
  const remove = () => {
    if (window.confirm(`Excluir o cliente ${client.name}?`)) void onDelete(client.id);
  };

  return <div className="flex items-center justify-end gap-1">
    <button
      type="button"
      aria-label={`Editar ${client.name}`}
      title="Editar"
      className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
      onClick={() => onEdit(client)}
    >
      <Edit2 size={16}/>
    </button>
    <button
      type="button"
      aria-label={`Excluir ${client.name}`}
      title="Excluir"
      className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
      onClick={remove}
    >
      <Trash2 size={16}/>
    </button>
  </div>;
}

export default function ClientPortfolio({ clients, campaigns, onEdit, onDelete }: ClientPortfolioProps) {
  const [query, setQuery] = useState('');
  const campaignNames = useMemo(
    () => new Map(campaigns.map(campaign => [campaign.id, campaign.name])),
    [campaigns]
  );
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const visibleClients = useMemo(() => clients.filter(client =>
    [
      client.name,
      client.contact,
      client.project,
      client.acquisitionDetail,
      sourceLabels[client.acquisitionSource || 'not_informed'],
      client.trafficCampaignId ? campaignNames.get(client.trafficCampaignId) : ''
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedQuery)
  ), [campaignNames, clients, normalizedQuery]);

  const contractedTotals = useMemo(() => currencies
    .map(currency => {
      const total = clients
        .filter(client => client.currency === currency)
        .reduce((sum, client) => sum + client.amount, 0);
      return total ? money(total, currency) : '';
    })
    .filter(Boolean)
    .join(' · ') || money(0, 'BRL'), [clients]);

  return <section className="dashboard-card min-w-0 p-4 sm:p-5">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-bold text-white">Carteira de clientes</h2>
        <p className="mt-1 text-xs text-slate-500">{clients.length} clientes · {contractedTotals} contratados</p>
      </div>
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-4 top-4 text-slate-500" size={16}/>
        <input
          aria-label="Buscar cliente, projeto ou origem"
          className={`${fieldClass} !mt-0 !pl-11`}
          placeholder="Buscar cliente, projeto ou origem..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
    </div>

    {!visibleClients.length ? <p className="py-16 text-center text-slate-500">Nenhum cliente encontrado.</p> : <>
      <div className="grid gap-3 lg:hidden">
        {visibleClients.map(client => <article key={client.id} className="rounded-2xl border border-white/[0.08] bg-[#0c111e]/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{client.name}</p>
              <p className="truncate text-xs text-slate-500">{client.contact || 'Sem contato'}</p>
            </div>
            <ClientActions client={client} onEdit={onEdit} onDelete={onDelete}/>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Projeto</p>
              <p className="mt-1 text-slate-300">{client.project || 'Não informado'}</p>
              <p className="mt-1 text-xs text-slate-500">{client.pageCount || 1} página(s)</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Valor</p>
              <p className="mt-1 font-bold text-white">{money(client.amount, client.currency)}</p>
              <p className="mt-1 text-xs text-slate-500">Recebido: {money(client.paidAmount || 0, client.currency)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStyles[client.paymentStatus]}`}>{paymentLabels[client.paymentStatus]}</span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-400">{stageLabels[client.projectStatus]}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
              {sourceLabels[client.acquisitionSource || 'not_informed']}
            </span>
            {client.trafficCampaignId && campaignNames.get(client.trafficCampaignId) && (
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300">
                {campaignNames.get(client.trafficCampaignId)}
              </span>
            )}
            {client.closedAfterFollowUp && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">Follow-up</span>
            )}
          </div>
          <p className="mt-2 text-[10px] text-slate-600">Conquistado em {formatDate(client.acquiredAt || client.createdAt)}</p>
          <p className="mt-3 text-xs text-slate-500">{formatDate(client.startedAt)} → {formatDate(client.deliveredAt)}</p>
        </article>)}
      </div>

      <div className="relative hidden overflow-x-auto rounded-2xl border border-white/10 lg:block">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
          <thead className="bg-[#111725]">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Cliente</th>
              <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Projeto</th>
              <th className="hidden px-3 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 2xl:table-cell">Páginas</th>
              <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Valor</th>
              <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Pagamento</th>
              <th className="hidden px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 xl:table-cell">Etapa</th>
              <th className="hidden px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 2xl:table-cell">Início / final</th>
              <th className="sticky right-0 z-30 w-24 border-l border-white/10 bg-[#111725] px-3 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {visibleClients.map(client => <tr key={client.id} className="group bg-[#0c111e]/60 hover:bg-white/[0.025]">
              <td className="px-4 py-4">
                <p className="truncate font-semibold text-white">{client.name}</p>
                <p className="truncate text-xs text-slate-500">{client.contact || '--'}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300">
                    {sourceLabels[client.acquisitionSource || 'not_informed']}
                  </span>
                  {client.closedAfterFollowUp && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">Follow-up</span>}
                </div>
                <p className="mt-1 text-[10px] text-slate-600">Conquistado: {formatDate(client.acquiredAt || client.createdAt)}</p>
              </td>
              <td className="px-4 py-4 text-sm text-slate-300">
                <p className="truncate">{client.project || 'Não informado'}</p>
                {client.trafficCampaignId && campaignNames.get(client.trafficCampaignId) && (
                  <p className="mt-1 truncate text-[10px] text-violet-300">{campaignNames.get(client.trafficCampaignId)}</p>
                )}
                <p className="mt-1 truncate text-[10px] text-slate-500 xl:hidden">{stageLabels[client.projectStatus]} · {client.pageCount || 1} página(s)</p>
              </td>
              <td className="hidden px-3 py-4 font-bold text-white 2xl:table-cell">{client.pageCount || 1}</td>
              <td className="whitespace-nowrap px-4 py-4 font-bold text-white">{money(client.amount, client.currency)}</td>
              <td className="px-4 py-4">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStyles[client.paymentStatus]}`}>{paymentLabels[client.paymentStatus]}</span>
                <p className="mt-1 truncate text-[10px] text-slate-500">{client.paymentMethod === 'card' ? 'Cartão' : 'Pix'} · {money(client.paidAmount || 0, client.currency)}</p>
              </td>
              <td className="hidden px-4 py-4 text-sm text-slate-300 xl:table-cell">{stageLabels[client.projectStatus]}</td>
              <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-slate-400 2xl:table-cell">{formatDate(client.startedAt)} <span className="mx-1 text-slate-600">→</span> {formatDate(client.deliveredAt)}</td>
              <td className="sticky right-0 z-20 border-l border-white/[0.06] bg-[#0c111e] px-2 py-4 shadow-[-12px_0_18px_-16px_rgba(0,0,0,0.9)] transition-colors group-hover:bg-[#111725]">
                <ClientActions client={client} onEdit={onEdit} onDelete={onDelete}/>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </>}
  </section>;
}
