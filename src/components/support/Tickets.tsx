'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill, Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { FieldRow, FormError, TextInput } from '../ui/FormFields';
import { Loading, PageError, PageLoading } from '../ui/StateViews';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useBack } from '../../hooks/useNavigation';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { closeTicket, createTicket, getLiveChat, getTicket, markTicketRead, reopenTicket, replyToTicket, startLiveChat } from '../../services/supportService';
import { uploadDocument } from '../../services/documentService';
import { errorMessage } from '../../services/api';
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABEL } from '../../lib/catalog';
import { cx, dateTime, dayLabel, timeLabel } from '../../lib/format';
import { STATUS_TAG } from './Support';
import { useSupportRealtime } from '../../lib/realtime';
import type { SupportTicket } from '../../types/misc';

const POLL_MS = 10000;
const threadOf = (t: SupportTicket) => [
  { key: 'first', me: true, text: t.message, at: t.createdAt },
  ...(t.responses ?? []).map((r, i) => ({ key: r._id ?? `r${i}`, me: r.responderType === 'customer', text: r.message, at: r.createdAt })),
];

/** Polls while the screen is open so agent replies appear without a reload. */
function usePolling(fn: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    const iv = setInterval(fn, POLL_MS);
    return () => clearInterval(iv);
  }, [fn, active]);
}

// ── LIVE CHAT ────────────────────────────────────────────────
export function LiveChat() {
  const back = useBack('/support');
  const { toast, toastError } = useToast();
  const chat = useApiQuery((signal) => getLiveChat(signal), []);
  const [txt, setTxt] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const t = chat.data;
  usePolling(chat.reload, Boolean(t));
  useSupportRealtime(t?._id, chat.setData);
  const count = (t?.responses?.length ?? 0) + pending.length;
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [count]);
  useEffect(() => { if (t?._id && t.unreadCustomerCount) markTicketRead(t._id).catch(() => { /* read receipts are best-effort */ }); }, [t?._id, t?.unreadCustomerCount]);

  const send = async () => {
    const text = txt.trim();
    if (!text || busy) return;
    setTxt('');
    setPending((p) => [...p, text]);
    setBusy(true);
    try {
      chat.setData(t ? await replyToTicket(t._id, text) : await startLiveChat(text));
    } catch (e) {
      setTxt(text);
      toastError(errorMessage(e, 'Message not sent.'));
    } finally { setPending((p) => p.filter((x) => x !== text)); setBusy(false); }
  };
  const close = async () => {
    if (!t) return;
    try { await closeTicket(t._id); chat.setData(null); toast('Chat closed', 'x'); } catch (e) { toastError(errorMessage(e, 'Could not close the chat.')); }
  };

  const status = t ? (t.responses ?? []).some((r) => r.responderType === 'admin') ? { label: 'Connected', tone: 'green' as const } : { label: 'Waiting', tone: 'amber' as const } : null;
  const thread = t ? threadOf(t) : [];
  return (
    <div className="flex flex-col h-full max-w-[720px] mx-auto w-full">
      <div className="flex items-center gap-3 p-4 border-b border-ink-100 shrink-0">
        <button type="button" aria-label="Back" onClick={back}><Icon name="arrow-left" size={19} color="#0F172A" /></button>
        <div className="w-10 h-10 rounded-full bg-brand-50 grid place-items-center shrink-0"><Icon name="headset" size={19} color="#1A6FFF" /></div>
        <div className="flex-1 min-w-0"><div className="text-[15px] font-bold text-ink-900">Live Chat</div><div className="text-[12px] text-ink-500 truncate">{t ? `Connected · ${t.referenceId}` : 'Send a message to start chatting'}</div></div>
        {status && <Tag tone={status.tone}>{status.label}</Tag>}
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-ink-50/40">
        {chat.loading && !chat.data ? <Loading lines label="Loading chat" />
          : chat.error ? <div role="alert" className="text-center text-[13px] text-rose-600 py-6">{chat.error} <button type="button" onClick={chat.reload} className="font-bold underline">Retry</button></div>
          : <>
            {(thread[0] || pending.length > 0) && <div className="flex justify-center mb-4"><span className="bg-white border border-ink-200 text-[12px] font-semibold text-ink-500 px-3 py-1 rounded-full">{dayLabel(thread[0]?.at ?? new Date())}</span></div>}
            {!t && pending.length === 0 && <div className="text-center text-[13px] text-ink-400 py-10">Ask us anything about enquiries, visits, listings or payments.</div>}
            <div className="space-y-2.5">
              {[...thread.map((m) => ({ ...m, sending: false })), ...pending.map((text, i) => ({ key: `p${i}`, me: true, text, at: '', sending: true }))].map((m) => (
                <div key={m.key} className={cx('flex', m.me ? 'justify-end' : 'justify-start')}>
                  <div className={cx('max-w-[75%] rounded-2xl px-4 py-2.5', m.me ? 'bg-brand-600 text-white rounded-br-md' : 'bg-white border border-ink-200 text-ink-900 rounded-bl-md', m.sending && 'opacity-70')}>
                    <div className="text-[14px] font-semibold leading-snug whitespace-pre-line">{m.text}</div>
                    <div className={cx('flex items-center gap-1 justify-end mt-1 text-[11px]', m.me ? 'text-white/70' : 'text-ink-400')}>{m.sending ? 'Sending…' : `${dayLabel(m.at).replace(/, \d{4}$/, '')}, ${timeLabel(m.at)}`}{m.me && !m.sending && <Icon name="check" size={12} color="rgba(255,255,255,.75)" />}</div>
                  </div>
                </div>
              ))}
            </div>
            <div ref={end}></div>
          </>}
      </div>
      <div className="shrink-0 border-t border-ink-100 p-3">
        {t && <div className="flex justify-end mb-2"><button type="button" onClick={() => void close()} className="text-[13px] font-bold text-ink-500 hover:text-rose-600">Close chat</button></div>}
        <div className="flex items-center gap-2.5">
          <input aria-label="Message" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void send()} maxLength={5000} placeholder="Message support…" className="flex-1 h-12 px-4 bg-ink-50 rounded-full outline-none text-[14px] text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-100" />
          <button type="button" aria-label="Send" onClick={() => void send()} className={cx('w-12 h-12 rounded-full grid place-items-center shrink-0 transition', txt.trim() ? 'bg-brand-600 hover:bg-brand-700' : 'bg-ink-200')}><Icon name="send" size={18} color="#fff" /></button>
        </div>
      </div>
    </div>
  );
}

