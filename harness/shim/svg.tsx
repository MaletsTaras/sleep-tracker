import * as React from 'react';
import { toCss } from './rn';

const style = (p: any) => ({ ...toCss([p.style]), ...(p.pointerEvents === 'none' ? { pointerEvents: 'none' } : {}) });
const strip = ({ style: _s, pointerEvents: _p, children: _c, ...rest }: any) => rest;

function el(tag: string) {
  return ({ children, ...p }: any) => React.createElement(tag, { ...strip(p), style: style(p) }, children);
}

export default function Svg({ children, ...p }: any) {
  return React.createElement('svg', { ...strip(p), style: { display: 'block', overflow: 'visible', flexShrink: 0, ...style(p) } }, children);
}
export const Path = el('path');
export const Circle = el('circle');
export const Rect = el('rect');
export const Line = el('line');
export const G = el('g');
export const Defs = el('defs');
export const ClipPath = el('clipPath');
export const Stop = el('stop');
export const LinearGradient = el('linearGradient');
