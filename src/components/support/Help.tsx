'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Card, Empty } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { TextInput } from '../ui/FormFields';
import { ErrorState, Loading } from '../ui/StateViews';
import { useContent } from '../../hooks/useContent';
import { useBack } from '../../hooks/useNavigation';
import { titleCase } from '../../lib/format';
import type { ContentItem } from '../../types/misc';

interface Topic { id: string; label: string; icon: string; items: ContentItem[] }

/** FAQ topics = CMS faq items grouped by category (label/icon from item metadata). */
const toTopics = (items: ContentItem[]): Topic[] => {
  const map = new Map<string, Topic>();
  for (const it of items) {
    const id = it.category || 'general';
    const t = map.get(id) ?? { id, label: it.metadata?.topicLabel || titleCase(id), icon: it.metadata?.icon || 'circle-help', items: [] };
    t.items.push(it);
    map.set(id, t);
  }
  return [...map.values()];
};

export function Help() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useContent('faq');
  const topics = toTopics(data ?? []).filter((t) => t.label.toLowerCase().includes(q.toLowerCase()) || t.items.some((i) => i.title.toLowerCase().includes(q.toLowerCase())));
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <SectionHead title="Help & FAQs" sub="Answers to the most common questions" />
      <div className="mb-5"><TextInput icon="search" aria-label="Search help articles" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles…" /></div>
      {loading && !data ? <Loading label="Loading help topics" />
        : error ? <ErrorState compact message={error} onRetry={reload} />
        : topics.length === 0 ? <div className="text-[13px] text-ink-400 py-6 text-center">{q ? `No help topics match “${q}”.` : 'No help articles have been published yet.'}</div>
        : (
          <div className="grid grid-cols-2 gap-3">
            {topics.map((t) => (
              <button type="button" key={t.id} onClick={() => router.push(`/help/${encodeURIComponent(t.id)}`)} className="bg-white rounded-2xl border border-ink-200 p-4 flex items-center gap-3 hover:border-brand-300 hover:shadow-md transition text-left">
                <div className="w-11 h-11 rounded-xl bg-brand-50 grid place-items-center shrink-0"><Icon name={t.icon} size={20} color="#1A6FFF" /></div>
                <div><div className="text-[14px] font-bold text-ink-900">{t.label}</div><div className="text-[12px] text-brand-500">{t.items.length} article{t.items.length === 1 ? '' : 's'}</div></div>
              </button>
            ))}
          </div>
        )}
      <button type="button" onClick={() => router.push('/support')} className="w-full rounded-2xl bg-brand-50 border border-brand-200 p-4 flex items-center gap-3 mt-4 hover:bg-brand-100 transition text-left">
        <div className="w-11 h-11 rounded-full bg-brand-600 grid place-items-center shrink-0"><Icon name="headset" size={22} color="#fff" /></div>
        <div className="flex-1"><div className="text-[14px] font-bold text-brand-700">Still need help?</div><div className="text-[12.5px] text-brand-600">Contact customer support</div></div>
        <Icon name="chevron-right" size={20} color="#1A6FFF" />
      </button>
    </PageWrap>
  );
}

export function FaqTopic({ topicId }: { topicId: string }) {
  const back = useBack('/help');
  const [open, setOpen] = useState(0);
  const { data, loading, error, reload } = useContent('faq');
  const topic = toTopics(data ?? []).find((t) => t.id === topicId);
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-0.5"><Icon name="arrow-left" size={18} />{topic?.label ?? titleCase(topicId)}</button>
      <p className="text-[13px] text-ink-500 mb-5 ml-7">Frequently asked questions</p>
      {loading && !data ? <Loading lines label="Loading answers" />
        : error ? <ErrorState compact message={error} onRetry={reload} />
        : !topic ? <Empty icon="circle-help" title="Topic not found" sub="This help topic has no published articles." />
        : (
          <Card className="divide-y divide-ink-100">
            {topic.items.map((f, i) => (
              <div key={f._id}>
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-ink-50 transition">
                  <span className="flex-1 text-[14px] font-bold text-ink-900">{f.title}</span>
                  <Icon name="chevron-down" size={18} color="#94A3B8" style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
                </button>
                {open === i && <div className="px-4 pb-4 text-[13.5px] text-ink-600 leading-relaxed slide-in whitespace-pre-line">{f.body || f.excerpt}</div>}
              </div>
            ))}
          </Card>
        )}
    </PageWrap>
  );
}
