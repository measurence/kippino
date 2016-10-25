import { SpreadsheetWorksheet } from './GoogleSpreadsheetTypes'
import { Option, Some, None } from './Option'

/**
 * Looks up a worksheet by its Title
 */
export function getWorkSheetByTitle(title: string, worksheets: SpreadsheetWorksheet[]): Option<SpreadsheetWorksheet> {
  const maybeWs = worksheets.find((ws) => {
    return (ws.title == title)
  })
  if(maybeWs) {
    return new Some(maybeWs)
  } else {
    return new None<SpreadsheetWorksheet>()
  }
}
