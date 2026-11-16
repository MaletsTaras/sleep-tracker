/* Імітація react-native на DOM для тестового стенда: достатня для екранів застосунку, не для загального вжитку. */
import * as React from 'react';
import { forwardRef, useContext, useEffect, useImperativeHandle, useLayoutEffect, useReducer, useRef, useState } from 'react';

declare const window: any;
declare const document: any;
const g: any = window;
g.__alerts = [];
g.__backListeners = [];

/* ---------------- Animated: значення, похідні, анімації ---------------- */
const raf = (cb: (t: number) => void) => requestAnimationFrame(cb);

abstract class AnimatedNode {
  _subs = new Set<() => void>();
  abstract __getValue(): any;
  __subscribe(cb: () => void) {
    this._subs.add(cb);
    return () => this._subs.delete(cb);
  }
  __notify() {
    for (const cb of [...this._subs]) cb();
  }
  interpolate(config: any) {
    return new AnimatedDerived([this], () => interpolateNumber(this.__getValue(), config));
  }
}
const val = (v: any) => (v instanceof AnimatedNode ? v.__getValue() : v);

class AnimatedDerived extends AnimatedNode {
  constructor(parents: any[], private compute: () => any) {
    super();
    for (const p of parents) if (p instanceof AnimatedNode) p.__subscribe(() => this.__notify());
  }
  __getValue() {
    return this.compute();
  }
}

function interpolateNumber(x: number, config: any): number {
  const { inputRange: inp, outputRange: out } = config;
  const left = config.extrapolateLeft ?? config.extrapolate ?? 'extend';
  const right = config.extrapolateRight ?? config.extrapolate ?? 'extend';
  if (x <= inp[0]) {
    if (left === 'clamp') return out[0];
    if (left === 'identity') return x;
    const k = (out[1] - out[0]) / (inp[1] - inp[0]);
    return out[0] + (x - inp[0]) * k;
  }
  const last = inp.length - 1;
  if (x >= inp[last]) {
    if (right === 'clamp') return out[last];
    if (right === 'identity') return x;
    const k = (out[last] - out[last - 1]) / (inp[last] - inp[last - 1]);
    return out[last] + (x - inp[last]) * k;
  }
  let i = 1;
  while (x > inp[i]) i += 1;
  const t = (x - inp[i - 1]) / (inp[i] - inp[i - 1]);
  return out[i - 1] + (out[i] - out[i - 1]) * t;
}

class AnimatedValue extends AnimatedNode {
  _value: number;
  _anim: { stop(): void } | null = null;
  _listeners = new Map<string, (s: { value: number }) => void>();
  constructor(v: number) {
    super();
    this._value = v;
  }
  _set(v: number) {
    this._value = v;
    this.__notify();
    for (const cb of this._listeners.values()) cb({ value: v });
  }
  setValue(v: number) {
    this.stopAnimation();
    this._set(v);
  }
  stopAnimation(cb?: (v: number) => void) {
    this._anim?.stop();
    this._anim = null;
    cb?.(this._value);
  }
  addListener(cb: (s: { value: number }) => void) {
    const id = String(Math.random());
    this._listeners.set(id, cb);
    return id;
  }
  removeListener(id: string) {
    this._listeners.delete(id);
  }
  __getValue() {
    return this._value;
  }
}

export const Easing: any = {
  linear: (t: number) => t,
  ease: (t: number) => t * t * (3 - 2 * t),
  sin: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  cubic: (t: number) => t * t * t,
  quad: (t: number) => t * t,
  in: (f: any) => f,
  out: (f: any) => (t: number) => 1 - f(1 - t),
  inOut: (f: any) => (t: number) => (t < 0.5 ? f(t * 2) / 2 : 1 - f((1 - t) * 2) / 2),
  bezier: () => (t: number) => t * t * (3 - 2 * t),
};

interface Anim {
  start(cb?: (r: { finished: boolean }) => void): void;
  stop(): void;
}

