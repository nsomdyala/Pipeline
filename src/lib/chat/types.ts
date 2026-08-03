export type ChannelKind = "public" | "dm" | "opportunity";

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
