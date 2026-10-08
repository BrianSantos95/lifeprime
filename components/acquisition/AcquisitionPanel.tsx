import { useMemo, useState } from 'react';
import {
  AlertCircle,
  DollarSign,
  Edit2,
  Megaphone,
  Plus,
  ReceiptText,
  Target,
  Trash2,
  TrendingUp,
  Users,
  WalletCards
} from 'lucide-react';
import {
  AcquisitionSource,
  Client,
  TrafficCampaign,
  Transaction
} from '../../types';
import CampaignFormModal, { TrafficCampaignInput } from './CampaignFormModal';
import InvestmentModal from './InvestmentModal';

interface AcquisitionPanelProps {
  clients: Client[];
  campaigns: TrafficCampaign[];
  transactions: Transaction[];
  selectedMonth: string;
  onAddCampaign: (campaign: TrafficCampaignInput) => Promise<boolean>;
  onEditCampaign: (id: string, campaign: TrafficCampaignInput) => Promise<boolean>;
  onDeleteCampaign: (id: string) => Promise<void>;
  onAddInvestment: (campaignId: string, amount: number, date: Date) => Promise<boolean>;
}

const sourceConfig: Record<AcquisitionSource, { label: string; bar: string; dot: string }> = {
  paid_traffic: { label: 'Tráfego pago', bar: 'bg-blue-500', dot: 'bg-blue-400' },
  active_prospecting: { label: 'Prospecção ativa', bar: 'bg-violet-500', dot: 'bg-violet-400' },
  organic: { label: 'Orgânico / conteúdo', bar: 'bg-emerald-500', dot: 'bg-emerald-400' },
  referral: { label: 'Indicação', bar: 'bg-amber-500', dot: 'bg-amber-400' },
  partnership: { label: 'Parceria', bar: 'bg-cyan-500', dot: 'bg-cyan-400' },
  other: { label: 'Outro', bar: 'bg-slate-500', dot: 'bg-slate-400' },
  not_informed: { label: 'Não informado', bar: 'bg-rose-500', dot: 'bg-rose-400' }
};

const platformLabels: Record<TrafficCampaign['platform'], string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  tiktok_ads: 'TikTok Ads',
  linkedin_ads: 'LinkedIn Ads',
  other: 'Outra'
};

