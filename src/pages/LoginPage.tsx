import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text as RNText, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from '@/navigation/router'
import { Alert, Button, Card, Input, useTheme } from '@/ui'
import { useAuth } from '@/auth/AuthContext'
import { errorMessage } from '@/api/http'
import LanguageSwitcher from '@/components/LanguageSwitcher'

/**
 * Sign-in.
 *
 * The same screen as the web client's, with the two things a phone adds. The fields are the
 * library's `Input` rather than the raw controls the web version uses - there is no stylesheet
 * here to make a bare `TextInput` look like the rest of the application - and the card sits inside
 * a `KeyboardAvoidingView`, because on a phone the keyboard covers the bottom half of the screen
 * and the sign-in button is in it.
 */
export default function LoginPage() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { user, signIn } = useAuth()
  const navigate = useNavigate()

  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit() {
    setError(null)
    setIsSubmitting(true)
    try {
      await signIn(userName, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err) || t('auth.invalidCredentials'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme['body-bg'] }}>
      {/* `padding` on both platforms, not just iOS. Android's own `adjustResize` is what the
          default relies on, and it does not resize an edge-to-edge activity - so the password
          field and the sign-in button sat underneath the keyboard. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
            <LanguageSwitcher />
          </View>

          <Card>
            <View style={{ alignItems: 'center', marginBottom: 28, gap: 6 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 13,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                }}
              >
                <RNText style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>
                  {t('app.initial')}
                </RNText>
              </View>

              <RNText
                style={{ color: theme['gray-900'], fontSize: 20, fontWeight: '700' }}
                accessibilityRole="header"
              >
                {t('auth.signInTitle')}
              </RNText>
              <RNText style={{ color: theme['gray-500'], fontSize: 14, textAlign: 'center' }}>
                {t('app.tagline')}
              </RNText>
            </View>

            {error ? <Alert variant="danger">{error}</Alert> : null}

            <Input
              id="userName"
              label={t('auth.userName')}
              required
              value={userName}
              onChange={setUserName}
              inputProps={{ 'aria-label': t('auth.userName') }}
            />

            <Input
              id="password"
              type="password"
              label={t('auth.password')}
              required
              value={password}
              onChange={setPassword}
              inputProps={{ 'aria-label': t('auth.password') }}
            />

            <Button
              variant="primary"
              size="lg"
              block
              loading={isSubmitting}
              disabled={isSubmitting || !userName || !password}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
