import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Trophy, Shield, Bell, Palette } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
      <PageHeader
        title="Settings"
        subtitle="Manage organizer profile, scoring presets, and application preferences"
      />

      <div className="space-y-6">
        {/* Organizer Profile Card */}
        <div className="p-6 rounded-xl bg-[#17171F] border border-[#242434] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#232332]">
            <Shield className="w-5 h-5 text-[#F58F7C]" />
            <h3 className="font-bold text-white text-lg">Organizer Profile</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Organization Name" defaultValue="Vortex Esports League" />
            <Input label="Admin Contact Email" defaultValue="admin@vortexesports.org" />
          </div>
        </div>

        {/* Free Fire Points Scoring Preset */}
        <div className="p-6 rounded-xl bg-[#17171F] border border-[#242434] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#232332]">
            <Trophy className="w-5 h-5 text-[#F58F7C]" />
            <h3 className="font-bold text-white text-lg">Default Free Fire Scoring System</h3>
          </div>
          <p className="text-sm text-[#9CA3AF]">
            Standard point allocation for official Free Fire esports tournaments:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-center text-xs font-mono">
            {[
              { rank: '#1', pts: '12 pts' },
              { rank: '#2', pts: '9 pts' },
              { rank: '#3', pts: '8 pts' },
              { rank: '#4', pts: '7 pts' },
              { rank: '#5', pts: '6 pts' },
              { rank: '#6', pts: '5 pts' },
              { rank: '#7', pts: '4 pts' },
              { rank: '#8', pts: '3 pts' },
              { rank: '#9', pts: '2 pts' },
              { rank: '#10', pts: '1 pt' },
              { rank: '#11', pts: '0 pt' },
              { rank: '#12', pts: '0 pt' },
            ].map((p) => (
              <div key={p.rank} className="p-2.5 rounded-lg bg-[#14141E] border border-[#232332]">
                <div className="text-[#9CA3AF]">{p.rank}</div>
                <div className="font-bold text-white mt-0.5">{p.pts}</div>
              </div>
            ))}
          </div>
          <div className="pt-2 text-xs font-mono text-[#F58F7C]">
            Elimination points: 1 pt per kill
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary">Reset to Defaults</Button>
          <Button variant="primary">Save Preferences</Button>
        </div>
      </div>
    </div>
  );
};
