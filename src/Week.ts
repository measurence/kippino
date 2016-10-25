import { Year, YearMonth, LocalDate, LocalDateTime, DayOfWeek } from 'js-joda'
import { formatDay } from './JsJodaEx'
import { Displayable } from './Displayable'

/**
 * Represents a week of a year.
 * 
 * The representation is backed by a LocalDate that is always a Monday (yes week
 * assume that weeks start on Mondays).
 */
export class Week implements Displayable {
  
  
  private weekMonday: LocalDate

  constructor(monday: LocalDate) {
    if(monday.dayOfWeek() !== DayOfWeek.MONDAY) {
      throw new TypeError("Week can be created only from dates that are Mondays")
    }
    this.weekMonday = monday
  }

  toString(): string {
    return `week from ${this.weekMonday} to ${this.weekMonday.plusDays(6)}`
  }

  getDisplayText(): string {
    return `week from ${formatDay(this.weekMonday)} to ${formatDay(this.weekMonday.plusDays(6))}`
  }

  getMonday(): LocalDate {
    return this.weekMonday
  }

  plusWeeks(weeks: number): Week {
    return new Week(this.getMonday().plusWeeks(weeks))
  }

}