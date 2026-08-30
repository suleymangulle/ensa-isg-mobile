import { useTranslation } from 'react-i18next'
import { Button } from '@/ui'
import { SUPPORTED_LANGUAGES, currentLanguage, type SupportedLanguage } from '@/i18n'
import { Div } from '@/ui'

const LONG_NAME_KEYS: Record<SupportedLanguage, string> = {
  tr: 'language.trLong',
  en: 'language.enLong',
}

/** TR / EN toggle. The choice is cached in localStorage by the language detector. */
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const active = currentLanguage()

  return (
    <Div
      className="btn-group btn-group-sm"
      role="group"
      aria-label={t('language.label')}
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const isActive = language === active
        return (
          <Button
            key={language}
            variant={isActive ? 'primary' : 'light'}
            size="sm"
            className="fw-semibold"
            aria-pressed={isActive}
            aria-label={t('language.switchTo', { language: t(LONG_NAME_KEYS[language]) })}
            onClick={() => void i18n.changeLanguage(language)}
          >
            {t(`language.${language}`)}
          </Button>
        )
      })}
    </Div>
  )
}
