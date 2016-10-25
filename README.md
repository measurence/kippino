# Kippino, the KPI bot

This is a Slack bot that asks people about KPIs

## Building

```
$ npm install
$ ./node_modules/typescript/bin/tsc
```

## Running

To run the bot you'll need:

* a Service Account auth JSON for the Google Spreadsheet API, follow [these instructions](https://www.npmjs.com/package/google-spreadsheet#service-account-recommended-method) to get one. 
* the spreadsheet ID: it's the alphanumeric string after `https://docs.google.com/spreadsheets/d/` in the URL of your Google Spreadsheet
* a token for your Slack bot: [follow these instructions](https://github.com/howdyai/botkit/blob/master/readme-slack.md#getting-started) to get one for your bot 

Then you can run the bot by passing the above with env vars:

```
$ AUTH_JSON=./xxx.json SLACK_TOKEN=XYZ SPREADSHEET_ID=ABC node build/index.js
```

## Worksheets

At start, the bot will create the `KPIs` and `Data` worksheets if they don't exist yet.

The `KPIs` worksheet is where you put the KPIs you want to track. Each KPI must have the following attributes:

* `name`: an alphanumeric unique identifier for the KPI
* `question`: this is the text that gets used to create the question together with the period (for instance if the `question` field is `How many customer signed up` and the period is `May 1st, 2016`, then the bot will ask `How many customer signed up on May 1st, 2016?`)
* `owner-slack`: the Slack username of the user that will be asked about this KPI (this may be different from the name that you see in the chat, you can look up the username on the Slack profile of the user)
* `frequency`: how often to collect the value of this KPI (`daily`, `weekly`, `monthly`)
* `since`: the date (`YYYY-MM-DD`) since you want to track this KPI - in case of weekly KPIs it must be the Monday of that week, in case of monthly KPIs it must be the 1st day of that month. 
* `kippino-enable`: set this to `true` or `yes` if you want to enable this KPI.

The `Data` worksheet is where Kippino puts the values collected from your team. Each data point has the following attributes:

* `timestamp`: ISO formatted timestamp for when the value was captured
* `kpi`: the KPI name
* `value`: the KPI value
* `for`: the date associated to the period that this value refers to (same convention used by the `since` attribute)
* `source`: the user that provided this value

## Commands

The bot accepts the following commands:

* `help` provides a brief description of the bot and the list of commands
* `sync KPIs` reloads the list of KPIs (this is also done every hour)
* `sync users` reloads the list of Slack users (this is also done every hour)
* `list KPIs` lists the configured KPIs
* `pending` lists the users that have pending questions (i.e. the bot asked them for a KPI but they didn't respond yet)

## Gotchas

### Dealing with user timezone and online status

Currently the bot is quite stupid and it will start asking questions as soon as a new day starts in the bot timezone.

It will also keep waiting for an answer "forever", it doesn't keep "nudging" people until they respond. 

### Spreadsheet locale and number formatting

Make sure that your spreadsheet is configured in the US locale since the bot uses
Javascript's `parseFloat` to parse numbers in the US format (using `.` as decimal
separator).

### Date formatting

Dates in the spreadsheet must be formatted as `YYYY-MM-DD`.

For weekly KPIs, the `since` field must be set to the Monday of the week you want to start collecting the KPI.
