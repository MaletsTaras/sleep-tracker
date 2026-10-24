import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Tap } from './Tap';

export interface StepperProps {
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
  decrementLabel: string;
  incrementLabel: string;
}

/** Пара круглих кнопок «−» і «+». */
export function Stepper({ onDecrement, onIncrement, canDecrement, canIncrement, decrementLabel, incrementLabel }: StepperProps) {
  const { colors } = useTheme();
  const button = {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.fill,
  };
  return (
    <View style={{ flexDirection: 'row' }}>
      <Tap onPress={onDecrement} disabled={!canDecrement} haptic="selection" accessibilityLabel={decrementLabel} style={button}>
        <Icon name="minus" size={20} color={colors.label} strokeWidth={2.2} />
      </Tap>
      <View style={{ width: 8 }} />
      <Tap onPress={onIncrement} disabled={!canIncrement} haptic="selection" accessibilityLabel={incrementLabel} style={button}>
        <Icon name="plus" size={20} color={colors.label} strokeWidth={2.2} />
      </Tap>
    </View>
  );
}
