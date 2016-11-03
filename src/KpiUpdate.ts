import * as BotKitTypes from './BotKitTypes'
import { LocalDateTime } from 'js-joda'

import { KPI } from './KPI'
import { KpiPeriod } from './KpiPeriod'

export type KpiUpdate = {
  kpi: KPI
  period: KpiPeriod
  value: string | number
  user: BotKitTypes.SlackUser
  ts: LocalDateTime
}
