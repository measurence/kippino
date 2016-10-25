/**
 * Bot for collecting KPIs from people.
 * 
 * This bot will use a Google Spreadsheet as a "data backend".
 * The first worksheet of the backing spreadsheet will define the KPIs that
 * need to be collected, along their owner, collection frequency and the
 * first period we want to collect the KPI for.
 */

// TODO
// [ ] question timeout and offline/online detection ala howdy

// maximum rows in the "data" worksheet
const DATA_ROWS_LIMIT = 10000;

// Title and headers of the worksheets
const KPIS_WORKSHEET_TITLE = 'KPIs'
const KPIS_WORKSHEET_HEADERS = [ 'name', 'question', 'owner-slack', 'frequency', 'since', 'kippino-enable' ]
const DATA_WORKSHEET_TITLE = 'Data'
const DATA_WORKSHEET_HEADERS = [ 'timestamp', 'kpi', 'value', 'for', 'source' ]

// Check whether the required environment variables have been provided 

Array.from([ 'AUTH_JSON', 'SLACK_TOKEN', 'SPREADSHEET_ID' ]).forEach((env) => {
  if (!process.env[env] || process.env[env] == '') {
    console.log(`Error: Specify ${env} in environment`);
    process.exit(1);
  }
})

// Enable source maps in node (for getting references to ts file in stacktrace)
const installSourceMaps = require('source-map-support').install
installSourceMaps()

// BotKit 
// https://github.com/howdyai/botkit
const BotKit = require('botkit/lib/Botkit')
import * as BotKitTypes from './BotKitTypes'

const pluralize: (s: string, n?: number, i?: boolean) => string = require('pluralize')

// const Immutable = require('immutable')

// Support for Google Spreadsheet API 
// https://www.npmjs.com/package/google-spreadsheet
const GS = require('google-spreadsheet')
import { 
  GoogleSpreadsheet, 
  GoogleSpreadsheetInfo, 
  SpreadsheetWorksheet,
  GoogleSpreadsheetWorksheetOptions 
} from './GoogleSpreadsheetTypes'

import * as os from 'os'

// Reactive JS
// http://reactivex.io/rxjs/
import * as Rx from '@reactivex/rxjs'

// JS port of Joda
// https://github.com/js-joda/js-joda
import { LocalDate, LocalDateTime } from 'js-joda'

import { Option, Some, None } from './Option'

import * as SpreadsheetHelpers from './SpreadsheetHelpers'

// Models
import { KPI } from './KPI'
import { KpiFrequency } from './KpiFrequency'
import { KpiPeriod } from './KpiPeriod'
import { KpiWorksheetRow, DataWorksheetRow } from './worksheets'

// Commands we can trigger on our bot
enum BotCommand { 
  RELOAD_KPIS,  // reload the KPIs from the spreadsheet 
  RELOAD_USERS  // reload the list of users from Slack
}

var kpisWorksheetOpt: Option<SpreadsheetWorksheet> = new None<SpreadsheetWorksheet>()
var dataWorksheetOpt: Option<SpreadsheetWorksheet> = new None<SpreadsheetWorksheet>()
var definedKpisOpt: Option<KPI[]> = new None<KPI[]>()

// An observable stream of bot commands, we start by reloading KPIs and the
// list of users
const botCommandsSub_: Rx.Subject<BotCommand> = new Rx.ReplaySubject<BotCommand>(2)

// After the first update, we want to keep refreshing the KPIs and the users
// every once in a while
const ONE_HOUR_MILLIS = 60 * 60 * 1000
const periodicUpdater_ = Rx.Observable.interval(ONE_HOUR_MILLIS)
periodicUpdater_.subscribe(() => {
  console.log("Triggering periodic update of KPIs and Users")
  botCommandsSub_.next(BotCommand.RELOAD_KPIS)
  botCommandsSub_.next(BotCommand.RELOAD_USERS)  
})

// Load the Service Account credentials (see README on how to get these) and
// create a reference to the backing Google Spreadsheet from its ID
const googleCredentials = require(process.env.AUTH_JSON)
const backingSpreadsheet: GoogleSpreadsheet = new GS(process.env.SPREADSHEET_ID)

