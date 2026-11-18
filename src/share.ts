import { language, localizedDate, t } from './i18n'
import type { AudienceMode } from './audience'
import type { CycleDayMap, DayInfo, DayStatus } from './cycle'

interface SharedDay {
  iso: string
  info: DayInfo
}

interface SharedRow {
  emoji: string
  label: string
  value: string
  color: DayStatus
}

interface ShareResult {
  startDate: string
  days: SharedDay[]
  rows: SharedRow[]
  range: string
  mode: string
  note: string
  recorded: string
  text: string
  title: string
  summary: string
  filename: string
}

const shareColors = {
  period: ['#f5d2df', '#88435d'],
  fertile: ['#fae5c5', '#885912'],
  ovulation: ['#f5c4bf', '#9d302e'],
  safe: ['#dfede4', '#32664a'],
} satisfies Record<DayStatus, [string, string]>

function shareDate(iso: string, full = false) {
  return localizedDate(new Date(iso + 'T00:00:00'), {
    year: full ? 'numeric' : undefined,
    month: 'numeric',
    day: 'numeric',
  })
}

function shareRanges(days: SharedDay[]) {
  const ranges: Array<{ first: SharedDay; last: SharedDay }> = []
  for (const day of days) {
    const range = ranges.at(-1)
    if (range && day.info.dayNum === range.last.info.dayNum + 1)
      range.last = day
    else ranges.push({ first: day, last: day })
  }
  return (
    ranges
      .map(({ first, last }) =>
        first === last
          ? shareDate(first.iso)
          : shareDate(first.iso) + ' – ' + shareDate(last.iso),
      )
      .join(' / ') || '—'
  )
}

export function buildShareResult(
  dayMap: CycleDayMap,
  audience: AudienceMode,
  regular: boolean,
): ShareResult | null {
  const days = Object.entries(dayMap)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([iso, info]) => ({ iso, info }))
  const firstDay = days[0]
  const lastDay = days.at(-1)
  if (!firstDay || !lastDay) return null

  const lowLabel = t(
    audience === 'contraception' ? 'phase.low' : 'phase.outside',
  )
  const rows: SharedRow[] = [
    {
      emoji: '🌸',
      label: t('phase.period'),
      value: shareRanges(days.filter(({ info }) => info.status === 'period')),
      color: 'period',
    },
    {
      emoji: '🟠',
      label: t('phase.fertile'),
      value: shareRanges(days.filter(({ info }) => info.isFertileWindow)),
      color: 'fertile',
    },
    {
      emoji: '🔴',
      label: t('phase.ovulation'),
      value: regular
        ? shareRanges(days.filter(({ info }) => info.isOvDay))
        : t('setup.irregular'),
      color: 'ovulation',
    },
    {
      emoji: '🟢',
      label: lowLabel,
      value: shareRanges(days.filter(({ info }) => info.status === 'safe')),
      color: 'safe',
    },
  ]
  const startDate = firstDay.iso
  const range =
    shareDate(startDate, true) + ' – ' + shareDate(lastDay.iso, true)
  const mode = t('mode.' + audience)
  const note = t(audience + '.note')
  const recorded = firstDay.info.isRecordedStart
    ? t('phase.recorded') + ': ' + shareDate(startDate, true)
    : ''
  const title = t('share.cycle')
  const text = [
    '📅 ' + title,
    range,
    '💬 ' + mode,
    ...(recorded ? ['✍️ ' + recorded] : []),
    '',
    ...rows.map((row) => row.emoji + ' ' + row.label + ': ' + row.value),
    '',
    'ℹ️ ' + note,
  ].join('\n')
  return {
    startDate,
    days,
    rows,
    range,
    mode,
    note,
    recorded,
    text,
    title,
    summary: t('summary'),
    filename: 'cycle-' + startDate + '.png',
  }
}