function runFrames(value: AnimatedValue, step: (dtMs: number, nowMs: number) => boolean, cb?: (r: { finished: boolean }) => void): Anim {
  let stopped = false;
  let last = performance.now();
  const self = {
    start: () => undefined,
    stop() {
      if (stopped) return;
      stopped = true;
      cb?.({ finished: false });
    },
  };
  value._anim = self;
  const tick = (now: number) => {
    if (stopped) return;
    const dt = Math.min(64, now - last);
    last = now;
    if (step(dt, now)) {
      stopped = true;
      if (value._anim === self) value._anim = null;
      cb?.({ finished: true });
    } else raf(tick);
  };
  raf(tick);
  return self as any;
}

function timing(value: AnimatedValue, config: any): Anim {
  let running: Anim | null = null;
  return {
    start(cb) {
      value.stopAnimation();
      const from = value._value;
      const to = config.toValue;
      const dur = config.duration ?? 500;
      const ease = config.easing ?? Easing.ease;
      let elapsed = -(config.delay ?? 0);
      running = runFrames(
        value,
        (dt) => {
          elapsed += dt;
          if (elapsed < 0) return false;
          const k = Math.min(1, elapsed / dur);
          value._set(from + (to - from) * ease(k));
          return k >= 1;
        },
        cb,
      );
    },
    stop() {
      running?.stop();
    },
  };
}

function spring(value: AnimatedValue, config: any): Anim {
  let running: Anim | null = null;
  return {
    start(cb) {
      value.stopAnimation();
      const to = config.toValue;
      const k = config.stiffness ?? 100;
      const c = config.damping ?? 10;
      const m = config.mass ?? 1;
      let x = value._value;
      let v = (config.velocity ?? 0) * 1000;
      running = runFrames(
        value,
        (dt) => {
          let remaining = dt / 1000;
          while (remaining > 0) {
            const h = Math.min(remaining, 1 / 240);
            const a = (-k * (x - to) - c * v) / m;
            v += a * h;
            x += v * h;
            remaining -= h;
          }
          const crossed = config.overshootClamping && ((v > 0 && x >= to) || (v < 0 && x <= to));
          if (crossed || (Math.abs(v) < 0.02 && Math.abs(x - to) < 0.01)) {
            value._set(to);
            return true;
          }
          value._set(x);
          return false;
        },
        cb,
      );
    },
    stop() {
      running?.stop();
    },
  };
}

const parallel = (anims: Anim[]): Anim => ({
  start(cb) {
    let left = anims.length;
    let all = true;
    if (left === 0) return cb?.({ finished: true });
    for (const a of anims)
      a.start((r) => {
        all = all && r.finished;
        left -= 1;
        if (left === 0) cb?.({ finished: all });
      });
  },
  stop() {
    anims.forEach((a) => a.stop());
  },
});
const sequence = (anims: Anim[]): Anim => {
  let stopped = false;
  return {
    start(cb) {
      stopped = false;
      const run = (i: number) => {
        if (i >= anims.length) return cb?.({ finished: true });
        anims[i].start((r) => {
          if (!r.finished || stopped) return cb?.({ finished: false });
          run(i + 1);
        });
      };
      run(0);
    },
    stop() {
      stopped = true;
      anims.forEach((a) => a.stop());
    },
  };
};
const loop = (anim: Anim, config?: any): Anim => {
  let stopped = false;
  return {
    start(cb) {
      stopped = false;
      let n = 0;
      const again = () => {
        if (stopped || (config?.iterations !== undefined && config.iterations >= 0 && n >= config.iterations)) return cb?.({ finished: !stopped });
        n += 1;
        anim.start((r) => (r.finished ? again() : cb?.({ finished: false })));
      };
      again();
    },
    stop() {
      stopped = true;
      anim.stop();
    },
  };
};

function eventHandler(mapping: any[], opts: any) {
  const assign = (target: any, source: any) => {
    for (const key of Object.keys(target)) {
      if (target[key] instanceof AnimatedValue) target[key]._set(source?.[key]);
      else if (target[key] && typeof target[key] === 'object') assign(target[key], source?.[key]);
    }
  };
  return (...args: any[]) => {
    mapping.forEach((m, i) => m && assign(m, args[i]));
    opts?.listener?.(...args);
  };
}

