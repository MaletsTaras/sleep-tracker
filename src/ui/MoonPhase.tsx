import { useEffect, useId, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';

import { moonLitPath } from '../domain/chartScale';
import { useTheme } from '../theme/ThemeProvider';
import { useReduceMotion } from './motion';
import { useTween } from './useTween';

export interface MoonPhaseProps {
  /** Частка цілі сну: 0 — новий місяць, 1 і більше — повний. */
  fraction: number;
  size?: number;
  accessibilityLabel?: string;
}

/**
 * Місяць, що «наповнюється» разом із досягненням цілі сну: чим ближче до цілі, тим більша освітлена частина.
 * Це єдина ілюстрація в застосунку, решта інтерфейсу — типографіка.
 */
export function MoonPhase({ fraction, size = 96, accessibilityLabel }: MoonPhaseProps) {
  const { colors } = useTheme();
  const clipId = `moon${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const shown = useTween(Math.min(1, Math.max(0, fraction)));
  const reduceMotion = useReduceMotion();
  const breath = useRef(new Animated.Value(0)).current;

  // Місяць ледь помітно «дихає»: повільно збільшується й зменшується, тож екран не виглядає знерухомленим.
  useEffect(() => {
    if (reduceMotion) {
      breath.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, breath]);

  const c = size / 2;
  const radius = size / 2 - 2;
  const lit = moonLitPath(c, c, radius, shown);

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size, transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }] }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={c} cy={c} r={radius} fill={colors.moonShade} stroke={colors.moonRim} strokeWidth={1.5} />
        {lit ? (
          <>
            <Defs>
              <ClipPath id={clipId}>
                <Path d={lit} />
              </ClipPath>
            </Defs>
            <Path d={lit} fill={colors.moonLit} />
            <G clipPath={`url(#${clipId})`}>
              <Circle cx={c - radius * 0.3} cy={c - radius * 0.2} r={radius * 0.2} fill="#D9C27F" opacity={0.42} />
              <Circle cx={c + radius * 0.24} cy={c + radius * 0.3} r={radius * 0.27} fill="#D9C27F" opacity={0.36} />
              <Circle cx={c + radius * 0.42} cy={c - radius * 0.36} r={radius * 0.11} fill="#D9C27F" opacity={0.42} />
            </G>
          </>
        ) : null}
      </Svg>
    </Animated.View>
  );
}