const spreadsheetInfoSub_ = new Rx.Subject<GoogleSpreadsheetInfo>()
const kpisWorksheetSub_ = new Rx.Subject<SpreadsheetWorksheet>()
const loadedKpisWorksheetSub_ = new Rx.Subject<SpreadsheetWorksheet>()
const dataWorksheetSub_ = new Rx.Subject<SpreadsheetWorksheet>()
const kpiWorksheetRowsSub_ = new Rx.Subject<KpiWorksheetRow[]>()

spreadsheetInfoSub_.subscribe((spreadsheetInfo) => {
  console.log(`Loaded doc: ${spreadsheetInfo.title} by ${spreadsheetInfo.author.email}`)
})

// Check whether the KPIs worksheet exists, create it if it doesn't
spreadsheetInfoSub_.subscribe((spreadsheetInfo) => {
  const kpisWorksheetOpt = SpreadsheetHelpers.getWorkSheetByTitle(KPIS_WORKSHEET_TITLE, spreadsheetInfo.worksheets)
  if(kpisWorksheetOpt.isDefined()) {
    console.log("KPIs worksheet found")
    kpisWorksheetSub_.next(kpisWorksheetOpt.get())
  } else {
    console.log("KPIs worksheet not found, creating KPIs worksheet")
    backingSpreadsheet.addWorksheet({
      title: KPIS_WORKSHEET_TITLE,
      headers: KPIS_WORKSHEET_HEADERS
    }, (err, kpisWorksheet) => {
      kpisWorksheetSub_.next(kpisWorksheet)
    })
  }
})

kpisWorksheetSub_.subscribe((kpisWorksheet) => {
  console.log("Got KPIs worksheet")
  kpisWorksheetOpt = new Some(kpisWorksheet)
})

// Check whether the Data worksheet exists, create it if it doesn't
spreadsheetInfoSub_.subscribe((spreadsheetInfo) => {
  const dataWorksheetOpt = SpreadsheetHelpers.getWorkSheetByTitle(DATA_WORKSHEET_TITLE, spreadsheetInfo.worksheets)
  if(dataWorksheetOpt.isDefined()) {
    console.log("Data worksheet found")
    dataWorksheetSub_.next(dataWorksheetOpt.get())
  } else {
    console.log("Data worksheet not found, creating Data worksheet")
    backingSpreadsheet.addWorksheet({
      title: DATA_WORKSHEET_TITLE,
      headers: DATA_WORKSHEET_HEADERS
    }, (err, kpisWorksheet) => {
      dataWorksheetSub_.next(kpisWorksheet)
    })
  }
})

dataWorksheetSub_.subscribe((dataWorksheet) => {
  console.log("Got Data worksheet")
  dataWorksheetOpt = new Some(dataWorksheet)
  botCommandsSub_.next(BotCommand.RELOAD_KPIS)
})


const reloadKpisCommandSub_: Rx.Observable<BotCommand> = botCommandsSub_.filter((op: BotCommand) => { 
  return(op === BotCommand.RELOAD_KPIS) 
})

reloadKpisCommandSub_.subscribe((_) => {
  if(kpisWorksheetOpt.isDefined()) {
    console.log("Triggering reload of KPIs")
    loadedKpisWorksheetSub_.next(kpisWorksheetOpt.get())
  } else {
    console.log("Ignoring command to reload KPIs since the KPI worksheet is not ready yet")
  }
})

// Execute the reload KPIs command
// Limit execution frequency to once every 10 seconds
loadedKpisWorksheetSub_.debounceTime(10 * 1000).subscribe((kpiWorksheet: SpreadsheetWorksheet) => {
  console.log("Loading KPI rows")
  kpiWorksheet.getRows({ 
    offset: 1 // skip worksheet header
  }, (err, rows: KpiWorksheetRow[]) => {
    kpiWorksheetRowsSub_.next(rows)
  });
})

function parseBoolean(v: string): boolean {
  const vLow = v.toLowerCase()
  return (vLow === 'yes' || vLow === 'true') ? true : false
}

const kpisSub_ = kpiWorksheetRowsSub_.map((rows: KpiWorksheetRow[]) => {

  const kpis = rows.map((row) => {
    return new KPI(
      row.name,
      row.question,
      row['owner-slack'],
      KpiFrequency.fromLabel(row.frequency),
      LocalDate.parse(row.since),
      parseBoolean(row['kippino-enable'])
    )
  })

  return kpis;
})

kpisSub_.subscribe((kpis) => {
  console.log(`KPIs loaded [${kpis.length}]`)
  definedKpisOpt = new Some(kpis)
})

