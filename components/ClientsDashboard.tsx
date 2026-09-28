import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Gauge, Plus, Target, TrendingUp } from 'lucide-react';
import { Client } from '../types';
import ClientFormModal, { ClientInput } from './clients/ClientFormModal';
import ClientPortfolio from './clients/ClientPortfolio';

interface ClientsDashboardProps {
  clients: Client[];
  onAdd: (client: ClientInput) => Promise<boolean>;
  onEdit: (id: string, client: ClientInput) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

const currencies = ['BRL', 'USD', 'EUR'] as const;
const fieldClass = 'mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#090e19] px-4 text-sm text-white outline-none transition-all focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 [color-scheme:dark]';
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-400';
const monthKey = (date: Date) => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
const dateInMonth = (date: string | undefined, key: string) => Boolean(date && date.slice(0, 7) === key);
const storedGoal = (key: string) => Math.max(1, Number(localStorage.getItem(key)) || 20);
const money = (value: number, currency: Client['currency']) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency });

export default function ClientsDashboard({ clients, onAdd, onEdit, onDelete }: ClientsDashboardProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client>();
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const goalKey = 'habitpulse-client-page-goal-' + selectedMonth;
  const [goal, setGoal] = useState(() => storedGoal(goalKey));

  useEffect(() => setGoal(storedGoal(goalKey)), [goalKey]);

  const metrics = useMemo(() => {
    const delivered = clients.filter(client =>
      client.projectStatus === 'delivered'
      && dateInMonth(client.deliveredAt || client.createdAt, selectedMonth)
    );
    const pages = delivered.reduce((sum, client) => sum + (client.pageCount || 1), 0);
    const weeks = [0, 0, 0, 0, 0];

    delivered.forEach(client => {
      const date = new Date(String(client.deliveredAt || client.createdAt));
      const week = Math.min(4, Math.floor((date.getUTCDate() - 1) / 7));
      weeks[week] += client.pageCount || 1;
    });

    const active = clients.filter(client =>
      client.projectStatus === 'started' || client.projectStatus === 'review'
    ).length;
    const pending = currencies
      .map(currency => {
        const total = clients
          .filter(client => client.currency === currency && client.paymentStatus !== 'paid')
          .reduce((sum, client) => sum + Math.max(0, client.amount - (client.paidAmount || 0)), 0);
        return total ? money(total, currency) : '';
      })
      .filter(Boolean)
      .join(' · ') || money(0, 'BRL');
    const durations = delivered
      .filter(client => client.startedAt && client.deliveredAt)
      .map(client => Math.max(0, Math.ceil(
        (new Date(client.deliveredAt!).getTime() - new Date(client.startedAt!).getTime()) / 86400000
      )));
    const averageDays = durations.length
      ? Math.round(durations.reduce((sum, days) => sum + days, 0) / durations.length)
      : 0;

    return { delivered, pages, weeks, active, pending, averageDays };
  }, [clients, selectedMonth]);

  const remaining = Math.max(0, goal - metrics.pages);
  const progress = Math.min(100, Math.round(metrics.pages / goal * 100));
  const monthDate = new Date(selectedMonth + '-02T12:00:00');

  const moveMonth = (amount: number) => {
    const date = new Date(monthDate);
    date.setMonth(date.getMonth() + amount);
    setSelectedMonth(monthKey(date));
  };

  const updateGoal = (value: string) => {
    const nextGoal = Math.max(1, Number(value) || 1);
    localStorage.setItem(goalKey, String(nextGoal));
    setGoal(nextGoal);
  };

  const openForm = (client?: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingClient(undefined);
  };

  const saveClient = (client: ClientInput) =>
    editingClient ? onEdit(editingClient.id, client) : onAdd(client);

  const cards = [
    { label: 'Meta do mês', value: metrics.pages + ' / ' + goal + ' páginas', detail: progress + '% concluída', icon: Target, color: 'text-blue-400' },
    { label: 'Faltam para a meta', value: remaining + ' páginas', detail: remaining ? 'para atingir o objetivo' : 'meta atingida', icon: Gauge, color: remaining ? 'text-amber-400' : 'text-emerald-400' },
    { label: 'Média semanal', value: (metrics.pages / 4.33).toFixed(1) + ' páginas', detail: metrics.delivered.length + ' projetos entregues', icon: TrendingUp, color: 'text-violet-400' },
    { label: 'Prazo médio', value: metrics.averageDays ? metrics.averageDays + ' dias' : '--', detail: 'do início até a entrega', icon: CalendarDays, color: 'text-emerald-400' }
  ];

  return <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-24 md:p-8 custom-scrollbar">
    <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="section-label">Gestão comercial</p>
        <h1 className="text-3xl font-extrabold text-white">Dashboard de clientes</h1>
        <p className="text-sm text-slate-400">Metas, produção e desempenho comercial por mês.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center rounded-2xl border border-white/10 bg-[#0c111e] p-1">
          <button type="button" aria-label="Mês anterior" onClick={() => moveMonth(-1)} className="p-2 text-slate-400 hover:text-white">
            <ChevronLeft size={18}/>
          </button>
          <span className="min-w-36 text-center text-sm font-bold capitalize text-white">
            {monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" aria-label="Próximo mês" onClick={() => moveMonth(1)} className="p-2 text-slate-400 hover:text-white">
            <ChevronRight size={18}/>
          </button>
        </div>
        <button type="button" onClick={() => openForm()} className="btn-glow-primary flex h-11 items-center gap-2 rounded-2xl px-5 font-bold text-white">
          <Plus size={18}/>Novo cliente
        </button>
      </div>
    </header>

    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {cards.map(card => <div className="dashboard-card p-5" key={card.label}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="mt-2 text-xl font-extrabold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
          </div>
          <card.icon className={card.color} size={20}/>
        </div>
      </div>)}
    </div>

    <div className="mb-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <section className="dashboard-card p-5">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Páginas produzidas por semana</h2>
            <p className="mt-1 text-xs text-slate-500">Entregas registradas no mês selecionado</p>
          </div>
          <CalendarDays size={20} className="text-blue-400"/>
        </div>
        <div className="flex h-44 items-end gap-3">
          {metrics.weeks.map((value, index) => {
            const max = Math.max(goal / 4, ...metrics.weeks, 1);
            return <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2">
              <span className="text-center text-xs font-bold text-white">{value}</span>
              <div
                className="mx-auto w-full max-w-16 rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400 transition-all"
                style={{ height: Math.max(value ? 12 : 3, value / max * 120) + 'px', opacity: value ? 1 : .2 }}
              />
              <span className="text-center text-[10px] text-slate-500">Sem. {index + 1}</span>
            </div>;
          })}
        </div>
      </section>

      <section className="dashboard-card p-5">
        <div className="flex justify-between">
          <div>
            <h2 className="font-bold text-white">Progresso da meta</h2>
            <p className="mt-1 text-xs text-slate-500">Ajuste sua meta mensal de páginas</p>
          </div>
          <Target size={20} className="text-violet-400"/>
        </div>
        <div className="my-7">
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-slate-400">{metrics.pages} produzidas</span>
            <span className="font-bold text-white">{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500" style={{ width: progress + '%' }}/>
          </div>
        </div>
        <label className={labelClass}>Meta de páginas
          <input key={goalKey} type="number" min="1" className={fieldClass} defaultValue={goal} onBlur={event => updateGoal(event.target.value)}/>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[.03] p-3">
            <p className="text-[10px] text-slate-500">Projetos ativos</p>
            <b className="text-white">{metrics.active}</b>
          </div>
          <div className="min-w-0 rounded-xl bg-white/[.03] p-3">
            <p className="text-[10px] text-slate-500">A receber</p>
            <b className="break-words text-sm text-white">{metrics.pending}</b>
          </div>
        </div>
      </section>
    </div>

    <ClientPortfolio clients={clients} onEdit={openForm} onDelete={onDelete}/>

    {formOpen && <ClientFormModal
      client={editingClient}
      onClose={closeForm}
      onSave={saveClient}
    />}
  </div>;
}
