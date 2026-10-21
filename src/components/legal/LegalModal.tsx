'use client';

import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Loading, ErrorState } from '../ui/StateViews';
import { useContent } from '../../hooks/useContent';
import { cx } from '../../lib/format';
import { LEGAL_TABS, LegalBody, findLegal, updatedLabel, type LegalDocName } from './LegalBody';

/** "Terms & Privacy" dialog opened from the sign-up / onboarding consent links. */
export function LegalModal({ doc, onClose, onSwitch }: { doc: LegalDocName | null; onClose: () => void; onSwitch: (d: LegalDocName) => void }) {
  if (!doc) return null;
  return <LegalDialog doc={doc} onClose={onClose} onSwitch={onSwitch} />;
}

function LegalDialog({ doc, onClose, onSwitch }: { doc: LegalDocName; onClose: () => void; onSwitch: (d: LegalDocName) => void }) {
  const { data, loading, error, reload } = useContent('legal');
  const cur = LEGAL_TABS.includes(doc) ? doc : 'Terms of Service';
  const item = findLegal(data, cur);
  return (
    <div className="fixed inset-0 z-[96] grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink-900/45 fade-in" onClick={onClose}></div>
      <div role="dialog" aria-modal="true" className="relative w-full max-w-[680px] max-h-[86vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden" style={{ animation: 'sheetUp .26s cubic-bezier(.2,.8,.25,1)' }}>
        <div className="px-6 pt-5 border-b border-ink-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0"><Icon name="shield-check" size={19} color="#1A6FFF" /></div>
            <div className="flex-1 min-w-0"><div className="text-[17px] font-extrabold tracking-tight text-ink-900">Terms & Privacy</div><div className="text-[12px] text-ink-400">{item ? `Last updated ${updatedLabel(item)}` : ' '}</div></div>
            <button type="button" aria-label="Close" onClick={onClose} className="w-9 h-9 rounded-full bg-ink-100 grid place-items-center hover:bg-ink-200 transition"><Icon name="x" size={17} color="#334155" /></button>
          </div>
          <div className="flex gap-6 mt-4">
            {LEGAL_TABS.map((t) => <button type="button" key={t} onClick={() => onSwitch(t)} className={cx('relative pb-3 text-[14px] font-bold transition', cur === t ? 'text-brand-600' : 'text-ink-400 hover:text-ink-700')}>{t}{cur === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-brand-600"></span>}</button>)}
          </div>
        </div>
        <div key={cur} className="flex-1 overflow-y-auto px-6 py-5 fade-in">
          {loading ? <Loading lines label="Loading document" /> : error ? <ErrorState compact message={error} onRetry={reload} /> : item ? <LegalBody item={item} compact /> : <p className="text-[13.5px] text-ink-500">This document hasn&apos;t been published yet.</p>}
        </div>
        <div className="px-6 py-4 border-t border-ink-100 flex justify-end">
          <Button onClick={onClose}>Got it</Button>
        </div>
      </div>
    </div>
  );
}
