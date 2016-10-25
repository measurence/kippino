export interface SlackUser {
  id: string
  name: string
}

export interface SlackUserList {
  members: SlackUser[]
}

export interface AskResponse { 
  type: string,
  channel: string,
  user: string,
  text: string,
  ts: string,
  team: string,
  question: string 
}

type ConversationResponseCb = (response: AskResponse, convo: Conversation) => void

interface ConversationResponsePattern {
  pattern: string
  callback: ConversationResponseCb
}

export interface Conversation {
  
  say(s: string): void

  ask(s: string, cb: ConversationResponseCb | ConversationResponsePattern[]): void

  next(): void

  on(event: string, cb: (Conversation) => void)

}

export interface Message {
  ts: string
  channel: string
}