// ── RAISE SUPPORT TICKET ─────────────────────────────────────
export function RaiseTicket() {
  const router = useRouter();
  const back = useBack('/support');
  const { user } = useSession();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [cat, setCat] = useState(TICKET_CATEGORIES[0]?.label ?? 'Enquiry');
  const [subj, setSubj] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<SupportTicket | null>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0] ?? null; e.target.value = ''; setFile(f); if (f) toast('Screenshot attached', 'paperclip'); };
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const attachments: string[] = [];
      if (file && user) {
        const doc = await uploadDocument(file, 'user', user._id, 'support_attachment', 'support_screenshot');
        if (doc.url) attachments.push(doc.url);
      }
      const category = TICKET_CATEGORIES.find((c) => c.label === cat)?.api ?? 'general';
      const ticket = await createTicket({ category, subject: subj.trim(), message: `[${cat}] ${desc.trim()}`, attachments });
      setDone(ticket);
      toast('Ticket raised');
    } catch (e) { setErr(errorMessage(e, 'Could not raise the ticket.')); } finally { setBusy(false); }
  };

  if (done) return (
    <PageWrap className="!max-w-[1120px] web-split">
      <Card className="p-8 text-center mt-6">
        <div className="w-20 h-20 rounded-full bg-brand-50 grid place-items-center mx-auto"><Icon name="ticket-check" size={36} color="#1A6FFF" /></div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900 mt-5">Ticket raised</h1>
        <p className="text-[13.5px] text-ink-500 mt-2">Ticket <b className="text-ink-800">{done.referenceId}</b> has been created. Our team will respond within 24 hours.</p>
        <div className="grid grid-cols-2 gap-3 mt-6"><Button variant="outline" onClick={() => router.push('/support')}>Support</Button><Button onClick={() => router.push(`/support/tickets/${done._id}`)}>View ticket</Button></div>
      </Card>
    </PageWrap>
  );

  return (
    <PageWrap className="!max-w-[560px]">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900 mb-5"><Icon name="arrow-left" size={19} />Raise a Support Ticket</button>
      <Card className="p-5 space-y-4">
        <div><div className="text-[13px] font-bold text-ink-800 mb-2">Category</div><div className="flex flex-wrap gap-2">{TICKET_CATEGORIES.map((c) => <Pill key={c.label} active={cat === c.label} onClick={() => setCat(c.label)}>{c.label}</Pill>)}</div></div>
        <FieldRow label="Subject" required><TextInput icon="type" maxLength={200} value={subj} onChange={(e) => setSubj(e.target.value)} placeholder="Briefly describe the issue" /></FieldRow>
        <FieldRow label="Description" required><textarea rows={5} maxLength={4900} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Share details so we can help faster" className="w-full p-3.5 bg-white border border-ink-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-[14px] text-ink-900 resize-none" /></FieldRow>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,application/pdf" hidden onChange={onFile} />
        <button type="button" onClick={() => (file ? setFile(null) : fileInput.current?.click())} className="w-full h-12 rounded-xl border-2 border-dashed border-ink-200 text-[13.5px] font-semibold text-ink-500 flex items-center justify-center gap-2 hover:border-brand-300 hover:text-brand-600 transition"><Icon name={file ? 'x' : 'paperclip'} size={16} />{file ? `${file.name} — remove` : 'Attach screenshot (optional)'}</button>
        <FormError message={err} />
        <Button size="lg" className="w-full" loading={busy} disabled={!subj.trim() || !desc.trim()} onClick={() => void submit()}>Submit Ticket</Button>
      </Card>
    </PageWrap>
  );
}

