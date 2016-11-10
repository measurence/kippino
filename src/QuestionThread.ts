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

  // ask the value for the KPI to the owner
  convo.ask(`:question: *${kpi.question}* on *${period.getDisplayText()}*?`, (response, convo) => {
    const lcText = response.text.toLowerCase()
    
    if(lcText === "help" || lcText === "help me") {
      // if the owner need help, provide help and go back to ask about the same KPI
      
      convo.say(`When providing the value for a KPI, don't include any currency or metric symbol or digit separator.`)
      convo.say(`Valid valid are like: *124*, *1234.21*, *-5*)`)
      convo.say(`If you don't have the answer yet, you also skip the KPI for 24 hours by replying \`skip\`.`)
      
      nextConversationStep(user, kpisWithPeriod, kpiIdx, convo, threadResult, cb)
    } else if(lcText === "skip" || lcText === "later") {
      // if the owner wants to skip the KPI, pause the KPI and move to the next one

      console.log(`User ${user.name} skipped ${kpi.name}`)
      
      convo.say(`:zzz: ok, I'll skip *${kpi.name}* for this round of questions...`)
      
      // remember when the user skipped this question
      threadResult.pausedKpis.set(kpi.name, LocalDateTime.now())
      
      nextConversationStep(user, kpisWithPeriod, kpiIdx + 1, convo, threadResult, cb)
    } else {
      // or else, try to parse the provided value

      const responseValue = parseFloat(response.text)
      
      if(isNaN(responseValue)) {
        // if it's an invalid number, provide feedback and ask again
        convo.say(`:exclamation: this is not a number! please give me a number for *${kpi.name}*! If you need help, just say \`help\``)
        nextConversationStep(user, kpisWithPeriod, kpiIdx, convo, threadResult, cb)
      } else {
        // if the value is valid, append it to the result and move to the next KPI

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

    // move to the next step in the conversation
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