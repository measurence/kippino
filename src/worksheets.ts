// describes the rows of the KPI worksheet
export interface KpiWorksheetRow {
  name: string
  question: string
  'owner-slack': string
  frequency: string
  since: string,
  'kippino-enable': string
}

// describes the rows of the "data" worksheet
export interface DataWorksheetRow {
  timestamp: string
  kpi: string
  value: string | number
  for: string
  source: string
}
