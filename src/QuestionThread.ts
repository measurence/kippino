import * as BotKitTypes from './BotKitTypes'
import { LocalDate, LocalDateTime } from 'js-joda'

import { KPI } from './KPI'
import { KpiPeriod } from './KpiPeriod'
import { KpiUpdate } from './KpiUpdate'

export type QuestionThreadResult = {
  pausedKpis: Map<string, LocalDateTime>
  kpiUpdates: KpiUpdate[]
}

// builds a conversation for the user for all the pending KPIs
// from kpiIdx, one after the other, skipping paused KPIs
function nextConversationStep(
  user: BotKitTypes.SlackUser, 
  kpisWithPeriod: [KPI, KpiPeriod][], 
  kpiIdx: number, 
  convo: BotKitTypes.Conversation,
  threadResult: QuestionThreadResult,
  cb: (Error, QuestionThreadResult) => void
): void {
if(kpiIdx >= kpisWithPeriod.length) {
  // stop here if there are no more KPIs
  cb(null, threadResult)
  return
}

const [kpi, period] = kpisWithPeriod[kpiIdx]

if(!period) {
  console.warn(`Skipping question for KPI ${kpi.name} since period is missing`)
  nextConversationStep(user, kpisWithPeriod, kpiIdx + 1, convo, threadResult, cb)
  return  
}

convo.ask(`:question: *${kpi.question}* on *${period.getDisplayText()}*?`, (response, convo) => {
  const lcText = response.text.toLowerCase()
  if(lcText === "skip" || lcText === "later") {
    console.log(`User ${user.name} skipped ${kpi.name}`)
    convo.say(`:zzz: ok, I'll skip *${kpi.name}* for this round of questions...`)
    // remember when the user skipped this question
    threadResult.pausedKpis.set(kpi.name, LocalDateTime.now())
    nextConversationStep(user, kpisWithPeriod, kpiIdx + 1, convo, threadResult, cb)
  } else {
    const responseValue = parseFloat(response.text)
    if(isNaN(responseValue)) {
      convo.say(`:exclamation: this is not a number! please give me a number for *${kpi.name}*! Don't include any currency or metric symbol or digit separator. Valid numbers are like: *124*, *1234.21*, *-5*) - you can also skip the question momentarily by saying \`skip\`.`)
      nextConversationStep(user, kpisWithPeriod, kpiIdx, convo, threadResult, cb)
    } else {
      const kpiUpdate: KpiUpdate = {
        kpi: kpi,
        period: period,
        value: responseValue,
        user: user,
        ts: LocalDateTime.now()
      }

      threadResult.kpiUpdates.push(kpiUpdate)

      convo.say(`:white_check_mark: I got "*${response.text}*" for *${kpi.name}* on *${period.getDisplayText()}*.`)
      
      nextConversationStep(user, kpisWithPeriod, kpiIdx + 1, convo, threadResult, cb)
    }
  }
  convo.next()
  })
}

export function buildQuestionThread(
  user: BotKitTypes.SlackUser, 
  kpisWithPeriod: [KPI, KpiPeriod][],
  convo: BotKitTypes.Conversation,
  cb: (err: Error, res: QuestionThreadResult) => void
): void {
  const threadResult: QuestionThreadResult = {
    pausedKpis: new Map<string, LocalDateTime>(),
    kpiUpdates: new Array<KpiUpdate>()
  }
  nextConversationStep(user, kpisWithPeriod, 0, convo, threadResult, cb)
}