// ── TICKET DETAIL ────────────────────────────────────────────
export function TicketDetail({ id }: { id: string }) {
  const back = useBack('/support');
  const { toast, toastError } = useToast();
  const q = useApiQuery((signal) => getTicket(id, signal), [id]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const t = q.data;
  const open = Boolean(t && (t.status === 'open' || t.status === 'in_progress'));
  usePolling(q.reload, open);
  useSupportRealtime(t?._id, q.setData);
  useEffect(() => { if (t?._id && t.unreadCustomerCount) markTicketRead(t._id).catch(() => { /* best-effort */ }); }, [t?._id, t?.unreadCustomerCount]);

  if (q.loading && !t) return <PageLoading label="Loading ticket" />;
  if (q.error && !t) return <PageError message={q.error} onRetry={q.reload} />;
  if (!t) return <PageError message="Ticket not found." />;

  const act = async (fn: () => Promise<SupportTicket>, ok: string) => {
    setBusy(true);
    try { q.setData(await fn()); toast(ok); } catch (e) { toastError(errorMessage(e, 'Something went wrong.')); } finally { setBusy(false); }
  };
  const send = () => { const text = msg.trim(); if (!text) return; setMsg(''); void act(() => replyToTicket(t._id, text), 'Reply sent'); };
  const tag = STATUS_TAG[t.status];

  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900 mb-5"><Icon name="arrow-left" size={19} />Ticket Details</button>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[16px] font-bold text-ink-900">{t.subject}</div><div className="text-[12.5px] text-ink-400 mt-0.5">{t.referenceId} · {TICKET_CATEGORY_LABEL[t.category]}</div></div><Tag tone={tag.tone}>{tag.label}</Tag></div>
      </Card>
      <div className="space-y-3 mt-4">
        {threadOf(t).map((m) => (
          <div key={m.key} className={cx('flex', m.me ? 'justify-end' : 'justify-start')}>
            <div className={cx('max-w-[80%] rounded-2xl px-4 py-3', m.me ? 'bg-brand-600 text-white rounded-br-md' : 'bg-white border border-ink-200 text-ink-900 rounded-bl-md')}>
              {!m.me && <div className="text-[11.5px] font-bold text-brand-600 mb-0.5">Builtglory Support</div>}
              <div className="text-[14px] leading-snug whitespace-pre-line">{m.text}</div>
              <div className={cx('text-[11px] mt-1 text-right', m.me ? 'text-white/70' : 'text-ink-400')}>{dateTime(m.at)}</div>
            </div>
          </div>
        ))}
        {(t.attachments ?? []).map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="flex justify-end text-[12.5px] font-semibold text-brand-600 items-center gap-1.5"><Icon name="paperclip" size={14} />Attachment</a>)}
      </div>
      {open ? (
        <>
          <div className="flex items-center gap-2.5 mt-5">
            <input aria-label="Reply" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} maxLength={5000} placeholder="Add a reply…" className="flex-1 h-12 px-4 bg-white border border-ink-200 rounded-full outline-none text-[14px] focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            <button type="button" aria-label="Send reply" disabled={busy} onClick={send} className={cx('w-12 h-12 rounded-full grid place-items-center shrink-0 transition', msg.trim() ? 'bg-brand-600 hover:bg-brand-700' : 'bg-ink-200')}><Icon name="send" size={18} color="#fff" /></button>
          </div>
          <button type="button" disabled={busy} onClick={() => void act(() => closeTicket(t._id), 'Ticket marked resolved')} className="w-full h-11 rounded-xl text-[14px] font-bold text-emerald-600 mt-3 hover:bg-emerald-50 transition">Mark as resolved</button>
        </>
      ) : (
        <button type="button" disabled={busy} onClick={() => void act(() => reopenTicket(t._id), 'Ticket reopened')} className="w-full h-11 rounded-xl border border-ink-200 text-[14px] font-bold text-ink-700 mt-5 hover:bg-ink-50 transition">Reopen ticket</button>
      )}
    </PageWrap>
  );
}
