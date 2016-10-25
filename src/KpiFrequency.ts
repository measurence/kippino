//
// KpiFrequency describe different kinds of possible update frequencies
// e.g. weekly, monthly, etc...
//

export enum KpiFrequency { KPI_MONTHLY_FREQUENCY, KPI_WEEKLY_FEQUENCY, KPI_DAILY_FREQUENCY }

export namespace KpiFrequency {

  export function fromLabel(frequency: string): KpiFrequency {
    switch(frequency) {
      case 'daily':
        return KpiFrequency.KPI_DAILY_FREQUENCY
      case 'weekly':
        return KpiFrequency.KPI_WEEKLY_FEQUENCY
      case 'monthly':
        return KpiFrequency.KPI_MONTHLY_FREQUENCY
      default:
        throw new TypeError(`Unknown KPI frequency label '${frequency}'`)  
    }
  }

  export function toLabel(frequency: KpiFrequency): string {
    switch(frequency) {
      case KpiFrequency.KPI_DAILY_FREQUENCY:
        return 'daily'
      case KpiFrequency.KPI_WEEKLY_FEQUENCY:
        return 'weekly'
      case KpiFrequency.KPI_MONTHLY_FREQUENCY:
        return 'monthly'
      default:
        return 'MISSING_LABEL'  
    }
  }

}