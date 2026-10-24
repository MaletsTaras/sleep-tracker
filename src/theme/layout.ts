/** Відступи, радіуси й розміри, спільні для всього інтерфейсу. */

export const layout = {
  /** Бокові поля екрана. */
  gutter: 16,
  /** Відступ між блоками. */
  gap: 12,
  sectionGap: 28,

  radiusHero: 28,
  radiusCard: 22,
  radiusTile: 18,
  radiusControl: 14,

  tabBarHeight: 64,
  tabBarMargin: 12,
  tabBarSideMargin: 16,

  /** Мінімальна зона дотику (dp). */
  hit: 44,
} as const;

/** Скільки місця внизу екрана займає плаваюча панель вкладок (без системного відступу). */
export const TAB_BAR_FOOTPRINT = layout.tabBarHeight + layout.tabBarMargin * 2;
