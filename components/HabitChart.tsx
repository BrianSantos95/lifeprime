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

interface HabitChartProps {
  data: ChartDataPoint[];
  currentMonthName: string;
  average: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
        <p className="text-zinc-400 text-xs mb-1">Dia {label}</p>
        <p className="text-red-500 font-bold text-sm">
          {Math.round(payload[0].value)}% Completo
        </p>
      </div>
    );
  }
  return null;
};

const HabitChart: React.FC<HabitChartProps> = ({ data, currentMonthName, average }) => {
  return (
    <section className="bg-[#111111] border border-zinc-900 rounded-2xl p-6 mb-8 relative overflow-hidden shadow-sm">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
            Progresso - {currentMonthName}
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {isNaN(average) ? 0 : Math.round(average)}%
            </span>
          </div>
        </div>
      </div>

      <div className="h-[200px] w-full relative -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#52525b', fontSize: 10 }}
              interval={4}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="percentage"
              stroke="#dc2626"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPv)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default HabitChart;