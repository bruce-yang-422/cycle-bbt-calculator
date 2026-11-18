import { localISO, type BBTAnalysis, type BBTReading } from './cycle';

type NumberFormatter = (value: number, digits?: number) => string;
type DateFormatter = (date: Date, options?: Intl.DateTimeFormatOptions) => string;

export function drawBBTChart(
  canvas: HTMLCanvasElement,
  data: readonly BBTReading[],
  result: BBTAnalysis | null,
  formatNumber: NumberFormatter,
  localizedDate: DateFormatter,
): void {
  const scale = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  const box = parent ? getComputedStyle(parent) : null;
  const width = Math.floor((parent?.clientWidth ?? 0) - parseFloat(box?.paddingLeft ?? '0') - parseFloat(box?.paddingRight ?? '0'));
  const height = 200;
  if (width <= 0) return;

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  const style = getComputedStyle(canvas);
  const chartFont = style.fontFamily || 'system-ui, sans-serif';
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const c = {
    grid: token('--line', '#f1e4e7'),
    label: token('--text-3', '#8a7880'),
    rose: token('--rose', '#d9668a'),
    roseText: token('--rose-strong', '#b04a6d'),
    low: token('--ovul-solid', '#a58fd6'),
    ovulation: token('--ovul-ink', '#7b5cc4'),
    dot: token('--surface', '#ffffff'),
  };
  const points = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  if (!ctx || points.length < 2) return;
  ctx.scale(scale, scale);

  const temperatures = points.map(point => point.temp);
  const min = Math.min(...temperatures) - 0.1;
  const max = Math.max(...temperatures) + 0.1;
  const pad = { left: 38, right: 12, top: 14, bottom: 26 };
  const graphWidth = width - pad.left - pad.right;
  const graphHeight = height - pad.top - pad.bottom;
  const xOf = (index: number) => pad.left + index / (points.length - 1) * graphWidth;
  const yOf = (temp: number) => pad.top + graphHeight - (temp - min) / (max - min) * graphHeight;

  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = c.label;
  ctx.font = `500 10px ${chartFont}`;
  ctx.textAlign = 'right';
  for (let step = 0; step <= 4; step++) {
    const temp = min + (max - min) * (step / 4);
    const y = yOf(temp);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(formatNumber(temp, 2), pad.left - 4, y + 3);
  }

  const coverLine = result?.coverLine;
  if (coverLine != null && coverLine >= min && coverLine <= max) {
    const y = yOf(coverLine);
    ctx.strokeStyle = c.rose;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.roseText;
    ctx.textAlign = 'left';
    ctx.fillText(formatNumber(coverLine, 2), pad.left + 4, y - 3);
  }

  const today = localISO(new Date());
  const highStart = result?.highTempStartDate;
  const high = ({ date }: BBTReading) => Boolean(highStart && date >= highStart && date <= today);
  const area = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
  area.addColorStop(0, 'rgba(217, 102, 138, .18)');
  area.addColorStop(1, 'rgba(217, 102, 138, 0)');
  ctx.beginPath();
  ctx.moveTo(xOf(0), height - pad.bottom);
  points.forEach((point, index) => ctx.lineTo(xOf(index), yOf(point.temp)));
  ctx.lineTo(xOf(points.length - 1), height - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = area;
  ctx.fill();

  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]!;
    const point = points[index]!;
    ctx.strokeStyle = high(previous) && high(point) ? c.rose : c.low;
    ctx.beginPath();
    ctx.moveTo(xOf(index - 1), yOf(previous.temp));
    ctx.lineTo(xOf(index), yOf(point.temp));
    ctx.stroke();
  }

  const labelStep = Math.max(1, Math.floor(points.length / 6));
  ctx.font = `500 10px ${chartFont}`;
  ctx.textAlign = 'center';
  points.forEach((point, index) => {
    const x = xOf(index);
    const ovulation = point.date === result?.ovulationDate;
    ctx.beginPath();
    ctx.arc(x, yOf(point.temp), ovulation ? 6 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = c.dot;
    ctx.fill();
    ctx.lineWidth = ovulation ? 3 : 2;
    ctx.strokeStyle = ovulation ? c.ovulation : high(point) ? c.rose : c.low;
    ctx.stroke();

    if (index % labelStep === 0 || index === points.length - 1) {
      const date = new Date(`${point.date}T00:00:00`);
      ctx.fillStyle = c.label;
      ctx.fillText(localizedDate(date, { month: 'numeric', day: 'numeric' }), x, height - pad.bottom + 14);
    }
  });
}
