import { Year, YearMonth, TextStyle, LocalDate, LocalDateTime } from 'js-joda'

import { YearMonthEx, formatDay } from './JsJodaEx'

import { Displayable } from './Displayable'
import { Week } from './Week'

/**
 * Represents a specific period in time that a KPI refers to.
 * 
 * For instance it could be a specific day, week or month.
 */
export abstract class KpiPeriod implements Displayable {

  abstract toString(): string

  abstract getDisplayText(): string

  abstract startOfPeriod(): LocalDate

  abstract nextPeriod(): KpiPeriod

  abstract endOfPeriod(): LocalDateTime

}

export class KpiPeriodYearMonth extends KpiPeriod {
  
  private yearMonth: YearMonthEx

  constructor(yearMonth: YearMonth) {
    super()
    this.yearMonth = yearMonth as any
  }

  toString(): string {
    return this.yearMonth.toString()
  }

  getDisplayText(): string {
    return `the month of ${this.yearMonth.month()} ${this.yearMonth.year()}`
  }

  startOfPeriod(): LocalDate {
    return this.yearMonth.atDay(1)
  }

  endOfPeriod(): LocalDateTime {
    return this.yearMonth.atEndOfMonth().plusDays(1).atStartOfDay()
  }

  nextPeriod(): KpiPeriodYearMonth {
    return new KpiPeriodYearMonth(this.yearMonth.plusMonths(1))  
  }

}

export class KpiPeriodWeek extends KpiPeriod {
  
  private week: Week

  constructor(week: Week) {
    super()
    this.week = week
  }

  toString(): string {
    return this.week.toString()
  }

  getDisplayText(): string {
    return "the " + this.week.getDisplayText()
  }

  startOfPeriod(): LocalDate {
    return this.week.getMonday()
  }

  endOfPeriod(): LocalDateTime {
    return this.week.plusWeeks(1).getMonday().atStartOfDay()
  }

  nextPeriod(): KpiPeriodWeek {
    return new KpiPeriodWeek(this.week.plusWeeks(1))  
  }

}

export class KpiPeriodDay extends KpiPeriod {
  
  private day: LocalDate

  constructor(day: LocalDate) {
    super()
    this.day = day
  }

  toString(): string {
    return this.day.toString()
  }

  getDisplayText(): string {
    return `${formatDay(this.day)}`
  }

  startOfPeriod(): LocalDate {
    return this.day
  }

  endOfPeriod(): LocalDateTime {
    return this.day.plusDays(1).atStartOfDay()
  }

  nextPeriod(): KpiPeriodDay {
    return new KpiPeriodDay(this.day.plusDays(1))  
  }

}
