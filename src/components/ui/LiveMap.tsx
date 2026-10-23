'use client';

import { useEffect, useRef } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cityCenter } from '../../lib/catalog';
import { cx } from '../../lib/format';

export interface LiveMapPin {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
}

interface LiveMapProps {
  pins?: LiveMapPin[];
  /** Used when there is no pin, and as the place the map opens on. */
  center?: { latitude: number; longitude: number } | null;
  height?: number;
  className?: string;
  /** Click or drag the pin to choose a point. */
  pickable?: boolean;
  onPick?: (point: { latitude: number; longitude: number }) => void;
  onPinClick?: (id: string) => void;
}

const isPoint = (p: { latitude: number; longitude: number }) =>
  Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;

function pinIcon(L: typeof import('leaflet'), label: string | undefined, pickable: boolean) {
  const el = document.createElement('div');
  if (label) {
    el.textContent = label;
    el.style.cssText = 'background:#1A6FFF;color:#fff;font:700 12px/1 system-ui,sans-serif;padding:7px 10px;border-radius:999px;white-space:nowrap;box-shadow:0 6px 16px rgba(15,23,42,.22)';
  } else {
    el.style.cssText = `width:${pickable ? 18 : 16}px;height:${pickable ? 18 : 16}px;border-radius:999px;background:#1A6FFF;box-shadow:0 0 0 4px #fff, 0 4px 12px rgba(15,23,42,.28)`;
  }
  const width = label ? Math.max(56, label.length * 8 + 20) : (pickable ? 18 : 16);
  const height = label ? 28 : (pickable ? 18 : 16);
  return L.divIcon({
    className: 'live-map-marker',
    html: el,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
  });
}

/** OpenStreetMap tiles with pins at real coordinates. Click or drag when `pickable`. */
export function LiveMap({ pins = [], center = null, height = 220, className, pickable = false, onPick, onPinClick }: LiveMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const ready = useRef(false);
  const skipView = useRef(false);
  const pinsRef = useRef(pins);
  const centerRef = useRef(center);
  const pickableRef = useRef(pickable);
  const onPickRef = useRef(onPick);
  const onPinClickRef = useRef(onPinClick);
  pinsRef.current = pins;
  centerRef.current = center;
  pickableRef.current = pickable;
  onPickRef.current = onPick;
  onPinClickRef.current = onPinClick;

  const pinsKey = pins.map((p) => `${p.id}:${p.latitude}:${p.longitude}:${p.label ?? ''}`).join('|');
  const centerKey = center ? `${center.latitude},${center.longitude}` : '';

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let cancelled = false;
    let map: LeafletMap | undefined;

    const draw = (L: typeof import('leaflet'), target: LeafletMap, layer: LayerGroup) => {
      layer.clearLayers();
      const points = pinsRef.current.filter(isPoint);
      points.forEach((pin) => {
        const marker = L.marker([pin.latitude, pin.longitude], {
          icon: pinIcon(L, pin.label, pickableRef.current),
          draggable: pickableRef.current,
          keyboard: false,
          title: pin.label,
        });
        marker.on('click', (event) => {
          L.DomEvent.stopPropagation(event.originalEvent);
          onPinClickRef.current?.(pin.id);
        });
        marker.on('dragend', () => {
          const at = marker.getLatLng();
          skipView.current = true;
          onPickRef.current?.({ latitude: at.lat, longitude: at.lng });
        });
        marker.addTo(layer);
      });

      const focus = points.length === 1 ? points[0] : centerRef.current && isPoint(centerRef.current) ? centerRef.current : cityCenter('Chennai');
      if (!focus) return;
      if (skipView.current) {
        skipView.current = false;
        if (!target.getBounds().contains([focus.latitude, focus.longitude])) target.panTo([focus.latitude, focus.longitude]);
        return;
      }
      if (points.length > 1) target.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude])), { padding: [48, 48], maxZoom: 14 });
      else target.setView([focus.latitude, focus.longitude], ready.current ? Math.max(target.getZoom(), points.length ? 15 : 12) : (points.length ? 15 : 12));
      ready.current = true;
    };

    void import('leaflet').then((L) => {
      if (cancelled || !host.current) return;
      map = L.map(host.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true });
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      map.on('click', (event) => {
        if (!pickableRef.current || !onPickRef.current) return;
        skipView.current = true;
        onPickRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      });
      mapRef.current = map;
      layerRef.current = layer;
      draw(L, map, layer);
      requestAnimationFrame(() => map?.invalidateSize());
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
      ready.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    void import('leaflet').then((L) => {
      if (mapRef.current !== map || !layerRef.current) return;
      layer.clearLayers();
      const points = pinsRef.current.filter(isPoint);
      points.forEach((pin) => {
        const marker = L.marker([pin.latitude, pin.longitude], {
          icon: pinIcon(L, pin.label, pickableRef.current),
          draggable: pickableRef.current,
          keyboard: false,
          title: pin.label,
        });
        marker.on('click', (event) => {
          L.DomEvent.stopPropagation(event.originalEvent);
          onPinClickRef.current?.(pin.id);
        });
        marker.on('dragend', () => {
          const at = marker.getLatLng();
          skipView.current = true;
          onPickRef.current?.({ latitude: at.lat, longitude: at.lng });
        });
        marker.addTo(layer);
      });
      const fallback = centerRef.current && isPoint(centerRef.current) ? centerRef.current : cityCenter('Chennai');
      const focus = points.length === 1 ? points[0] : fallback;
      if (skipView.current) {
        skipView.current = false;
        if (focus && !map.getBounds().contains([focus.latitude, focus.longitude])) map.panTo([focus.latitude, focus.longitude]);
        map.invalidateSize();
        return;
      }
      if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude])), { padding: [48, 48], maxZoom: 14 });
      else if (focus) {
        const current = map.getZoom();
        const zoom = Number.isFinite(current) ? Math.max(current, points.length ? 15 : 12) : (points.length ? 15 : 12);
        map.setView([focus.latitude, focus.longitude], zoom);
      }
      map.invalidateSize();
    });
  }, [pinsKey, centerKey, pickable]);

  return (
    <div className={cx('relative overflow-hidden bg-[#e8eef4]', className)} style={{ height }}>
      <div ref={host} className="live-map absolute inset-0" />
    </div>
  );
}