export function drawShareImage(result: ShareResult): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1620
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  const font =
    '"Huninn", "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif'
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
  ) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    ctx.fill()
  }
  const text = (
    value: string,
    x: number,
    y: number,
    size = 28,
    color = '#51464b',
    weight = 400,
    maxWidth?: number,
  ) => {
    ctx.font = weight + ' ' + size + 'px ' + font
    ctx.fillStyle = color
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    if (maxWidth) ctx.fillText(value, x, y, maxWidth)
    else ctx.fillText(value, x, y)
  }
  // Grapheme wrapping handles CJK, Thai marks and Latin without clipping.
  const wrap = (value: string, width: number, size: number, weight = 400) => {
    ctx.font = weight + ' ' + size + 'px ' + font
    const segments =
      typeof Intl.Segmenter === 'function'
        ? [
            ...new Intl.Segmenter(language.value, {
              granularity: 'grapheme',
            }).segment(value),
          ].map((s) => s.segment)
        : Array.from(value)
    const lines = []
    let line = ''
    for (const char of segments) {
      if (line && ctx.measureText(line + char).width > width) {
        lines.push(line)
        line = char
      } else line += char
    }
    if (line) lines.push(line)
    return lines
  }
  box(0, 0, 1080, 1620, 0, '#faf7f5')
  // The complete calendar occupies the upper 1080 × 1080 square.
  box(30, 30, 1020, 1020, 30, '#ffffff')
  text(result.title, 64, 60, 38, '#513f48', 600, 950)
  text(result.range, 64, 116, 28, '#76616c', 400, 950)
  const offset = new Date(result.startDate + 'T00:00:00').getDay()
  const rows = Math.ceil((offset + result.days.length) / 7),
    gap = 8,
    cellW = 128,
    cellH = Math.min(119, Math.floor(744 / rows) - gap)
  for (let col = 0; col < 7; col++) {
    const weekday = localizedDate(new Date(2026, 0, 4 + col), {
      weekday: 'short',
    })
    text(weekday, 64 + col * 136, 181, 23, '#76616c', 400, 120)
  }
  result.days.forEach((day, i) => {
    const slot = offset + i,
      x = 64 + (slot % 7) * 136,
      y = 225 + Math.floor(slot / 7) * (cellH + gap)
    const info = day.info,
      [bg, fg] = shareColors[info.status]
    box(x, y, cellW, cellH, 15, bg)
    // Every date includes its month so month/year boundaries are unambiguous.
    text(shareDate(day.iso), x + 12, y + cellH * 0.32, 27, fg, 500, 104)
    if (info.isRecordedStart) {
      ctx.strokeStyle = fg
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(x + 2, y + 2, cellW - 4, cellH - 4, 13)
      ctx.stroke()
    }
    if (info.status === 'period' && info.isFertileWindow)
      box(x + 12, y + cellH - 12, cellW - 24, 4, 2, shareColors.fertile[1])
  })
  result.rows.forEach((row, i) => {
    const x = 64 + (i % 2) * 480,
      y = 971 + Math.floor(i / 2) * 34
    box(x, y + 3, 16, 16, 5, shareColors[row.color][0])
    text(row.label, x + 26, y, 22, '#66535d', 400, 437)
  })
  text(result.summary, 64, 1090, 32, '#513f48', 600, 950)
  text(result.mode, 64, 1132, 23, '#76616c', 400, 950)
  // Four compact cards retain the full dates while fitting the 2:3 export.
  result.rows.forEach((row, i) => {
    const x = 64 + (i % 2) * 484,
      y = 1170 + Math.floor(i / 2) * 151,
      w = 468,
      h = 137
    const [bg, fg] = shareColors[row.color]
    box(x, y, w, h, 20, bg)
    box(x + 19, y + 23, 9, 9, 4, fg)
    const labels = wrap(row.label, w - 65, 22)
    let size = 30,
      values
    do {
      values = wrap(row.value, w - 40, size, 600)
      if (labels.length * 27 + values.length * size * 1.25 + 38 <= h) break
      size--
    } while (size > 17)
    let lineY = y + 18
    for (const line of labels) {
      text(line, x + 38, lineY, 22, fg)
      lineY += 27
    }
    lineY += 8
    for (const line of values) {
      text(line, x + 20, lineY, size, fg, 600)
      lineY += size * 1.25
    }
  })
  const footer = [...(result.recorded ? [result.recorded] : []), result.note]
  let size = 23,
    wrapped
  do {
    wrapped = footer.map((line) => wrap(line, 950, size))
    if (
      wrapped.reduce((n, lines) => n + lines.length, 0) * size * 1.5 +
        footer.length * 7 <=
      112
    )
      break
    size--
  } while (size > 16)
  let y = 1482
  for (const paragraph of wrapped) {
    for (const line of paragraph) {
      text(line, 64, y, size, '#76616c')
      y += size * 1.5
    }
    y += 7
  }
  return canvas
}
