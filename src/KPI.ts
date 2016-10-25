import { LocalDate, YearMonth } from 'js-joda'

import { Week } from './Week'
import { KpiFrequency } from './KpiFrequency'
import { KpiPeriod, KpiPeriodDay, KpiPeriodWeek, KpiPeriodYearMonth } from './KpiPeriod'

/**
 * Represents a KPI along its owner, the starting date and the frequency at
 * which we want to update the KPI.
 */
export class KPI {
  name: string
  question: string // something like "How much xxx we did"
  ownerSlack: string
  frequency: KpiFrequency
  since: LocalDate
  isEnabled: boolean

  /**
   * Returns a KpiPeriod associated to a certain date and KpiFrequency.
   * 
   * For instance with KPI_DAILY_FREQUENCY it will return KpiPeriodDay for the date. 
   */
  static getKpiPeriodFromDate(date: LocalDate, kpiFrequency: KpiFrequency): KpiPeriod {
    switch(kpiFrequency) {
      case KpiFrequency.KPI_DAILY_FREQUENCY:
        return new KpiPeriodDay(date)
      case KpiFrequency.KPI_WEEKLY_FEQUENCY:
        const week = new Week(date)
        return new KpiPeriodWeek(week)
      case KpiFrequency.KPI_MONTHLY_FREQUENCY:
        const yearMonth = YearMonth.of(date.year(), date.month())
        return new KpiPeriodYearMonth(yearMonth)
      default:
        throw new TypeError(`Don't know how to construct a KpiPeriod with KpiFrequency '${kpiFrequency}'`) 
    }
  }

  constructor(
    name: string,
    description: string,
    ownerSlack: string,
    frequency: KpiFrequency,
    since: LocalDate,
    isEnabled: boolean
  ) {
      this.name = name
      this.question = description
      this.ownerSlack = ownerSlack
      this.frequency = frequency,
      this.since = since
      this.isEnabled = isEnabled
  }

  getFirstKpiPeriod(): KpiPeriod {
    return KPI.getKpiPeriodFromDate(this.since, this.frequency)  
  }

  getKpiPeriodFromDate(localDate: LocalDate): KpiPeriod {
    return KPI.getKpiPeriodFromDate(localDate, this.frequency)
  }

}
