import type { AnalyticsPoint } from '../../types/owner';

interface BarChartProps {
  data: AnalyticsPoint[];
  height?: number;
  formatValue?: (value: number) => string;
  ariaLabel?: string;
}

const WIDTH = 600;
const PADDING_X = 24;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 26;
const BAR_GAP = 8;

export default function BarChart({
  data,
  height = 180,
  formatValue = (value) => `${value}`,
  ariaLabel = 'Bar chart',
}: BarChartProps) {
  const chartWidth = WIDTH - PADDING_X * 2;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const maxValue = Math.max(...data.map((point) => point.value), 1);

  const barWidth = Math.max(
    2,
    (chartWidth - BAR_GAP * (data.length - 1)) / Math.max(data.length, 1),
  );

  const gridRows = 4;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full"
    >
      {Array.from({ length: gridRows + 1 }, (_, row) => {
        const y = PADDING_TOP + (chartHeight * row) / gridRows;
        const value = ((maxValue * (gridRows - row)) / gridRows) * 1;
        return (
          <g key={row}>
            <line
              x1={PADDING_X}
              x2={WIDTH - PADDING_X}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={PADDING_X - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#94a3b8"
            >
              {formatValue(Math.round(value))}
            </text>
          </g>
        );
      })}

      {data.map((point, index) => {
        const barHeight = (chartHeight * point.value) / (maxValue || 1);
        const x = PADDING_X + index * (barWidth + BAR_GAP);
        const y = PADDING_TOP + chartHeight - barHeight;

        return (
          <g key={index}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, point.value > 0 ? 2 : 0)}
              rx="3"
              fill={point.value > 0 ? '#6366f1' : '#e2e8f0'}
            >
              <title>{`${point.label}: ${formatValue(point.value)}`}</title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}