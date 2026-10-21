'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './authStorage';
import type { SupportTicket } from '../types/misc';
import type { SellerActivity } from '../types/sellRequest';

function apiOrigin() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1').replace(/\/api\/v1\/?$/, '');
}

function openChatSocket() {
  const token = getAccessToken();
  if (!token || typeof window === 'undefined') return null;
  return io(`${apiOrigin()}/chat`, { auth: { token }, transports: ['websocket', 'polling'] });
}

/** Live support replies on the /chat socket. The 10s poll stays as a fallback. */
export function useSupportRealtime(ticketId: string | undefined, onTicket: (ticket: SupportTicket) => void) {
  const cb = useRef(onTicket);
  cb.current = onTicket;
  useEffect(() => {
    if (!ticketId) return undefined;
    const socket: Socket | null = openChatSocket();
    if (!socket) return undefined;
    const apply = (payload: { ticket?: SupportTicket }) => { if (payload?.ticket) cb.current(payload.ticket); };
    socket.emit('support:join', { ticketId });
    socket.on('support:ticket_updated', apply);
    socket.on('support:message:new', apply);
    return () => {
      socket.emit('support:leave', { ticketId });
      socket.disconnect();
    };
  }, [ticketId]);
}

/** Refetch open lists when the API publishes `records:changed` for this customer. */
export function useRecordRefresh(reload: () => void) {
  const ref = useRef(reload);
  ref.current = reload;
  useEffect(() => {
    const socket: Socket | null = openChatSocket();
    if (!socket) return undefined;
    const onChange = () => ref.current();
    socket.on('records:changed', onChange);
    return () => {
      socket.off('records:changed', onChange);
      socket.disconnect();
    };
  }, []);
}

/** Live offer, payout and registration updates for one listing. */
export function useSellerRealtime(sellRequestId: string | undefined, onActivity: (activity: SellerActivity) => void) {
  const cb = useRef(onActivity);
  cb.current = onActivity;
  useEffect(() => {
    if (!sellRequestId) return undefined;
    const socket: Socket | null = openChatSocket();
    if (!socket) return undefined;
    socket.emit('sell:join', { sellRequestId });
    socket.on('sell:activity_updated', (payload: { activity?: SellerActivity }) => {
      if (payload?.activity) cb.current(payload.activity);
    });
    return () => { socket.disconnect(); };
  }, [sellRequestId]);
}
