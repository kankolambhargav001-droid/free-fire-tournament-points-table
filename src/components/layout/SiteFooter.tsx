import React from 'react';
import { Heart, HelpCircle, Info, ShieldCheck } from 'lucide-react';

const faqs = [
  ['How are points calculated?', 'Placement points and kill points come from the scoring configuration saved for the tournament.'],
  ['Can I edit extracted results?', 'Yes. Review and edit extracted slot and match data before saving the final result.'],
  ['Who can see my tournaments?', 'Organizer data is scoped to the signed-in organizer account.'],
];

export const SiteFooter: React.FC = () => (
  <footer className="border-t border-[#252629] bg-[#0D0D0F] mt-auto">
    <div className="max-w-[1480px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
        <div>
          <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-tight">
            <Info className="w-4 h-4 text-[#F58F7C]" />
            Tournament Points
          </div>
          <p className="text-xs leading-relaxed text-[#777A80] mt-2 max-w-sm">
            A clean organizer workspace for Free Fire tournament slots, match results, standings and shareable results graphics.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-tight">
            <ShieldCheck className="w-4 h-4 text-[#F58F7C]" />
            Information
          </div>
          <div className="text-xs text-[#777A80] mt-2 space-y-1">
            <div>Results are generated from the tournament data you save.</div>
            <div>Always review extracted screenshots before publishing.</div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-tight">
            <HelpCircle className="w-4 h-4 text-[#F58F7C]" />
            FAQ
          </div>
          <div className="mt-2 space-y-1">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group border-b border-[#222326] last:border-0 py-1.5">
                <summary className="cursor-pointer list-none text-xs font-semibold text-[#BFC0C4] hover:text-white transition-colors">
                  {question}
                </summary>
                <p className="text-[11px] leading-relaxed text-[#6F7177] pt-1.5 pr-2">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7 pt-4 border-t border-[#252629] flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] font-mono uppercase tracking-[0.16em] text-[#5F6167]">
        <span>TOURNAMENT POINTS · ESPORTS ORGANIZER CONSOLE</span>
        <span className="inline-flex items-center gap-1.5 text-[#F58F7C]">
          MADE WITH <Heart className="w-3 h-3 fill-current" /> LOVE BY BHARGAV
        </span>
      </div>
    </div>
  </footer>
);
