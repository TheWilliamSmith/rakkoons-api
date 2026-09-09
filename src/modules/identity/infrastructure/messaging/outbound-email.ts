export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface OutboundEmail extends EmailContent {
  recipient: string;
}

export interface EmailTransport {
  send(email: OutboundEmail): Promise<void>;
}
