import { t } from './i18n'

// Contraception leads: it is the most common reason people open the app.
export const audienceModes = ['contraception', 'tracking', 'conception'] as const
export type AudienceMode = (typeof audienceModes)[number]

export function isAudienceMode(value: unknown): value is AudienceMode {
  return audienceModes.some(mode => mode === value)
}

export function purposeCopy(audience: AudienceMode) {
  return {
    hint: t(`${audience}.hint`),
    note: t(`${audience}.note`),
    empty: t('noData'),
    low: t(audience === 'contraception' ? 'phase.low' : 'phase.outside'),
  }
}

interface AudienceDay {
  status: string
  isRecordedStart: boolean
  isOvDay: boolean
  isFertileWindow: boolean
}

export function audienceAdvice(audience: AudienceMode, info: AudienceDay): string {
  if (audience === 'tracking') {
    if (info.isRecordedStart) return t('tracking.recorded')
    if (info.status === 'period') return t('tracking.period')
    return t(info.isOvDay ? 'tracking.ovulation' : 'tracking.other')
  }

  if (audience === 'conception') {
    if (info.isFertileWindow) return t('conception.fertile')
    return t(info.status === 'period' ? 'conception.period' : 'conception.other')
  }

  return t(info.isFertileWindow ? 'contraception.high' : 'contraception.low')
}
