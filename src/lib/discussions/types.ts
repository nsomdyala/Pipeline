export const TOPIC_CATEGORIES = [
  "Strategy",
  "Lessons learned",
  "Product",
  "Admin",
] as const;

export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];

export type DiscussionPost = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type DiscussionTopic = {
  id: string;
  title: string;
  category: TopicCategory;
  body: string;
  linkedTo: string;
  pinned: boolean;
  solved: boolean;
  authorName: string;
  posts: DiscussionPost[];
  createdAt: string;
  updatedAt: string;
};
