import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Animated,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';

import { useReduceMotion } from './motion';
import { PageActivation } from './PageActivation';

export interface PagerController {
  count: number;
  /** Ширина однієї сторінки (= ширина екрана). */
  width: number;
  /** Положення сторінок у «сторінках»: 0 — перша, 1 — друга… Змінюється плавно під час свайпу на рідному потоці. */
  position: ReturnType<typeof Animated.divide>;
  scrollX: Animated.Value;
  scrollRef: RefObject<ScrollView | null>;
  /** Сторінка, на якій рух зупинився. */
  current: number;
  /** Які сторінки вже було видно хоча б частково. */
  seen: readonly boolean[];
  onScroll: (event: unknown) => void;
  onMomentumScrollEnd: () => void;
  /** Поточне положення в сторінках (дробове під час руху). */
  getPosition: () => number;
  /** Плавно перейти на сторінку. */
  goTo: (index: number) => void;
  /** Миттєво виставити положення (для перетягування лінзи). */
  scrubTo: (position: number) => void;
}

/**
 * Горизонтальний «листок» зі сторінками, яким можна свайпати пальцем, перемикати кнопками й перетягувати лінзою.
 * Усе, що рухається, залежить від одного значення `scrollX`, тому свайп, дотик і перетягування завжди узгоджені.
 */
export function usePager(count: number, initial = 0, onSettle?: (index: number) => void): PagerController {
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const scrollX = useRef(new Animated.Value(initial * width)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const lastX = useRef(initial * width);
  const currentRef = useRef(initial);
  const seenRef = useRef<boolean[]>(Array.from({ length: count }, (_, i) => i === initial));
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  const [current, setCurrent] = useState(initial);
  const [seen, setSeen] = useState<readonly boolean[]>(seenRef.current);

  const settle = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    const index = Math.min(count - 1, Math.max(0, Math.round(lastX.current / Math.max(1, width))));
    if (index === currentRef.current) return;
    currentRef.current = index;
    setCurrent(index);
    onSettleRef.current?.(index);
  }, [count, width]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x;
      lastX.current = x;
      const position = x / Math.max(1, width);
      let changed = false;
      for (let i = 0; i < count; i += 1) {
        if (!seenRef.current[i] && Math.abs(position - i) < 1) {
          seenRef.current[i] = true;
          changed = true;
        }
      }
      if (changed) setSeen([...seenRef.current]);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, 90);
    },
    [count, width, settle],
  );

  useEffect(() => () => settleTimer.current && clearTimeout(settleTimer.current), []);

  // Поворот екрана чи зміна ширини: лишаємось на тій самій сторінці.
  useEffect(() => {
    lastX.current = currentRef.current * width;
    scrollRef.current?.scrollTo({ x: lastX.current, y: 0, animated: false });
  }, [width]);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (event: unknown) => handleScroll(event as NativeSyntheticEvent<NativeScrollEvent>),
      }) as (event: unknown) => void,
    [scrollX, handleScroll],
  );

  const position = useMemo(() => Animated.divide(scrollX, Math.max(1, width)), [scrollX, width]);

  const getPosition = useCallback(() => lastX.current / Math.max(1, width), [width]);

  const goTo = useCallback(
    (index: number) => {
      const target = Math.min(count - 1, Math.max(0, index));
      scrollRef.current?.scrollTo({ x: target * width, y: 0, animated: !reduceMotion });
    },
    [count, width, reduceMotion],
  );

  const scrubTo = useCallback(
    (value: number) => {
      const clamped = Math.min(count - 1, Math.max(0, value));
      lastX.current = clamped * width;
      scrollRef.current?.scrollTo({ x: lastX.current, y: 0, animated: false });
    },
    [count, width],
  );

  return {
    count,
    width,
    position,
    scrollX,
    scrollRef,
    current,
    seen,
    onScroll,
    onMomentumScrollEnd: settle,
    getPosition,
    goTo,
    scrubTo,
  };
}

export interface PagerProps {
  pager: PagerController;
  children?: ReactNode;
}

export function Pager({ pager, children }: PagerProps) {
  const [height, setHeight] = useState(0);
  const pages = Children.toArray(children);
  // Перша сторінка з'являється одразу, решту «розігріваємо» по одній у спокійні хвилини,
  // щоб старт застосунку не чекав на всі екрани, а свайп не підвисав на монтуванні.
  const [warm, setWarm] = useState(1);
  useEffect(() => {
    if (warm >= pages.length) return undefined;
    const timer = setTimeout(() => setWarm((value) => value + 1), warm === 1 ? 700 : 350);
    return () => clearTimeout(timer);
  }, [warm, pages.length]);

  return (
    <View style={{ flex: 1 }} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      {height > 0 ? (
        <Animated.ScrollView
          ref={pager.scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          decelerationRate="fast"
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={pager.onScroll}
          onMomentumScrollEnd={pager.onMomentumScrollEnd}
          style={{ flex: 1 }}
        >
          {pages.map((page, index) => (
            <PageFrame key={index} pager={pager} index={index} height={height} mounted={index < warm || pager.seen[index] === true}>
              {page}
            </PageFrame>
          ))}
        </Animated.ScrollView>
      ) : null}
    </View>
  );
}

interface PageFrameProps {
  pager: PagerController;
  index: number;
  height: number;
  /** Чи вже будувати вміст сторінки (інакше лишається порожня рамка потрібного розміру). */
  mounted: boolean;
  children?: ReactNode;
}

/** Сторінка під час свайпу трохи зменшується й тьмяніє, поки не стане на місце. */
function PageFrame({ pager, index, height, mounted, children }: PageFrameProps) {
  const reduceMotion = useReduceMotion();
  const active = pager.current === index;
  const range = [index - 1, index, index + 1];
  const motion = reduceMotion
    ? null
    : {
        opacity: pager.position.interpolate({ inputRange: range, outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' }),
        transform: [
          { scale: pager.position.interpolate({ inputRange: range, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' }) },
        ],
      };

  return (
    <PageActivation seen={pager.seen[index] === true} active={active}>
      <Animated.View
        style={[{ width: pager.width, height }, motion]}
        importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!active}
      >
        {mounted ? children : null}
      </Animated.View>
    </PageActivation>
  );
}
