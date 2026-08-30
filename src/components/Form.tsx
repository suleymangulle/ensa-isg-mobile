import { useId, type ReactNode } from 'react'
import { useWindowDimensions } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  FormField,
  Input,
  Modal as RichModal,
} from '@/ui'
import { Div, FormTag, P } from '@/ui'

/**
 * Form and dialog primitives shared by every module.
 *
 * `@/ui` owns the field chrome (`FormField`: label, required marker, validation message, help
 * text) and the dialog shell (`Modal`: backdrop, the sheet, header and footer slots). What stays
 * here is the part neither has an opinion about: the Turkish and English copy, and the wiring that
 * lets the confirm button in the footer submit the form in the body - it is outside that form, so
 * it names it by id, exactly as the web version did through the HTML `form` attribute.
 *
 * The exported names and their props are unchanged, so every module page keeps working.
 *
 * One thing the web version does is gone rather than ported: it reached into the rendered dialog
 * to tie the heading to it with `aria-labelledby`, because the web library never did. `Modal` here
 * marks its own heading, so there is nothing left to patch from outside - and there is no DOM to
 * reach into if there were.
 */

interface FieldProps {
  /** Already translated label. */
  label: string
  /** Input id; also binds the label. */
  htmlFor: string
  required?: boolean
  /** Validation message; renders the field in the invalid state when present. */
  error?: string
  /** Muted helper text shown under the control. */
  hint?: string
  children: ReactNode
  /** Bootstrap grid width, e.g. `col-md-6`. Defaults to full width. */
  className?: string
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: FieldProps) {
  return (
    <FormField
      id={htmlFor}
      label={label}
      required={required}
      error={error}
      helpText={hint}
      className={className ?? 'col-12'}
    >
      {children}
    </FormField>
  )
}

/** Adds the Bootstrap invalid state to a control that has a validation message. */
export function controlClass(base: string, error?: string) {
  return error ? `${base} is-invalid` : base
}

interface ModalProps {
  title: string
  /** Rendered only while open, so form state resets between openings. */
  isOpen: boolean
  onClose: () => void
  onSubmit?: () => void
  /** Disables the confirm button, e.g. while a request is in flight. */
  isBusy?: boolean
  /** Overrides the confirm button label. */
  confirmLabel?: string
  /** Rendered above the body, e.g. a failed save. */
  error?: string | null
  size?: 'sm' | 'lg' | 'xl'
  children: ReactNode
}

export function Modal({
  title,
  isOpen,
  onClose,
  onSubmit,
  isBusy,
  confirmLabel,
  error,
  size,
  children,
}: ModalProps) {
  const { t } = useTranslation()
  const formId = useId()

  return (
    <Div>
      <RichModal
        open={isOpen}
        onClose={onClose}
        title={title}
        className={size ? `modal-${size} modal-dialog-centered` : 'modal-dialog-centered'}
        footer={
          <>
            <Button variant="light" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            {onSubmit && (
              <Button variant="primary" type="submit" form={formId} loading={isBusy}>
                {confirmLabel ?? t('common.save')}
              </Button>
            )}
          </>
        }
      >
        <FormTag
          id={formId}
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit?.()
          }}
        >
          {error && <Alert variant="danger">{error}</Alert>}
          {children}
        </FormTag>
      </RichModal>
    </Div>
  )
}

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
  isBusy?: boolean
  error?: string | null
}

/** Confirmation before a destructive action. Deletes are never silent. */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  onCancel,
  onConfirm,
  isBusy,
  error,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal
      title={title}
      isOpen={isOpen}
      onClose={onCancel}
      onSubmit={onConfirm}
      isBusy={isBusy}
      confirmLabel={t('common.delete')}
      error={error}
      size="sm"
    >
      <P className="mb-0">{message}</P>
    </Modal>
  )
}

/** Toolbar above a table: free-text search plus optional extra controls. */
export function SearchBar({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  children?: ReactNode
}) {
  const { t } = useTranslation()
  // Two search bars on one screen - a list and a picker inside its dialog - must not share an id.
  const inputId = useId()

  // The web bar is a wrapping row: the field takes up to 320px and the filters beside it wrap onto
  // the next line when they no longer fit. React Native wraps only what it cannot shrink, and a
  // form control shrinks - so on a narrow screen the field kept its 320px and every filter beside
  // it was squeezed to a sliver. Below the `sm` breakpoint the bar stacks instead, which is what
  // the wrap was producing in a narrow browser anyway.
  const { width } = useWindowDimensions()
  const isNarrow = width < 576

  return (
    <Div
      className="mb-3"
      style={
        isNarrow
          ? { gap: 8 }
          : { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }
      }
    >
      <Div style={isNarrow ? undefined : { flexGrow: 1, maxWidth: 320 }}>
        <Input
          id={inputId}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          inputProps={{ 'aria-label': t('common.search') }}
        />
      </Div>
      {children}
    </Div>
  )
}