function collectNodes(style: any, out: AnimatedNode[] = []) {
  if (!style) return out;
  if (style instanceof AnimatedNode) out.push(style);
  else if (Array.isArray(style)) style.forEach((s) => collectNodes(s, out));
  else if (typeof style === 'object') for (const k of Object.keys(style)) collectNodes(style[k], out);
  return out;
}

function createAnimatedComponent(Component: any) {
  return forwardRef((props: any, ref: any) => {
    const [, force] = useReducer((x: number) => x + 1, 0);
    const nodes = collectNodes(props.style);
    useEffect(() => {
      let pending = false;
      const schedule = () => {
        if (pending) return;
        pending = true;
        raf(() => {
          pending = false;
          force();
        });
      };
      const unsubs = nodes.map((n) => n.__subscribe(schedule));
      return () => unsubs.forEach((u) => u());
    });
    return <Component {...props} ref={ref} />;
  });
}

/* ---------------- стилі ---------------- */
const PX = new Set('width height minWidth maxWidth minHeight maxHeight top left right bottom margin marginTop marginBottom marginLeft marginRight padding paddingTop paddingBottom paddingLeft paddingRight borderRadius borderTopLeftRadius borderTopRightRadius borderBottomLeftRadius borderBottomRightRadius borderWidth borderTopWidth borderBottomWidth borderLeftWidth borderRightWidth fontSize lineHeight letterSpacing gap rowGap columnGap'.split(' '));
const px = (v: any) => (typeof v === 'number' ? `${v}px` : v);

export function flattenStyle(style: any): any {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style;
}

