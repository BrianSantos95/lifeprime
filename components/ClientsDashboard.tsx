import React, { useState } from 'react';
import { Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { Client, ClientPaymentStatus, ClientProjectStatus } from '../types';
import { parseCurrencyInput } from '../lib/currency';

type Input = Omit<Client, 'id' | 'createdAt'>;
interface Props {
  clients: Client[];
  onAdd: (client: Input) => Promise<boolean>;
  onEdit: (id: string, client: Input) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}
const payments: Record<ClientPaymentStatus, string> = {
  pending: 'Não pago', half: '50% pago', paid: '100% pago'
};
const stages: Record<ClientProjectStatus, string> = {
  lead: 'Novo contato', proposal: 'Proposta enviada',
  development: 'Em desenvolvimento', review: 'Em revisão', delivered: 'Entregue'
};
const blank: Input = {
  name: '', contact: '', project: '', amount: 0, paymentStatus: 'pending',
  projectStatus: 'lead', followUpDate: '', notes: ''
};
const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ClientsDashboard({ clients, onAdd, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Input>(blank);
  const [amount, setAmount] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const total = clients.reduce((sum, client) => sum + client.amount, 0);
  const received = clients.reduce((sum, client) =>
    sum + client.amount * (client.paymentStatus === 'paid' ? 1 : client.paymentStatus === 'half' ? .5 : 0), 0);
  const visible = clients.filter(client =>
    [client.name, client.contact, client.project].join(' ').toLowerCase().includes(query.toLowerCase()));

  const start = (client?: Client) => {
    setEditing(client?.id || null);
    setForm(client ? {
      name: client.name, contact: client.contact, project: client.project,
      amount: client.amount, paymentStatus: client.paymentStatus,
      projectStatus: client.projectStatus, followUpDate: client.followUpDate || '',
      notes: client.notes
    } : blank);
    setAmount(client ? client.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = parseCurrencyInput(amount);
    if (!Number.isFinite(value)) return;
    const payload = { ...form, amount: value };
    if (editing ? await onEdit(editing, payload) : await onAdd(payload)) setOpen(false);
  };

  return <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pb-24">
    <header className="flex justify-between gap-4 mb-7">
      <div><p className="section-label">Gestao comercial</p><h1 className="text-3xl font-extrabold text-white">Clientes</h1><p className="text-sm text-slate-400">Projetos, pagamentos e pos-venda.</p></div>
      <button onClick={() => start()} className="btn-glow-primary px-5 h-11 rounded-2xl text-white font-bold flex items-center gap-2"><Plus size={18}/>Novo cliente</button>
    </header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {[['Clientes',clients.length],['Contratado',money(total)],['Recebido',money(received)],['Follow-ups',clients.filter(c=>c.followUpDate&&c.followUpDate<=today).length]].map(([label,value])=><div className="dashboard-card p-4" key={label}><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-extrabold text-white truncate">{value}</p></div>)}
    </div>
    <section className="dashboard-card p-5">
      <div className="relative max-w-md mb-5"><Search className="absolute left-3 top-3 text-slate-500" size={16}/><input className="field !mt-0 !pl-9" placeholder="Buscar cliente ou projeto..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{visible.map(client=><article key={client.id} className="bg-[#0c111e] border border-white/10 rounded-2xl p-4">
        <div className="flex justify-between"><div><h3 className="font-bold text-white">{client.name}</h3><p className="text-xs text-slate-500">{client.project||'Projeto nao informado'}</p></div><div><button className="p-2" onClick={()=>start(client)}><Edit2 size={15}/></button><button className="p-2 hover:text-rose-400" onClick={()=>confirm('Excluir este cliente?')&&onDelete(client.id)}><Trash2 size={15}/></button></div></div>
        <div className="flex gap-2 my-4"><span className="tag">{stages[client.projectStatus]}</span><span className="tag">{payments[client.paymentStatus]}</span></div>
        <div className="border-t border-white/5 pt-3 flex justify-between"><b className="text-white">{money(client.amount)}</b>{client.followUpDate&&<small className={client.followUpDate<=today?'text-amber-400':'text-slate-500'}>Pos: {new Date(client.followUpDate+'T12:00').toLocaleDateString('pt-BR')}</small>}</div>
      </article>)}</div>
      {!visible.length&&<p className="text-center text-slate-500 py-16">Nenhum cliente encontrado.</p>}
    </section>
    {open&&<div className="fixed inset-0 z-[70] bg-black/75 flex items-center justify-center p-4"><div className="bg-[#0e1424] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-5 border-b border-white/10 flex justify-between"><b className="text-white">{editing?'Editar':'Novo'} cliente</b><button onClick={()=>setOpen(false)}><X/></button></div>
      <form onSubmit={submit} className="p-5 grid md:grid-cols-2 gap-4">
        <label className="text-xs text-slate-400">Nome<input required className="field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label className="text-xs text-slate-400">Contato<input className="field" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></label>
        <label className="text-xs text-slate-400">Projeto<input className="field" value={form.project} onChange={e=>setForm({...form,project:e.target.value})}/></label>
        <label className="text-xs text-slate-400">Valor<input required className="field" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
        <label className="text-xs text-slate-400">Pagamento<select className="field" value={form.paymentStatus} onChange={e=>setForm({...form,paymentStatus:e.target.value as ClientPaymentStatus})}>{Object.entries(payments).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-slate-400">Etapa<select className="field" value={form.projectStatus} onChange={e=>setForm({...form,projectStatus:e.target.value as ClientProjectStatus})}>{Object.entries(stages).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-slate-400">Follow-up<input type="date" className="field" value={form.followUpDate} onChange={e=>setForm({...form,followUpDate:e.target.value})}/></label>
        <label className="text-xs text-slate-400 md:col-span-2">Observacoes<textarea className="field min-h-20" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
        <div className="md:col-span-2 flex justify-end"><button className="btn-glow-primary px-5 py-2.5 rounded-xl text-white font-bold">Salvar cliente</button></div>
      </form>
    </div></div>}
  </div>;
}
