'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Icon } from './Icon';
import { cx } from '../../lib/format';

const EXPIRY = 300;

/** Scannable UPI payment QR (`upi://pay`) drawn in the design's style: crisp modules, centre logo, scan line and expiry timer. */
export function UpiQR({ upiId, payee, amount, note }: { upiId: string; payee: string; amount: number; note: string }) {
  const [left, setLeft] = useState(EXPIRY);
  const [nonce, setNonce] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}&tr=${nonce}`;
  const qr = useMemo(() => QRCode.create(uri, { errorCorrectionLevel: 'H' }), [uri]);
  const n = qr.modules.size;
  const mid = Math.floor(n / 2);
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (Math.abs(r - mid) <= 3 && Math.abs(c - mid) <= 3) continue; // logo cut-out (level H tolerates it)
    if (qr.modules.get(r, c)) cells.push([r, c]);
  }
  const amountLabel = `₹ ${amount.toLocaleString('en-IN')}`;
  return (
    <div className="rounded-2xl border border-ink-200 p-4 flex flex-col items-center text-center">
      <div className="relative p-3 rounded-2xl bg-white ring-1 ring-ink-200 shadow-sm">
        <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} width="176" height="176" shapeRendering="crispEdges" role="img" aria-label={`UPI QR code to pay ${amountLabel} to ${upiId}`} className={left === 0 ? 'opacity-20' : ''}>
          {cells.map(([r, c]) => <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F172A" />)}
        </svg>
        <div className="absolute inset-0 grid place-items-center pointer-events-none"><div className="w-9 h-9 rounded-lg bg-brand-600 grid place-items-center ring-4 ring-white"><Icon name="home" size={18} color="#fff" /></div></div>
        {left > 0 && <div className="absolute left-3 right-3 h-0.5 bg-brand-500/70 rounded-full shadow-[0_0_12px_2px_rgba(26,111,255,.5)]" style={{ animation: 'qrScan 2.2s ease-in-out infinite alternate', top: 12 }}></div>}
        {left === 0 && <div className="absolute inset-0 grid place-items-center"><button type="button" onClick={() => { setNonce(Date.now()); setLeft(EXPIRY); }} className="h-9 px-4 rounded-full bg-brand-600 text-white text-[12.5px] font-bold">Refresh QR</button></div>}
      </div>
      <div className="text-[14px] font-bold text-ink-900 mt-3">Scan with any UPI app</div>
      <div className="text-[12.5px] text-ink-500">Pay {amountLabel} to <b className="text-ink-700">{upiId}</b></div>
      <div className="flex items-center gap-2 mt-3">{['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((a) => <span key={a} className="h-7 px-2.5 rounded-full bg-ink-100 text-[11.5px] font-semibold text-ink-600 grid place-items-center">{a}</span>)}</div>
      <div className={cx('flex items-center gap-1.5 text-[12px] font-semibold mt-3', left < 60 ? 'text-rose-600' : 'text-ink-500')}><Icon name="clock" size={13} />{left > 0 ? `QR expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'QR expired'}</div>
    </div>
  );
}
