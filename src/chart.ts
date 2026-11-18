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
  const width = (canvas.parentElement?.clientWidth ?? 0) - 34;
  const height = 200;
  if (width <= 0) return;

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
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

  ctx.strokeStyle = '#f0e4e6';
  ctx.lineWidth = 0.5;
  ctx.fillStyle = '#9a8085';
  ctx.font = '10px system-ui';
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
    ctx.strokeStyle = '#e8637a';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e8637a';
    ctx.textAlign = 'left';
    ctx.fillText(formatNumber(coverLine, 2), pad.left + 4, y - 3);
  }

  const today = localISO(new Date());
  const highStart = result?.highTempStartDate;
  const high = ({ date }: BBTReading) => Boolean(highStart && date >= highStart && date <= today);
  ctx.lineWidth = 2;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]!;
    const point = points[index]!;
    ctx.strokeStyle = high(previous) && high(point) ? '#e74c3c' : '#3d5afe';
    ctx.beginPath();
    ctx.moveTo(xOf(index - 1), yOf(previous.temp));
    ctx.lineTo(xOf(index), yOf(point.temp));
    ctx.stroke();
  }

  const labelStep = Math.max(1, Math.floor(points.length / 6));
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  points.forEach((point, index) => {
    const x = xOf(index);
    const ovulation = point.date === result?.ovulationDate;
    ctx.beginPath();
    ctx.arc(x, yOf(point.temp), ovulation ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = ovulation ? '#7c5cbf' : high(point) ? '#e74c3c' : '#3d5afe';
    ctx.fill();

    if (index % labelStep === 0 || index === points.length - 1) {
      const date = new Date(`${point.date}T00:00:00`);
      ctx.fillStyle = '#9a8085';
      ctx.fillText(localizedDate(date, { month: 'numeric', day: 'numeric' }), x, height - pad.bottom + 14);
    }
  });
}
