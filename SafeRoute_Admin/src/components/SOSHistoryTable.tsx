import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, Calendar, Clock, User, ShieldAlert } from 'lucide-react';

interface IncidentProperties {
  id: number;
  user_id: string;
  latitude: number;
  longitude: number;
  created_at: string;
  resolved_at: string | null;
  exposure_level: string;
}

interface IncidentFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: IncidentProperties;
}

interface HeatmapGeoJSON {
  type: 'FeatureCollection';
  features: IncidentFeature[];
}

const API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://20.40.61.11:8000';

const SOSHistoryTable: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentProperties[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/analytics/heatmap`);
      if (!res.ok) {
        throw new Error('Failed to fetch historical alerts');
      }
      const data: HeatmapGeoJSON = await res.json();
      
      // Extract properties from the features GeoJSON structure
      const parsedIncidents = data.features.map(f => f.properties);
      
      // Sort incidents descending (newest first)
      parsedIncidents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setIncidents(parsedIncidents);
    } catch (err: any) {
      console.error('Error fetching SOS history logs:', err);
      setError(err.message || 'Error loading history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter logic based on user search query
  const filteredIncidents = incidents.filter((incident) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const commuterIdMatch = incident.user_id.toLowerCase().includes(query);
    const incidentIdMatch = incident.id.toString().includes(query);
    const coordsMatch = `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`.includes(query);
    
    return commuterIdMatch || incidentIdMatch || coordsMatch;
  });

  // Dynamic grouping logic (group by Month Year: e.g., "June 2026")
  const groups: Record<string, IncidentProperties[]> = {};
  filteredIncidents.forEach((incident) => {
    const dateObj = new Date(incident.created_at);
    const groupKey = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(incident);
  });

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const getDuration = (createdStr: string, resolvedStr: string | null) => {
    if (!resolvedStr) return 'N/A';
    const start = new Date(createdStr);
    const end = new Date(resolvedStr);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return '0m';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusDetails = (incident: IncidentProperties) => {
    if (incident.resolved_at) {
      return {
        label: 'RESOLVED',
        style: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      };
    }
    
    // Fallback: If not resolved but created > 24 hours ago, it's considered auto-purged
    const start = new Date(incident.created_at);
    const ageHours = (Date.now() - start.getTime()) / 3600000;
    if (ageHours > 24) {
      return {
        label: 'AUTO_PURGED',
        style: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
      };
    }

    return {
      label: 'ACTIVE',
      style: 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
    };
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-6">
      {/* Table Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 text-zinc-400" />
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">SOS Chronological Incident Audit</h3>
            <p className="text-xs text-zinc-500">Historical archive of safety alarms and network cleanups.</p>
          </div>
        </div>

        {/* Real-time Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by Commuter ID, Lat/Lng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-zinc-300 placeholder-zinc-500 outline-none transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-zinc-500 text-xs font-mono">
          <span className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin mr-2" />
          Querying audit records from PostgreSQL database...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12 text-red-500 text-xs font-mono bg-red-950/10 border border-red-900/20 rounded-2xl">
          Error: {error}
        </div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="flex items-center justify-center py-12 text-zinc-600 text-xs font-mono">
          No audit records found matching search queries.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([groupKey, groupIncidents]) => {
            const isCollapsed = !!collapsedGroups[groupKey];
            return (
              <div key={groupKey} className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-900/20 shadow-sm">
                {/* Collapsible Group Header Banner */}
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center justify-between p-4 bg-zinc-900/40 hover:bg-zinc-900/70 border-b border-zinc-800/40 transition-colors text-left outline-none cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    )}
                    <span className="text-xs font-bold text-zinc-200 tracking-wide">{groupKey}</span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold border border-zinc-700/60 shadow-inner">
                    {groupIncidents.length} {groupIncidents.length === 1 ? 'incident' : 'incidents'}
                  </span>
                </button>

                {/* Tabular Layout Block */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs text-zinc-300">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/10 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-4 pl-6">Commuter ID</th>
                          <th className="p-4">Incident ID</th>
                          <th className="p-4">Coordinates</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Triggered Time</th>
                          <th className="p-4">Active Duration</th>
                          <th className="p-4 pr-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {groupIncidents.map((incident) => {
                          const status = getStatusDetails(incident);
                          return (
                            <tr key={incident.id} className="hover:bg-zinc-900/30 transition-colors font-medium">
                              <td className="p-4 pl-6 font-mono text-blue-400">
                                <div className="flex items-center space-x-2">
                                  <User className="w-3.5 h-3.5 text-zinc-600" />
                                  <span>{incident.user_id.slice(0, 12)}...</span>
                                </div>
                              </td>
                              <td className="p-4 font-mono text-zinc-500">#{incident.id}</td>
                              <td className="p-4 font-mono text-zinc-400 text-[11px]">
                                {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                              </td>
                              <td className="p-4 text-zinc-400">
                                <div className="flex items-center space-x-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                                  <span>{formatDate(incident.created_at)}</span>
                                </div>
                              </td>
                              <td className="p-4 text-zinc-400 font-mono">
                                <div className="flex items-center space-x-1.5">
                                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                  <span>{formatTime(incident.created_at)}</span>
                                </div>
                              </td>
                              <td className="p-4 text-zinc-400 font-mono">
                                {getDuration(incident.created_at, incident.resolved_at)}
                              </td>
                              <td className="p-4 pr-6">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${status.style}`}>
                                  {status.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SOSHistoryTable;
