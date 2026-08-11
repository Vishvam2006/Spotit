import type { AnalyticsPoint } from '../../types/owner';

interface LineChartProps {
  data: AnalyticsPoint[];
  height?: number;
  formatValue?: (value: number) => string;
  ariaLabel?: string;
}

const WIDTH = 600;
const PADDING_X = 34;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 26;

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

export default function LineChart({
  data,
  height = 180,
  formatValue = (value) => `${value}`,
  ariaLabel = 'Line chart',
}: LineChartProps) {
  const chartWidth = WIDTH - PADDING_X * 2;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const values = data.map((point) => point.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);

  const xFor = (index: number): number =>
    PADDING_X + (data.length <= 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
  const yFor = (value: number): number =>
    PADDING_TOP +
    chartHeight -
    (chartHeight * (value - minValue)) / (maxValue - minValue || 1);

  const points = data.map((point, index) => ({ x: xFor(index), y: yFor(point.value) }));
  const linePath = buildPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${PADDING_TOP + chartHeight} L ${points[0].x} ${PADDING_TOP + chartHeight} Z`
      : '';

  const gridRows = 4;
  const gridValueFor = (row: number): number => minValue + ((maxValue - minValue) * row) / gridRows;

  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {Array.from({ length: gridRows + 1 }, (_, row) => {
        const y = PADDING_TOP + (chartHeight * row) / gridRows;
        const value = gridValueFor(gridRows - row);
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

      {areaPath && <path d={areaPath} fill="url(#lineArea)" />}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="3" fill="#3b82f6" />
      ))}

      {data.map((point, index) =>
        index % labelStep === 0 ? (
          <text
            key={`label-${index}`}
            x={xFor(index)}
            y={height - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#94a3b8"
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}