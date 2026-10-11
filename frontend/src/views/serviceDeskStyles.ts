import type { ServiceDeskSeverity } from '../stores/types'

export function severityClass(severity: ServiceDeskSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-gf-red/20 text-gf-red'
    case 'warning':
      return 'bg-gf-amber/20 text-gf-amber'
    default:
      return 'bg-gf-blue/20 text-gf-blue'
  }
}
