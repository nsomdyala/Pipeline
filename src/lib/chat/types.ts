/** Additive kinds: `idea` links an idea register thread to Live Chat. */
export type ChannelKind = "public" | "dm" | "opportunity" | "idea";

export type Channel = {
  id: string;
  name: string;
  kind: ChannelKind;
  description: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  channelId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type CreateChannelInput = {
  name: string;
  description?: string;
  kind?: ChannelKind;
};

export type CreateMessageInput = {
  channelId: string;
  body: string;
  authorName?: string;
};
