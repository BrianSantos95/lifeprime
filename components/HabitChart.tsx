import React from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ChartDataPoint } from '../types';
import { TrendingUp, Sparkles } from 'lucide-react';

interface HabitChartProps {
  data: ChartDataPoint[];
  currentMonthName: string;
  average: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0e1424]/90 border border-blue-500/30 p-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <p className="text-slate-400 text-xs font-medium mb-1">Dia {label}</p>
        <div className="flex items-center gap-1.5 text-blue-400 font-bold text-sm">
          <Sparkles size={14} />
          <span>{Math.round(payload[0].value)}% Completo</span>
        </div>
      </div>
    );
  }
  return null;
};

const HabitChart: React.FC<HabitChartProps> = ({ data, currentMonthName, average }) => {
  return (
    <section className="dashboard-card p-6 mb-6 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="section-label">Evolução Mensal</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              {isNaN(average) ? 0 : Math.round(average)}%
            </h2>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp size={12} /> +4.2% esta semana
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0c111e]/80 border border-white/[0.08] p-1 rounded-xl">
          <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/40 text-blue-400 text-xs font-bold rounded-lg shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            {currentMonthName}
          </span>
        </div>
      </div>

      <div className="h-[220px] w-full relative -ml-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              interval={3}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4 4' }} 
            />
            <Area
              type="monotone"
              dataKey="percentage"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#blueGlow)"
              activeDot={{ r: 6, fill: '#60a5fa', stroke: '#1e3a8a', strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default HabitChart;
