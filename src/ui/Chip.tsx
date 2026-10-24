import { useTheme } from '../theme/ThemeProvider';
import { fontFamilies } from '../theme/typography';
import { Tap } from './Tap';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

/** Невелика кнопка-пігулка для швидкого вибору значення. */
export function Chip({ label, selected, onPress, accessibilityLabel }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Tap
      onPress={onPress}
      haptic="selection"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected }}
      style={{
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 18,
        justifyContent: 'center',
        backgroundColor: selected ? colors.accent : colors.fill,
      }}
    >
      <Text variant="subhead" color={selected ? 'onAccent' : 'label'} tabular style={{ fontFamily: fontFamilies.medium }}>
        {label}
      </Text>
    </Tap>
  );
}