const statusConfig: Record<TrafficCampaign['status'], { label: string; classes: string }> = {
  active: { label: 'ON', classes: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
  paused: { label: 'Pausada', classes: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  completed: { label: 'Encerrada', classes: 'border-slate-500/25 bg-slate-500/10 text-slate-400' }
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const decimal = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const dateInMonth = (date: string | undefined, month: string) =>
  Boolean(date && date.slice(0, 7) === month);

const transactionInMonth = (date: Date, month: string) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return false;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}` === month;
};

export default function AcquisitionPanel({
  clients,
  campaigns,
  transactions,
  selectedMonth,
  onAddCampaign,
  onEditCampaign,
  onDeleteCampaign,
  onAddInvestment
}: AcquisitionPanelProps) {
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<TrafficCampaign>();
  const [investmentCampaign, setInvestmentCampaign] = useState<TrafficCampaign>();

  const metrics = useMemo(() => {
    const acquiredClients = clients.filter(client =>
      dateInMonth(client.acquiredAt || client.createdAt, selectedMonth)
    );
    const trafficClients = acquiredClients.filter(client =>
      client.acquisitionSource === 'paid_traffic'
    );
    const campaignExpenses = transactions.filter(transaction =>
      transaction.type === 'expense'
      && Boolean(transaction.campaignId)
      && transactionInMonth(transaction.date, selectedMonth)
    );
    const totalInvestment = campaignExpenses.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const brlTrafficClients = trafficClients.filter(client => client.currency === 'BRL');
    const attributedRevenue = brlTrafficClients.reduce((sum, client) => sum + Number(client.amount || 0), 0);
    const receivedRevenue = brlTrafficClients.reduce((sum, client) => sum + Number(client.paidAmount || 0), 0);
    const cac = totalInvestment > 0 && trafficClients.length
      ? totalInvestment / trafficClients.length
      : null;
    const roas = totalInvestment > 0 ? attributedRevenue / totalInvestment : null;
    const mediaRoi = totalInvestment > 0
      ? (attributedRevenue - totalInvestment) / totalInvestment * 100
      : null;
    const sourceCounts = (Object.keys(sourceConfig) as AcquisitionSource[])
      .map(source => ({
        source,
        count: acquiredClients.filter(client => (client.acquisitionSource || 'not_informed') === source).length,
        ...sourceConfig[source]
      }))
      .sort((a, b) => b.count - a.count);
    const followUpKnown = acquiredClients.filter(client => client.closedAfterFollowUp !== undefined);
    const followUpCount = followUpKnown.filter(client => client.closedAfterFollowUp).length;

    const campaignRows = campaigns
      .map(campaign => {
        const campaignClients = trafficClients.filter(client => client.trafficCampaignId === campaign.id);
        const campaignRevenue = campaignClients
          .filter(client => client.currency === 'BRL')
          .reduce((sum, client) => sum + Number(client.amount || 0), 0);
        const investments = campaignExpenses
          .filter(transaction => transaction.campaignId === campaign.id)
          .sort((a, b) => b.date.getTime() - a.date.getTime());
        const spend = investments.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
        return {
          campaign,
          investments,
          spend,
          clients: campaignClients.length,
          foreignClients: campaignClients.filter(client => client.currency !== 'BRL').length,
          revenue: campaignRevenue,
          cac: spend > 0 && campaignClients.length ? spend / campaignClients.length : null,
          roas: spend > 0 ? campaignRevenue / spend : null,
          roi: spend > 0 ? (campaignRevenue - spend) / spend * 100 : null
        };
      })
      .sort((a, b) => {
        const order = { active: 0, paused: 1, completed: 2 };
        return order[a.campaign.status] - order[b.campaign.status]
          || a.campaign.name.localeCompare(b.campaign.name, 'pt-BR');
      });

    return {
      acquiredClients,
      trafficClients,
      totalInvestment,
      attributedRevenue,
      receivedRevenue,
      cac,
      roas,
      mediaRoi,
      totalCharges: campaignExpenses.length,
      sourceCounts,
      followUpKnown: followUpKnown.length,
      followUpCount,
      foreignClients: trafficClients.length - brlTrafficClients.length,
      unknownClients: acquiredClients.filter(client => !client.acquisitionSource || client.acquisitionSource === 'not_informed').length,
      unattributedTraffic: trafficClients.filter(client => !client.trafficCampaignId).length,
      campaignRows
    };
  }, [campaigns, clients, selectedMonth, transactions]);

  const comparisonMax = Math.max(metrics.totalInvestment, metrics.attributedRevenue, 1);
  const trafficShare = metrics.acquiredClients.length
    ? Math.round(metrics.trafficClients.length / metrics.acquiredClients.length * 100)
    : 0;
  const activeCampaigns = campaigns.filter(campaign => campaign.status === 'active').length;
  const hasDataAlert = metrics.unknownClients > 0
    || metrics.unattributedTraffic > 0
    || metrics.foreignClients > 0;

  const cards = [
    {
      label: 'Investido em tráfego',
      value: money(metrics.totalInvestment),
      detail: `${metrics.totalCharges} ${metrics.totalCharges === 1 ? 'cobrança registrada' : 'cobranças registradas'} no mês`,
      icon: WalletCards,
      color: 'text-blue-400'
    },
    {
      label: 'Clientes via tráfego',
      value: String(metrics.trafficClients.length),
      detail: `${trafficShare}% dos clientes conquistados no mês`,
      icon: Users,
      color: 'text-violet-400'
    },
    {
      label: 'CAC médio',
      value: metrics.cac === null ? '—' : money(metrics.cac),
      detail: metrics.totalInvestment <= 0
        ? 'investimento ainda não registrado'
        : metrics.trafficClients.length
          ? 'investimento ÷ clientes de tráfego'
          : 'sem clientes de tráfego no período',
      icon: Target,
      color: 'text-amber-400'
    },
    {
      label: 'ROAS contratado',
      value: metrics.roas === null ? '—' : decimal(metrics.roas) + 'x',
      detail: metrics.mediaRoi === null
        ? 'registre investimento para calcular'
        : `ROI de mídia: ${metrics.mediaRoi >= 0 ? '+' : ''}${decimal(metrics.mediaRoi)}%`,
      icon: TrendingUp,
      color: metrics.mediaRoi !== null && metrics.mediaRoi < 0 ? 'text-rose-400' : 'text-emerald-400'
    }
  ];

  const openCampaignForm = (campaign?: TrafficCampaign) => {
    setEditingCampaign(campaign);
    setCampaignFormOpen(true);
  };

  const closeCampaignForm = () => {
    setCampaignFormOpen(false);
    setEditingCampaign(undefined);
  };

  const saveCampaign = (campaign: TrafficCampaignInput) =>
    editingCampaign
      ? onEditCampaign(editingCampaign.id, campaign)
      : onAddCampaign(campaign);

  return <div>
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {cards.map(card => <section key={card.label} className="dashboard-card relative overflow-hidden p-5">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/[0.04] blur-2xl"/>
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="mt-2 truncate text-2xl font-extrabold text-white">{card.value}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{card.detail}</p>
          </div>
          <card.icon size={20} className={card.color}/>
        </div>
      </section>)}
    </div>

    {hasDataAlert && <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-start">
      <AlertCircle className="mt-0.5 shrink-0 text-amber-300" size={18}/>
      <div>
        <p className="text-sm font-semibold text-amber-200">Há dados para completar</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-amber-200/75">
          {metrics.unknownClients > 0 && <span className="rounded-full border border-amber-500/20 px-2.5 py-1">{metrics.unknownClients} cliente(s) sem origem</span>}
          {metrics.unattributedTraffic > 0 && <span className="rounded-full border border-amber-500/20 px-2.5 py-1">{metrics.unattributedTraffic} tráfego(s) sem campanha</span>}
          {metrics.foreignClients > 0 && <span className="rounded-full border border-amber-500/20 px-2.5 py-1">{metrics.foreignClients} cliente(s) em moeda estrangeira fora do ROAS</span>}
        </div>
      </div>
    </section>}

    <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <section className="dashboard-card p-5">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Como os clientes chegaram</h2>
            <p className="mt-1 text-xs text-slate-500">Distribuição das conquistas no mês selecionado</p>
          </div>
          <Users size={20} className="text-violet-400"/>
        </div>
        {metrics.acquiredClients.length ? <div className="space-y-4">
          {metrics.sourceCounts.map(item => {
            const percentage = Math.round(item.count / metrics.acquiredClients.length * 100);
            return <div key={item.source}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-slate-300">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`}/>
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 font-semibold text-white">{item.count} <span className="font-normal text-slate-500">· {percentage}%</span></span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div className={`h-full rounded-full transition-all ${item.bar}`} style={{ width: percentage + '%' }}/>
              </div>
            </div>;
          })}
        </div> : <div className="flex min-h-52 flex-col items-center justify-center text-center">
          <Users size={28} className="mb-3 text-slate-700"/>
          <p className="text-sm font-semibold text-slate-400">Nenhum cliente conquistado neste mês</p>
          <p className="mt-1 text-xs text-slate-600">A origem aparecerá aqui ao cadastrar ou editar clientes.</p>
        </div>}

        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Impacto do follow-up</p>
          {metrics.followUpKnown ? <>
            <p className="mt-2 text-xl font-extrabold text-white">{metrics.followUpCount} de {metrics.followUpKnown}</p>
            <p className="mt-1 text-xs text-slate-500">clientes com resposta informada fecharam após follow-up</p>
          </> : <>
            <p className="mt-2 text-sm font-semibold text-slate-400">Ainda sem respostas registradas</p>
            <p className="mt-1 text-xs text-slate-600">Edite os clientes para informar se houve follow-up.</p>
          </>}
        </div>
      </section>

      <section className="dashboard-card p-5">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Retorno do tráfego</h2>
            <p className="mt-1 text-xs text-slate-500">Receita contratada em BRL x investimento</p>
          </div>
          <DollarSign size={20} className="text-emerald-400"/>
        </div>
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Receita contratada</span>
              <b className="text-emerald-300">{money(metrics.attributedRevenue)}</b>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: metrics.attributedRevenue / comparisonMax * 100 + '%' }}/>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Investimento</span>
              <b className="text-blue-300">{money(metrics.totalInvestment)}</b>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: metrics.totalInvestment / comparisonMax * 100 + '%' }}/>
            </div>
          </div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Já recebido</p>
            <p className="mt-2 text-base font-bold text-white">{money(metrics.receivedRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Saldo de mídia</p>
            <p className={`mt-2 text-base font-bold ${metrics.attributedRevenue - metrics.totalInvestment >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {money(metrics.attributedRevenue - metrics.totalInvestment)}
            </p>
          </div>
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-slate-600">
          ROI de mídia usa receita contratada menos investimento. Custos de produção, impostos e horas trabalhadas não entram neste cálculo.
        </p>
      </section>
    </div>

    <section className="dashboard-card min-w-0 p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white">Campanhas de tráfego</h2>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">{activeCampaigns} ON</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Cobranças do cartão, clientes e retorno por campanha.</p>
        </div>
        <button type="button" onClick={() => openCampaignForm()} className="btn-glow-primary flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white">
          <Plus size={17}/>Nova campanha
        </button>
      </div>

      {!metrics.campaignRows.length ? <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-5 text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
          <Megaphone size={22}/>
        </span>
        <p className="font-semibold text-white">Cadastre seu primeiro tráfego</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">Depois, vincule os clientes conquistados e adicione cada cobrança de Ads feita no cartão.</p>
        <button type="button" onClick={() => openCampaignForm()} className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]">
          Criar campanha
        </button>
      </div> : <div className="grid gap-4 xl:grid-cols-2">
        {metrics.campaignRows.map(row => {
          const status = statusConfig[row.campaign.status];
          return <article key={row.campaign.id} className="rounded-2xl border border-white/[0.08] bg-[#0b111e]/80 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-bold text-white">{row.campaign.name}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.classes}`}>{status.label}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{platformLabels[row.campaign.platform]} · desde {new Date(row.campaign.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" aria-label={`Editar ${row.campaign.name}`} title="Editar campanha" onClick={() => openCampaignForm(row.campaign)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-500/10 hover:text-blue-300">
                  <Edit2 size={15}/>
                </button>
                <button type="button" aria-label={`Excluir ${row.campaign.name}`} title="Excluir campanha" onClick={() => void onDeleteCampaign(row.campaign.id)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300">
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-600">Cobrado no mês</p>
                <p className="mt-1 text-sm font-bold text-white">{money(row.spend)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-600">Clientes</p>
                <p className="mt-1 text-sm font-bold text-white">{row.clients}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-600">CAC</p>
                <p className="mt-1 text-sm font-bold text-white">{row.cac === null ? '—' : money(row.cac)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-600">ROAS</p>
                <p className={`mt-1 text-sm font-bold ${row.roas !== null && row.roas >= 1 ? 'text-emerald-300' : 'text-white'}`}>{row.roas === null ? '—' : decimal(row.roas) + 'x'}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cobranças do mês</p>
                <span className="text-[10px] text-slate-600">{row.investments.length} {row.investments.length === 1 ? 'lançamento' : 'lançamentos'}</span>
              </div>
              {row.investments.length ? <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                {row.investments.map(investment => <div key={investment.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.025] px-3 py-2.5 text-xs">
                  <span className="flex items-center gap-2 text-slate-400">
                    <ReceiptText size={13} className="text-emerald-400"/>
                    {investment.date.toLocaleDateString('pt-BR')}
                  </span>
                  <b className="text-slate-200">{money(Number(investment.amount || 0))}</b>
                </div>)}
              </div> : <p className="py-2 text-xs text-slate-600">Nenhuma cobrança registrada neste mês.</p>}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                Receita BRL: <b className="text-slate-300">{money(row.revenue)}</b>
                {row.roi !== null && <span> · ROI {row.roi >= 0 ? '+' : ''}{decimal(row.roi)}%</span>}
                {row.foreignClients > 0 && <p className="mt-1 text-amber-400/80">{row.foreignClients} cliente(s) estrangeiro(s) fora da receita</p>}
              </div>
              <button type="button" onClick={() => setInvestmentCampaign(row.campaign)} className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 text-xs font-bold text-emerald-300 hover:bg-emerald-500/15">
                <Plus size={15}/>Adicionar cobrança
              </button>
            </div>
          </article>;
        })}
      </div>}
    </section>

    {campaignFormOpen && <CampaignFormModal
      campaign={editingCampaign}
      onClose={closeCampaignForm}
      onSave={saveCampaign}
    />}
    {investmentCampaign && <InvestmentModal
      campaign={investmentCampaign}
      selectedMonth={selectedMonth}
      onClose={() => setInvestmentCampaign(undefined)}
      onSave={onAddInvestment}
    />}
  </div>;
}
