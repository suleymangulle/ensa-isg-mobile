import { Pressable, Text as RNText, View } from 'react-native'
import { useAppearance, type ColorScheme, type ThemeMode, useTheme } from './theme'

/**
 * The appearance controls, with every visible word supplied by the caller.
 *
 * The web library ships no copy in any language and this one does not either: the labels come
 * from `layout/Header`, which has the translations. Two of the web menu's four sections are gone,
 * and deliberately - the sidebar's presentation and tone decide how a permanently visible aside
 * is drawn, and there is no permanently visible aside on a phone. Passing those labels in is
 * harmless; they are simply not rendered.
 */

export interface AppearanceLabels {
  presentation?: { title: string; compact: string; grouped: string }
  mode?: { title: string; light: string; dark: string; system: string }
  tone?: { title: string; light: string; dark: string; auto: string }
  colorScheme?: { title: string; options: Record<string, string> }
}

export function AppearanceMenu({
  colorSchemes,
  labels,
}: {
  colorSchemes: ColorScheme[]
  labels: AppearanceLabels
}) {
  const theme = useTheme()
  const { mode, setMode, colorSchemeId, setColorSchemeId } = useAppearance()

  const modes: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: labels.mode?.light ?? 'Light' },
    { key: 'dark', label: labels.mode?.dark ?? 'Dark' },
    { key: 'system', label: labels.mode?.system ?? 'System' },
  ]

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <RNText style={{ color: theme['gray-500'], fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
          {labels.mode?.title ?? 'Theme'}
        </RNText>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {modes.map((item) => (
            <Choice
              key={item.key}
              label={item.label}
              active={mode === item.key}
              onPress={() => setMode(item.key)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <RNText style={{ color: theme['gray-500'], fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
          {labels.colorScheme?.title ?? 'Colour'}
        </RNText>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {colorSchemes.map((scheme) => (
            <Pressable
              key={scheme.id}
              onPress={() => setColorSchemeId(scheme.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: colorSchemeId === scheme.id }}
              accessibilityLabel={labels.colorScheme?.options[scheme.id] ?? scheme.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colorSchemeId === scheme.id ? scheme.primary : theme['border-color'],
                backgroundColor: colorSchemeId === scheme.id ? theme['gray-100'] : 'transparent',
              }}
            >
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: scheme.primary }} />
              <RNText style={{ color: theme['gray-800'], fontSize: 14 }}>
                {labels.colorScheme?.options[scheme.id] ?? scheme.id}
              </RNText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: active ? theme.primary : theme['border-color'],
        backgroundColor: active ? theme['primary-light'] : 'transparent',
      }}
    >
      <RNText style={{ color: active ? theme.primary : theme['gray-800'], fontSize: 14, fontWeight: '500' }}>
        {label}
      </RNText>
    </Pressable>
  )
}