function rgba(color: string, opacity: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

export function toCss(style: any): any {
  const s = flattenStyle(style);
  const css: any = {};
  const shadow: any = {};
  for (const key of Object.keys(s)) {
    const v = val(s[key]);
    if (v === undefined || v === null) continue;
    switch (key) {
      case 'marginHorizontal': css.marginLeft = css.marginRight = px(v); break;
      case 'marginVertical': css.marginTop = css.marginBottom = px(v); break;
      case 'paddingHorizontal': css.paddingLeft = css.paddingRight = px(v); break;
      case 'paddingVertical': css.paddingTop = css.paddingBottom = px(v); break;
      case 'flex': css.flex = v > 0 ? `${v} 1 0%` : v === 0 ? '0 0 auto' : '1 1 auto'; break;
      case 'transform':
        css.transform = (v as any[])
          .map((t) => {
            const [k, raw] = Object.entries(t)[0];
            const x = val(raw);
            return `${k}(${/translate/.test(k) ? `${x}px` : x})`;
          })
          .join(' ');
        break;
      case 'shadowColor': case 'shadowOpacity': case 'shadowRadius': case 'shadowOffset': shadow[key] = v; break;
      case 'elevation': case 'includeFontPadding': case 'textAlignVertical': break;
      case 'fontVariant': css.fontVariantNumeric = (v as string[]).includes('tabular-nums') ? 'tabular-nums' : 'normal'; break;
      case 'pointerEvents': css.pointerEvents = v === 'auto' ? 'auto' : 'none'; break;
      default: css[key] = PX.has(key) ? px(v) : v;
    }
  }
  if (shadow.shadowColor && (shadow.shadowOpacity ?? 0) > 0) {
    const o = shadow.shadowOffset ?? { width: 0, height: 0 };
    css.boxShadow = `${o.width}px ${o.height}px ${(shadow.shadowRadius ?? 0) * 1.6}px ${rgba(shadow.shadowColor, shadow.shadowOpacity)}`;
  }
  return css;
}

export const StyleSheet: any = {
  create: (s: any) => s,
  flatten: flattenStyle,
  hairlineWidth: 1,
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
};

/* ---------------- базові компоненти ---------------- */
const BASE: any = {
  display: 'flex', flexDirection: 'column', alignItems: 'stretch', alignContent: 'flex-start', position: 'relative',
  boxSizing: 'border-box', flexShrink: 0, minWidth: 0, minHeight: 0, borderStyle: 'solid', borderWidth: 0, margin: 0, padding: 0,
};

function useLayoutCallback(el: React.RefObject<any>, onLayout?: (e: any) => void) {
  useLayoutEffect(() => {
    const node = el.current;
    if (!onLayout || !node) return undefined;
    const fire = () => onLayout({ nativeEvent: { layout: { x: node.offsetLeft, y: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight } } });
    fire();
    const ro = new ResizeObserver(fire);
    ro.observe(node);
    return () => ro.disconnect();
  }, [!!onLayout]);
}

function domProps(p: any): any {
  const out: any = {};
  if (p.testID) out['data-testid'] = p.testID;
  if (p.accessibilityLabel) out['aria-label'] = p.accessibilityLabel;
  if (p.accessibilityRole) out.role = p.accessibilityRole === 'header' ? 'heading' : p.accessibilityRole === 'image' ? 'img' : p.accessibilityRole;
  const st = p.accessibilityState;
  if (st?.selected !== undefined) out['aria-selected'] = st.selected;
  if (st?.checked !== undefined) out['aria-checked'] = st.checked;
  if (st?.disabled) out['aria-disabled'] = true;
  if (p.accessibilityValue?.text) out['aria-valuetext'] = p.accessibilityValue.text;
  if (flattenStyle(p.style)?.pointerEvents === 'none' || p.pointerEvents === 'none') out['data-pe'] = 'none';
  for (const k of Object.keys(p)) if (/^onPointer/.test(k)) out[k] = p[k];
  return out;
}

export const View: any = forwardRef((props: any, ref: any) => {
  const el = useRef<any>(null);
  useImperativeHandle(ref, () => el.current);
  useLayoutCallback(el, props.onLayout);
  const pe = props.pointerEvents ? { pointerEvents: props.pointerEvents } : {};
  return (
    <div ref={el} {...domProps(props)} style={{ ...BASE, ...toCss([props.style, pe]) }}>
      {props.children}
    </div>
  );
});

const TextNest = React.createContext(false);
export const Text: any = forwardRef((props: any, ref: any) => {
  const nested = useContext(TextNest);
  const el = useRef<any>(null);
  useImperativeHandle(ref, () => el.current);
  const css = toCss(props.style);
  const lines = props.numberOfLines;
  const clamp: any = lines === 1 ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : lines > 1 ? { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {};
  const style = { margin: 0, padding: 0, whiteSpace: 'pre-wrap', boxSizing: 'border-box', color: '#000', fontSize: 14, ...(nested ? { display: 'inline' } : { display: 'block', position: 'relative', flexShrink: 1, minWidth: 0 }), ...css, ...clamp };
  return (
    <TextNest.Provider value>
      {React.createElement(nested ? 'span' : 'div', { ref: el, ...domProps(props), style }, props.children)}
    </TextNest.Provider>
  );
});

export const ScrollView: any = forwardRef((props: any, ref: any) => {
  const el = useRef<any>(null);
  const inner = useRef<any>(null);
  useLayoutCallback(el, props.onLayout);
  useImperativeHandle(ref, () => ({
    scrollTo: ({ x = 0, y = 0, animated }: any) => el.current?.scrollTo({ left: x, top: y, behavior: animated ? 'smooth' : 'instant' }),
    scrollToEnd: () => el.current?.scrollTo({ top: 1e9 }),
    getEl: () => el.current,
  }));
  useLayoutEffect(() => {
    const node = inner.current;
    if (!props.onContentSizeChange || !node) return undefined;
    const fire = () => props.onContentSizeChange(node.offsetWidth, node.offsetHeight);
    fire();
    const ro = new ResizeObserver(fire);
    ro.observe(node);
    return () => ro.disconnect();
  }, [!!props.onContentSizeChange]);
  const h = !!props.horizontal;
  return (
    <div
      ref={el}
      data-scroll={h ? 'x' : 'y'}
      {...domProps(props)}
      onScroll={() => {
        const n = el.current;
        props.onScroll?.({ nativeEvent: { contentOffset: { x: n.scrollLeft, y: n.scrollTop }, contentSize: { width: n.scrollWidth, height: n.scrollHeight }, layoutMeasurement: { width: n.clientWidth, height: n.clientHeight } } });
      }}
      style={{ ...BASE, flexDirection: h ? 'row' : 'column', overflowX: h ? 'auto' : 'hidden', overflowY: h ? 'hidden' : 'auto', scrollbarWidth: 'none', ...toCss(props.style) }}
    >
      <div ref={inner} style={{ ...BASE, flexDirection: h ? 'row' : 'column', flexGrow: 0, ...(h ? {} : { minWidth: '100%' }), ...toCss(props.contentContainerStyle) }}>
        {props.children}
      </div>
    </div>
  );
});

/* Відповідач жестів: дуже спрощена версія системи RN, потрібна лише для Pressable і PanResponder. */
let claimedBy: { terminate: () => void } | null = null;

export const Pressable: any = forwardRef((props: any, ref: any) => {
  const el = useRef<any>(null);
  useImperativeHandle(ref, () => el.current);
  useLayoutCallback(el, props.onLayout);
  const down = useRef(false);
  const self = useRef<any>({ terminate: () => undefined });
  self.current.terminate = () => {
    if (down.current) {
      down.current = false;
      props.onPressOut?.({});
    }
    if (claimedBy === self.current) claimedBy = null;
  };
  const pressed = false;
  const style = typeof props.style === 'function' ? props.style({ pressed }) : props.style;
  return (
    <div
      ref={el}
      {...domProps(props)}
      style={{ ...BASE, ...toCss(style) }}
      onPointerDown={(e) => {
        if (props.disabled) return;
        down.current = true;
        claimedBy = self.current;
        (e.nativeEvent as any).__claimed = true;
        props.onPressIn?.({ nativeEvent: {} });
      }}
      onPointerUp={() => {
        if (!down.current) return;
        down.current = false;
        if (claimedBy === self.current) claimedBy = null;
        props.onPressOut?.({ nativeEvent: {} });
        props.onPress?.({ nativeEvent: {} });
      }}
      onPointerLeave={() => self.current.terminate()}
      onPointerCancel={() => self.current.terminate()}
    >
      {props.children}
    </div>
  );
});

export const PanResponder: any = {
  create(config: any) {
    const gs: any = { moveX: 0, moveY: 0, x0: 0, y0: 0, dx: 0, dy: 0, vx: 0, vy: 0, numberActiveTouches: 0 };
    let tracking: any = null;
    let granted = false;
    const mk = (e: PointerEvent, target: any) => {
      const r = target.getBoundingClientRect();
      return { nativeEvent: { locationX: e.clientX - r.left, locationY: e.clientY - r.top, pageX: e.clientX, pageY: e.clientY, target } };
    };
    const update = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(1, now - tracking.lastT);
      gs.vx = (e.clientX - tracking.lastX) / dt;
      gs.vy = (e.clientY - tracking.lastY) / dt;
      tracking.lastX = e.clientX; tracking.lastY = e.clientY; tracking.lastT = now;
      gs.moveX = e.clientX; gs.moveY = e.clientY;
      gs.dx = e.clientX - tracking.downX; gs.dy = e.clientY - tracking.downY;
    };
    const grant = (e: PointerEvent) => {
      granted = true;
      gs.x0 = e.clientX; gs.y0 = e.clientY;
      config.onPanResponderGrant?.(mk(e, tracking.target), gs);
    };
    const finish = (e: PointerEvent, terminated: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      const was = granted;
      granted = false;
      const t = tracking;
      if (was && t) update(e);
      tracking = null;
      if (!was || !t) return;
      const ev = mk(e, t.target);
      if (terminated) config.onPanResponderTerminate?.(ev, gs);
      else config.onPanResponderRelease?.(ev, gs);
      config.onPanResponderEnd?.(ev, gs);
    };
    const onMove = (e: PointerEvent) => {
      if (!tracking) return;
      const prevVx = gs.vx;
      update(e);
      if (!granted) {
        const ev = mk(e, tracking.target);
        if (config.onMoveShouldSetPanResponderCapture?.(ev, gs)) {
          tracking.claimed?.terminate();
          grant(e);
        } else if (!tracking.claimed && config.onMoveShouldSetPanResponder?.(ev, gs)) grant(e);
        if (!granted) return;
      }
      config.onPanResponderMove?.(mk(e, tracking.target), gs);
      void prevVx;
    };
    const onUp = (e: PointerEvent) => finish(e, false);
    const onCancel = (e: PointerEvent) => finish(e, true);
    return {
      panHandlers: {
        onPointerDown: (ev: any) => {
          const e: PointerEvent = ev.nativeEvent;
          if (tracking) return;
          const claimed = (e as any).__claimed ? claimedBy : null;
          tracking = { downX: e.clientX, downY: e.clientY, lastX: e.clientX, lastY: e.clientY, lastT: performance.now(), target: ev.currentTarget, claimed };
          Object.assign(gs, { dx: 0, dy: 0, vx: 0, vy: 0, moveX: e.clientX, moveY: e.clientY });
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          window.addEventListener('pointercancel', onCancel);
          if (!claimed && config.onStartShouldSetPanResponder?.(mk(e, ev.currentTarget), gs)) grant(e);
        },
      },
    };
  },
};

export const Modal: any = (props: any) =>
  props.visible === false ? null : <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>{props.children}</div>;

export const Animated: any = {
  Value: AnimatedValue,
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  ScrollView: createAnimatedComponent(ScrollView),
  createAnimatedComponent,
  timing, spring, parallel, sequence, loop,
  delay: (ms: number) => timing(new AnimatedValue(0), { toValue: 1, duration: ms }),
  event: eventHandler,
  divide: (a: any, b: any) => new AnimatedDerived([a, b], () => val(a) / val(b)),
  multiply: (a: any, b: any) => new AnimatedDerived([a, b], () => val(a) * val(b)),
  add: (a: any, b: any) => new AnimatedDerived([a, b], () => val(a) + val(b)),
  subtract: (a: any, b: any) => new AnimatedDerived([a, b], () => val(a) - val(b)),
};

/* ---------------- решта API ---------------- */
export function useWindowDimensions() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const on = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return { ...size, scale: 2, fontScale: 1 };
}
export const useColorScheme = () => (window.__scheme ?? 'light') as 'light' | 'dark';
export const Platform: any = { OS: 'android', select: (o: any) => o.android ?? o.default };
export const AppState: any = { currentState: 'active', addEventListener: () => ({ remove() {} }) };
export const AccessibilityInfo: any = {
  isReduceMotionEnabled: () => Promise.resolve(!!window.__reduceMotion),
  addEventListener: () => ({ remove() {} }),
  announceForAccessibility() {},
};
export const Alert: any = {
  alert(title: string, message?: string, buttons?: any[]) {
    g.__alerts.push({ title, message, buttons: buttons ?? [] });
  },
};
g.__alertPress = (i: number) => {
  const a = g.__alerts.pop();
  a?.buttons[i]?.onPress?.();
};
export const Share: any = { share: async () => ({ action: 'sharedAction' }) };
export const BackHandler: any = {
  addEventListener(_n: string, cb: any) {
    g.__backListeners.push(cb);
    return { remove: () => g.__backListeners.splice(g.__backListeners.indexOf(cb), 1) };
  },
};
g.__back = () => {
  for (let i = g.__backListeners.length - 1; i >= 0; i -= 1) if (g.__backListeners[i]()) return true;
  return false;
};
export const Dimensions: any = { get: () => ({ width: window.innerWidth, height: window.innerHeight, scale: 2, fontScale: 1 }) };