// observe availability of both the KPIs and the Data worksheet
const kpisWithDataWorksheetSub_ = Rx.Observable.combineLatest(
  kpisSub_, dataWorksheetSub_,
  (kpis, dataWorksheet) => {
    return {
      kpis: kpis,
      dataWorksheet: dataWorksheet
    }
  }
)

function isValidDataRow(row: DataWorksheetRow): boolean {
  return !(
    row.for == undefined || 
    row.kpi == undefined || 
    row.source == undefined && 
    row.timestamp == undefined
  )
}

//
// Takes an array of Data rows and returns a mapping of KPI to the last
// moment that the KPI has been updated
//
function calcKpiLastEvaluatedAt(rows: Array<DataWorksheetRow>): Map<string, LocalDate> {
  const emptyMap: Map<string, LocalDate> = new Map()
  const kpiLastEvaluatedAt = rows.filter(isValidDataRow).reduce((acc, row) => {
    const kpiName = row.kpi
    if(acc && acc.has(kpiName)) {
      return acc
    } else {
      try {
        const evaluatedAt = LocalDate.parse(row.for)
        return acc.set(kpiName, evaluatedAt)
      } catch(e) {
        console.warn(`Failed to parse last evaluated date [${row.for}] for KPI [${kpiName}]`)
        return acc
      }      
    }
  }, emptyMap)
  return kpiLastEvaluatedAt
}

// maps the KPIs and the Data worksheet to the last fetched moment for each KPI
const kpisWithLastEvaluationSub_ = kpisWithDataWorksheetSub_.flatMap((o) => {
  console.log("Loading data rows")
  const getDataRows_ = Rx.Observable.bindNodeCallback(o.dataWorksheet.getRows)
  const dataRows_: Rx.Observable<DataWorksheetRow[]> = getDataRows_({
    offset: 1,
    limit: DATA_ROWS_LIMIT,
    orderby: 'for',
    reverse: true
  })
  return dataRows_.map((dataRows) => {
    const kpiLastEvaluatedAt = calcKpiLastEvaluatedAt(dataRows)
    return {
      kpis: o.kpis,
      kpiLastEvaluatedAt: kpiLastEvaluatedAt
    }
  })
})

// decide if/which KPI needs update
function getKpisThatNeedsUpdate(now: LocalDateTime, kpis: KPI[], kpiLastEvaluatedAt: Map<string, LocalDate>): Map<KPI, KpiPeriod> {
  const emptyMap: Map<KPI, KpiPeriod> = new Map()
  return kpis.filter((kpi) => {
    // only deal with enabled KPIs
    return kpi.isEnabled
  }).reduce((acc, kpi) => {
    const lastEvaluatedAt: LocalDate | undefined = kpiLastEvaluatedAt.get(kpi.name)
    if(lastEvaluatedAt) {
      const lastEvaluatedPeriod = kpi.getKpiPeriodFromDate(lastEvaluatedAt)
      const nextEvaluationPeriod = lastEvaluatedPeriod.nextPeriod()
      if(nextEvaluationPeriod.endOfPeriod().isBefore(now)) {
        return acc.set(kpi, nextEvaluationPeriod)
      } else {
        return acc
      }
    } else {
      const firstEvaluationAt = kpi.getFirstKpiPeriod()
      return acc.set(kpi, firstEvaluationAt)
    }
  }, emptyMap)
}

//
// Initialize the bot
//

const controller = BotKit.slackbot({
    // debug: true,
    stats_optout: true
});

controller.on('rtm_open', (bot) => {
  console.log("Bot is up, triggering reload of users")
  botCommandsSub_.next(BotCommand.RELOAD_USERS)
})

const bot = controller.spawn({
    token: process.env.SLACK_TOKEN
}).startRTM();

const getSlackUserList = bot.api.users.list
const getSlackUserList_: (o: any) => Rx.Observable<BotKitTypes.SlackUserList> = Rx.Observable.bindNodeCallback(getSlackUserList)

const slackUserListSub_ = botCommandsSub_.filter((op) => op === BotCommand.RELOAD_USERS).flatMap((_) => {
  return getSlackUserList_({})
}).debounceTime(10 * 1000) // reload users at most once every 10 secs

const slackUsernameToSlackIdMapSub_ = slackUserListSub_.map((userList) => {
  const emptyMap: Map<string, BotKitTypes.SlackUser> = new Map()
  return userList.members.reduce((acc, m) => {
    return acc.set(m.name, {
      id: m.id,
      name: m.name
    })
  }, emptyMap)
})

