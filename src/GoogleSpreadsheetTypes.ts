
export interface SpreadsheetGetRowsOptions {
  offset?: number,
  limit?: number,
  orderby?: string,
  reverse?: boolean,
  query?: any
}

export interface SpreadsheetWorksheet {
  url: string
  id: string
  title: string
  rowCount: number
  colCount: number
  getRows(options: SpreadsheetGetRowsOptions, cb: (err: Error, rows: any[]) => void): void
  addRow(row: any, cb: (err: Error) => void): void
}

export interface GoogleAccountInfo {
  client_email: string
  private_key: string
}

export interface GoogleSpreadsheetInfo {
  id: string,
  title: string,
  updated: string,
  author: {
    name: string,
    email: string
  },
  worksheets: SpreadsheetWorksheet[]
}

export interface GoogleSpreadsheetWorksheetOptions {
  title: string,
  rowCount?: number,
  colCount?: number,
  headers: string[]
}

// see https://www.npmjs.com/package/google-spreadsheet#googlespreadsheet
export interface GoogleSpreadsheet {
  useServiceAccountAuth: (account_info: GoogleAccountInfo, cb: () => void) => void,
  getInfo: (cb: (err?: Error, info?: GoogleSpreadsheetInfo) => void) => void,
  addWorksheet: (options: GoogleSpreadsheetWorksheetOptions, cb: (err: Error, worksheet: SpreadsheetWorksheet) => void) => void
}
