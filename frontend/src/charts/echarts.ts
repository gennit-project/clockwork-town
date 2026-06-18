/**
 * Central ECharts registration (tree-shaken).
 * Import this module once (from main.ts) before using <v-chart>.
 */
import { use, registerTheme } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, GaugeChart, GraphChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  TitleComponent,
  GraphicComponent
} from 'echarts/components'
import { grafanaTheme } from './grafanaTheme'

use([
  CanvasRenderer,
  LineChart,
  GaugeChart,
  GraphChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  TitleComponent,
  GraphicComponent
])

registerTheme('grafana', grafanaTheme)
