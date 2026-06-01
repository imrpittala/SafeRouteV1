import React, { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw, 
  ShieldAlert, 
  Zap,
  Info,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { cn } from '../utils/cn';

const API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://20.40.61.11:8000';

const Settings: React.FC = () => {
  const [dangerPenalty, setDangerPenalty] = useState(1000);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings/weights`);
      setDangerPenalty(res.data.danger_penalty);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/settings/weights?penalty=${dangerPenalty}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white">Algorithm Tuning</h2>
        <p className="text-zinc-500 font-medium">Configure real-time pathfinding weights and safety parameters.</p>
      </div>

      <div className="grid gap-8">
        {/* Routing Weights Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white">Pathfinding Weights</h3>
          </div>

          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-zinc-200">Danger Zone Penalty</span>
                  </div>
                  <p className="text-xs text-zinc-500">Additional weight added to edges near active SOS alerts (500m radius).</p>
                </div>
                <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <span className="text-lg font-mono font-bold text-primary">+{dangerPenalty}</span>
                </div>
              </div>

              <div className="relative pt-6">
                <input 
                  type="range" 
                  min="0" 
                  max="5000" 
                  step="100"
                  value={dangerPenalty}
                  onChange={(e) => setDangerPenalty(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between mt-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  <span>Fastest Path (0)</span>
                  <span>Balanced (2500)</span>
                  <span>Max Safety (5000)</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex items-start space-x-4">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-300">Operational Impact</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Increasing this value will cause the "Safest Route" to deviate more aggressively to avoid reported incidents. 
                  High values ({'>'}3000) may result in significantly longer travel times but prioritize user security.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-between pt-8 border-t border-zinc-800/60">
            <button 
              onClick={fetchSettings}
              className="flex items-center space-x-2 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Discard Changes</span>
            </button>
            
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "flex items-center space-x-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-2xl transform active:scale-95",
                showSuccess 
                  ? "bg-green-600 text-white" 
                  : "bg-primary text-white hover:bg-blue-500 shadow-primary/20"
              )}
            >
              {showSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Weights Updated</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Applying...' : 'Apply Dynamic Weights'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* System Config Card (Placeholder for more) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl opacity-50 grayscale">
          <div className="flex items-center space-x-3 mb-6">
            <SettingsIcon className="w-6 h-6 text-zinc-500" />
            <h3 className="text-xl font-bold text-white">General Configuration</h3>
          </div>
          <p className="text-xs text-zinc-600">Advanced system parameters are locked. Contact System Architect for access.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
