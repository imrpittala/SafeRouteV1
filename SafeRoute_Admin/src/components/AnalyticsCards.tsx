import React from 'react';
import { Users, AlertCircle, Radio } from 'lucide-react';

const AnalyticsCards: React.FC = () => {
    const kpis = [
        {
            title: 'Active Users',
            value: '14,285',
            change: '+12%',
            trend: 'up',
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10 border-blue-500/20',
        },
        {
            title: 'High-Risk Zones Identified',
            value: '24',
            change: '-3',
            trend: 'down',
            icon: AlertCircle,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10 border-rose-500/20',
        },
        {
            title: 'SOS Alerts Today',
            value: '8',
            change: '+2',
            trend: 'up',
            icon: Radio,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10 border-amber-500/20',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 z-20 relative px-6 pt-6">
            {kpis.map((kpi, index) => {
                const Icon = kpi.icon;
                return (
                    <div
                        key={index}
                        className={`rounded-2xl border bg-zinc-900/80 backdrop-blur-sm p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${kpi.bg}`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-zinc-400 text-sm font-medium mb-1">{kpi.title}</p>
                                <h3 className="text-3xl font-bold text-white tracking-tight">{kpi.value}</h3>
                            </div>
                            <div className={`p-3 rounded-xl ${kpi.bg.split(' ')[0]}`}>
                                <Icon className={`w-6 h-6 ${kpi.color}`} />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center space-x-2 text-sm">
                            <span className={`font-medium ${kpi.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {kpi.change}
                            </span>
                            <span className="text-zinc-500">vs last 24h</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AnalyticsCards;