const kpisWithLastEvaluationAndUsersSub_ = Rx.Observable.combineLatest(
  kpisWithLastEvaluationSub_,
  slackUsernameToSlackIdMapSub_,
  (kpisWithLastEvaluation, usernameToIdMap) => {
    return {
      kpis: kpisWithLastEvaluation.kpis,
      kpiLastEvaluatedAt: kpisWithLastEvaluation.kpiLastEvaluatedAt,
      usernameToIdMap: usernameToIdMap
    }
  }
)

const updatableKpisSub_ = kpisWithLastEvaluationAndUsersSub_.map((o) => {
  const now = LocalDateTime.now()
  const updatableKpis = getKpisThatNeedsUpdate(now, o.kpis, o.kpiLastEvaluatedAt)
  
  const updatableKpisByOwner: Map<BotKitTypes.SlackUser, Map<KPI, KpiPeriod>> = new Map() 
  updatableKpis.forEach((period, kpi) => {
    const slackUser = o.usernameToIdMap.get(kpi.ownerSlack)
    if(slackUser) { 
      if(!updatableKpisByOwner.has(slackUser)) {
        updatableKpisByOwner.set(slackUser, new Map())  
      }
      const kpis = updatableKpisByOwner.get(slackUser)
      if(kpis) {
        kpis.set(kpi, period)
      }
    }
  })
  
  return {
    updatableKpisByOwner: updatableKpisByOwner
  }
})

type KpiUpdate = {
  kpi: KPI
  period: KpiPeriod
  value: string | number
  user: BotKitTypes.SlackUser
  ts: LocalDateTime
}

const kpiUpdatesSub_: Rx.Subject<KpiUpdate> = new Rx.Subject()

const kpiUpdatesWithDataWorksheetSub_ = Rx.Observable.combineLatest(
  dataWorksheetSub_, kpiUpdatesSub_, 
  (dataWorksheet, kpiUpdate) => {
    return {
      dataWorksheet: dataWorksheet,
      kpiUpdate: kpiUpdate
    }
})

kpiUpdatesWithDataWorksheetSub_.subscribe((o) => {
  const dataRow: DataWorksheetRow = {
    timestamp: o.kpiUpdate.ts.toString(),
    kpi: o.kpiUpdate.kpi.name,
    value: o.kpiUpdate.value,
    for: o.kpiUpdate.period.startOfPeriod().toString(),
    source: o.kpiUpdate.user.name
  }
  console.log("Appending data row", dataRow)
  o.dataWorksheet.addRow(dataRow, (err) => {
    console.log(err)
  })
})

const activeUserNames: Set<string> = new Set()

updatableKpisSub_.subscribe((o) => {
  o.updatableKpisByOwner.forEach((kpiToPeriodMap, user) => {

    if(activeUserNames.has(user.name)) {
      bot.botkit.log(`Skipping user ${user.name} since I'm questioning him already`)
      return  
    }

    console.log(`Starting conversation with user ${user.name} for ${kpiToPeriodMap.size} KPIs`)

    // remember that we're currently talking to this user
    activeUserNames.add(user.name)

    const startPrivateConversation = function(message: { user: string }, cb: (err: Error, convo: BotKitTypes.Conversation) => void) {
      return bot.startPrivateConversation(message, cb)
    }

    const startPrivateConversation_: ({ user: string }) => Rx.Observable<BotKitTypes.Conversation> = Rx.Observable.bindNodeCallback(startPrivateConversation) 

    const privateConversationWithUser_ = startPrivateConversation_({ user: user.id })

    const kpis = Array.from(kpiToPeriodMap.keys())

    privateConversationWithUser_.subscribe((convo) => {
      // convo.say('Hello!')

      convo.on('end', (convo) => {
        bot.botkit.log(`End of conversation with user ${user.name}`)
        activeUserNames.delete(user.name)
        // check whether we have more periods to ask
        botCommandsSub_.next(BotCommand.RELOAD_KPIS)
      })

      function buildQuestions(kpiIdx: number): void {
        const kpi = kpis[kpiIdx]
        const period = kpiToPeriodMap.get(kpi)
        if(!period) {
          console.warn(`Skipping question for KPI ${kpi.name} since period is missing`)
          if(kpiIdx < kpis.length - 1) {
            buildQuestions(kpiIdx + 1)
          }
          return
        }
        convo.ask(`:question: *${kpi.question}* on *${period.getDisplayText()}*?`, (response, convo) => {
          const responseValue = parseFloat(response.text)
          if(isNaN(responseValue)) {
            convo.say(`:exclamation: this is not a number! please give me a number for *${kpi.name}*! Don't include any currency or metric symbol or digit separator. Valid numbers are like: *124*, *1234.21*, *-5*)`)
            buildQuestions(kpiIdx)
          } else {
            const kpiUpdate: KpiUpdate = {
              kpi: kpi,
              period: period,
              value: responseValue,
              user: user,
              ts: LocalDateTime.now()
            }

            kpiUpdatesSub_.next(kpiUpdate)

            convo.say(`:white_check_mark: I got "*${response.text}*" for *${kpi.name}* on *${period.getDisplayText()}*.`)
            
            if(kpiIdx < kpis.length - 1) {
              buildQuestions(kpiIdx + 1)
            }
          }
          
          convo.next()
        })
      }

      buildQuestions(0)
      
    })

  })
})

