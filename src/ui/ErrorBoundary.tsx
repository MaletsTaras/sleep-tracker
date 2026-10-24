import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface State {
  error: Error | null;
}

/**
 * Остання лінія захисту: якщо щось зламалось під час показу екрана, замість білого екрана
 * користувач бачить пояснення й кнопку «Спробувати знову». Свідомо не залежить ні від теми, ні від шрифтів.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Помилка інтерфейсу:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: '#1C1B4B', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Щось пішло не так</Text>
        <Text style={{ color: '#FFFFFFCC', fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
          Ваші записи в безпеці. Спробуйте відкрити екран ще раз. Якщо помилка повторюється, зробіть скриншот цього екрана й надішліть розробнику.
        </Text>
        <ScrollView style={{ maxHeight: 160, marginBottom: 20 }}>
          <Text selectable style={{ color: '#FFFFFF99', fontSize: 12, lineHeight: 17 }}>
            {error.message}
          </Text>
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ error: null })}
          style={{ backgroundColor: '#FFFFFF', borderRadius: 27, height: 54, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#3A35C4', fontSize: 17, fontWeight: '600' }}>Спробувати знову</Text>
        </Pressable>
      </View>
    );
  }
}
