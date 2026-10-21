import { cx, longDate } from '../../lib/format';
import type { ContentItem } from '../../types/misc';

export type LegalDocName = 'Terms of Service' | 'Privacy Policy' | 'Legal & RERA';
export const LEGAL_TABS: LegalDocName[] = ['Terms of Service', 'Privacy Policy'];
export const LEGAL_ICON: Record<LegalDocName, string> = { 'Terms of Service': 'file-text', 'Privacy Policy': 'shield', 'Legal & RERA': 'scale' };

/** Pick the CMS legal item for a document name (seeded slugs: terms-of-service, privacy-policy). */
export const findLegal = (items: ContentItem[] | null, doc: LegalDocName) => {
  if (!items) return undefined;
  const legal = items.filter((i) => i.section === 'legal');
  if (doc === 'Terms of Service') return legal.find((i) => i.slug === 'terms-of-service' || i.category === 'terms');
  if (doc === 'Privacy Policy') return legal.find((i) => i.slug === 'privacy-policy' || i.category === 'privacy');
  return legal.find((i) => /rera/i.test(`${i.slug} ${i.category ?? ''} ${i.title}`));
};

export const updatedLabel = (item?: ContentItem) => item?.metadata?.lastUpdatedLabel || longDate(item?.updatedAt || item?.publishedAt) || '';

export interface LegalSection { heading: string | null; paragraphs: string[]; bullets: string[] }

/** CMS bodies are plain text: blank-line separated blocks, optional "# Heading" lines and "- " bullets. */
export const parseLegal = (body = ''): LegalSection[] => {
  const sections: LegalSection[] = [];
  let cur: LegalSection = { heading: null, paragraphs: [], bullets: [] };
  const push = () => { if (cur.heading || cur.paragraphs.length || cur.bullets.length) sections.push(cur); };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^#{1,3}\s+(.*)$/);
    if (h) { push(); cur = { heading: h[1] ?? '', paragraphs: [], bullets: [] }; continue; }
    const b = line.match(/^[-•*]\s+(.*)$/);
    if (b) cur.bullets.push(b[1] ?? '');
    else cur.paragraphs.push(line);
  }
  push();
  return sections;
};

export const legalId = (h: string) => 'lg-' + h.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function LegalBody({ item, compact }: { item: ContentItem; compact?: boolean }) {
  const parsed = parseLegal(item.body);
  const sections = parsed.map((s, i) => ({ ...s, n: parsed.slice(0, i + 1).filter((x) => x.heading).length }));
  return (
    <div className="space-y-6">
      {item.title && <p className={cx('text-ink-600 leading-relaxed font-semibold', compact ? 'text-[13.5px]' : 'text-[14.5px]')}>{item.title}</p>}
      {sections.map((s, i) => {
        const n = s.n;
        return (
          <section key={i} id={s.heading ? legalId(s.heading) : undefined} className="scroll-mt-6">
            {s.heading && <h3 className={cx('font-bold text-ink-900 flex items-baseline gap-2', compact ? 'text-[14.5px]' : 'text-[16px]')}><span className="text-brand-600 tabular-nums">{String(n).padStart(2, '0')}</span>{s.heading}</h3>}
            {s.paragraphs.map((p, k) => <p key={k} className={cx('text-ink-600 leading-relaxed', s.heading ? 'text-[14px] mt-1.5' : compact ? 'text-[13.5px]' : 'text-[14.5px]', k > 0 && 'mt-3')}>{p}</p>)}
            {s.bullets.length > 0 && <ul className="mt-2 space-y-1.5">{s.bullets.map((p) => <li key={p} className="flex gap-2.5 text-[14px] text-ink-600 leading-relaxed"><span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0"></span>{p}</li>)}</ul>}
          </section>
        );
      })}
    </div>
  );
}
