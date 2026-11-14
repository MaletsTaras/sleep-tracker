import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface PageState {
  /** Сторінку вже було видно (хоча б частково): тоді блоки на ній з'являються. */
  seen: boolean;
  /** Скільки разів сторінка ставала поточною: графіки й числа програють рух знову за кожним разом. */
  activations: number;
}

/** Поза сторінками (наприклад, в аркуші запису) усе вважається видимим і активним одразу. */
const PageContext = createContext<PageState>({ seen: true, activations: 1 });

export function usePageState(): PageState {
  return useContext(PageContext);
}

export interface PageActivationProps {
  seen: boolean;
  active: boolean;
  children?: ReactNode;
}

export function PageActivation({ seen, active, children }: PageActivationProps) {
  const [activations, setActivations] = useState(active ? 1 : 0);
  useEffect(() => {
    if (active) setActivations((count) => count + 1);
  }, [active]);
  // Одразу після першого показу сторінки `activations` ще 0 лише тоді, коли вона не активна.
  const state = { seen: seen || active, activations: active && activations === 0 ? 1 : activations };
  return <PageContext.Provider value={state}>{children}</PageContext.Provider>;
}
