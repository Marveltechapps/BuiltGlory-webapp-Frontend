import { createElement, type CSSProperties } from 'react';
import { ICONS } from '../../lib/icons';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

const camel = (k: string) => k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** Lucide icon rendered from its node tuples, with `pathLength=1` so the stroke-draw animations in globals.css work. */
export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, className, style }: IconProps) {
  const node = ICONS[name];
  if (!node) return <span aria-hidden style={{ display: 'inline-block', width: size, height: size, ...style }} className={className} />;
  const children = node[2] ?? [];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={'bg-ic' + (className ? ' ' + className : '')} style={style} aria-hidden="true"
    >
      {children.map(([tag, attrs], i) => createElement(tag, {
        key: i,
        pathLength: 1,
        ...Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => [camel(k), v])),
      }))}
    </svg>
  );
}
