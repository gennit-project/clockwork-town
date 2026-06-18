/**
 * ECharts theme approximating Grafana's dark dashboards.
 * Registered as "grafana" in ./echarts.ts and selected via <v-chart theme="grafana">.
 */

// Grafana "classic" series palette.
export const GRAFANA_SERIES_PALETTE = [
  '#73bf69',
  '#fade2a',
  '#5794f2',
  '#ff9830',
  '#f2495c',
  '#b877d9',
  '#37872d',
  '#e0b400',
  '#1f60c4',
  '#c4162a',
  '#8ab8ff',
  '#ffee52'
]

const TEXT = '#d8d9da'
const TEXT_WEAK = '#9fa7b3'
const BORDER = '#2c3235'
const SURFACE = '#1f2329'

export const grafanaTheme = {
  color: GRAFANA_SERIES_PALETTE,
  backgroundColor: 'transparent',
  textStyle: {
    color: TEXT,
    fontFamily: 'Inter, Roboto, -apple-system, sans-serif'
  },
  title: {
    textStyle: { color: TEXT },
    subtextStyle: { color: TEXT_WEAK }
  },
  line: {
    smooth: false,
    symbol: 'none',
    lineStyle: { width: 1.5 }
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: BORDER } },
    axisTick: { show: false },
    axisLabel: { color: TEXT_WEAK, fontSize: 11 },
    splitLine: { show: false }
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: TEXT_WEAK, fontSize: 11 },
    splitLine: { lineStyle: { color: BORDER, type: 'dashed' } }
  },
  legend: {
    textStyle: { color: TEXT_WEAK }
  },
  tooltip: {
    backgroundColor: SURFACE,
    borderColor: BORDER,
    borderWidth: 1,
    textStyle: { color: TEXT, fontSize: 12 },
    axisPointer: {
      lineStyle: { color: BORDER },
      crossStyle: { color: BORDER }
    }
  }
}