function addRobotReaction(bot: any, message: BotKitTypes.Message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  }, (err, res) => {
    if (err) {
        bot.botkit.log('Failed to add emoji reaction :(', err);
    }
  });
}

controller.hears(['instructions', '^help'], 'direct_message,direct_mention,mention', (bot, message) => {
  bot.reply(message, "Hello! I'm Kippino, the KPI bot! My job is to collect KPIs from our team, I may be annoying some times but that's my job!")
  bot.reply(message, "I will be sleeping most of the time, but I listen to certain commands: *help*, *reload KPIs*, *reload users*, *list kpis*, *pending*.")
  bot.reply(message, "You can check out the data I'm collecting here: https://docs.google.com/spreadsheets/d/" + process.env.SPREADSHEET_ID)
  bot.reply(message, "Talk to you soon!")
})

controller.hears(['reload KPIs', 'refresh KPIs', 'sync KPIs'], 'direct_message,direct_mention,mention', (bot, message) => {
  addRobotReaction(bot, message)
  botCommandsSub_.next(BotCommand.RELOAD_KPIS)
})

controller.hears(['reload users', 'refresh users', 'sync users'], 'direct_message,direct_mention,mention', (bot, message) => {
  addRobotReaction(bot, message)
  botCommandsSub_.next(BotCommand.RELOAD_USERS)
})

controller.hears(['list kpis', 'kpis'], 'direct_message,direct_mention,mention', (bot, message) => {
  if(definedKpisOpt.isDefined()) {
    definedKpisOpt.forEach((kpis) => {
      const enabledKpis = kpis.filter((kpi) => {
        return kpi.isEnabled
      })
      bot.reply(message, `Thanks for asking, I am currently tracking *${enabledKpis.length}* KPIs:`)
      enabledKpis.forEach((kpi) => {
        bot.reply(message, `*${kpi.name}* (_${kpi.question}_) is owned by <@${kpi.ownerSlack}> and tracked ${KpiFrequency.toLabel(kpi.frequency)} since ${kpi.getFirstKpiPeriod()}`)
      })

      const disabledKpis = kpis.filter((kpi) => {
        return !kpi.isEnabled
      })
      if(disabledKpis.length > 0) {
        const disabledKpiNames = disabledKpis.map((kpi) => {
          return `*${kpi.name}*`
        })
        bot.reply(message, `Also, the following KPIs are configured but not enabled: ${disabledKpiNames.join(", ")}`)
      }
    })
  } else {
    bot.reply(message, 'No KPIs defined yet')
  }
})

controller.hears(['pending'], 'direct_message,direct_mention,mention', (bot, message) => {
  if(activeUserNames.size === 0) {
    bot.reply(message, "Everything's fine! There are no pending questions.")
  } else {
    const pendingUsers = Array.from(activeUserNames.values())
    bot.reply(message, `I'm currently waiting for responses from ${pluralize('person', pendingUsers.length, true)}: ` + pendingUsers.map((u) => `<@${u}>`).join(", "))
  }
})

// --- start ---

// Transform useServiceAccountAuth into an Observable that emits when
// the spreadsheet access has been authenticated
backingSpreadsheet.useServiceAccountAuth(googleCredentials, () => {
  backingSpreadsheet.getInfo((err, spreadsheetInfo) => {
    spreadsheetInfoSub_.next(spreadsheetInfo)
  })
})
