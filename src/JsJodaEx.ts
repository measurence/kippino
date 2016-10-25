import { YearMonth, Month, LocalDate, LocalDateTime } from 'js-joda'

export interface YearMonthEx {

  atDay(dayOfMonth: number): LocalDate

  atEndOfMonth(): LocalDate
  
  plusMonths(monthsToAdd: number): YearMonth

  month(): Month

  year(): number

}

export const MonthNames: Map<Month, string> = new Map()
MonthNames.set(Month.JANUARY, "Jan")
MonthNames.set(Month.FEBRUARY, "Feb")
MonthNames.set(Month.MARCH, "Mar")
MonthNames.set(Month.APRIL, "Apr")
MonthNames.set(Month.MAY, "May")
MonthNames.set(Month.JUNE, "Jun")
MonthNames.set(Month.JULY, "Jul")
MonthNames.set(Month.AUGUST, "Aug")
MonthNames.set(Month.SEPTEMBER, "Sep")
MonthNames.set(Month.OCTOBER, "Oct")
MonthNames.set(Month.NOVEMBER, "Nov")
MonthNames.set(Month.DECEMBER, "Dec")

export function formatDay(day: LocalDate): string {
  return MonthNames.get(day.month()) + ", " + day.dayOfMonth() + " " + day.year()
}
