import type { Idea, RdItem } from "@/lib/ideas/types";

/** Stable demo ids so deep links stay consistent across JSON + Postgres seeds. */
export const DEMO_IDEA_REVIEW_ID = "b1000000-0000-4000-8000-000000000001";
export const DEMO_IDEA_APPROVED_ID = "b1000000-0000-4000-8000-000000000002";
export const DEMO_IDEA_SUBMITTED_ID = "b1000000-0000-4000-8000-000000000003";
export const DEMO_RD_ITEM_ID = "b1000000-0000-4000-8000-000000000010";
export const DEMO_IDEA_CHANNEL_REVIEW = "b1000000-0000-4000-8000-000000000020";
export const DEMO_IDEA_CHANNEL_APPROVED = "b1000000-0000-4000-8000-000000000021";

export const DEMO_ADMIN_USER_ID = "user-admin";
export const DEMO_ADMIN_NAME = "Ndumiso Somdyala";
export const DEMO_MEMBER_USER_ID = "user-member-1";
export const DEMO_MEMBER_NAME = "Bid Team Member";

export type IdeasSeedBundle = {
  ideas: Idea[];
  rdItems: RdItem[];
};

export function seedIdeasBundle(now = new Date()): IdeasSeedBundle {
  const on = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };
  const until = (daysAhead: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString();
  };

  const underReview: Idea = {
    id: DEMO_IDEA_REVIEW_ID,
    title: "Client portal tender status feed",
    description:
      "A lightweight client-facing view of awarded account delivery status so buyers can see progress without email chasing.",
    problem:
      "Account managers spend hours answering status emails; clients lack a single trusted view.",
    potentialValue:
      "Stronger retention on retainer accounts and fewer status interruptions for the bid/delivery team.",
    potentialValueZar: 180000,
    category: "Website",
    status: "under_review",
    submitterUserId: DEMO_MEMBER_USER_ID,
    submitterName: DEMO_MEMBER_NAME,
    reviewerUserId: DEMO_ADMIN_USER_ID,
    reviewerName: DEMO_ADMIN_NAME,
    channelId: DEMO_IDEA_CHANNEL_REVIEW,
    decisionReason: "",
    decidedAt: null,
    decidedByUserId: null,
    decidedByName: "",
    attachments: [],
    reviews: [
      {
        id: "b1000000-0000-4000-8000-000000000030",
        ideaId: DEMO_IDEA_REVIEW_ID,
        userId: DEMO_ADMIN_USER_ID,
        userName: DEMO_ADMIN_NAME,
        comment:
          "Promising — please confirm we can reuse the accounts board data model without exposing internal notes.",
        score: 4,
        createdAt: on(2),
      },
    ],
    rdItemId: null,
    createdAt: on(5),
    updatedAt: on(2),
  };

  const approved: Idea = {
    id: DEMO_IDEA_APPROVED_ID,
    title: "Solar asset QR inspection kit",
    description:
      "Field QR codes on solar assets that open a mobile checklist, photo capture, and sync back into asset records.",
    problem:
      "Site inspections are paper-based; defects are hard to track against specific inverters and arrays.",
    potentialValue:
      "Faster inspections and clearer defect trails for municipal / campus solar contracts.",
    potentialValueZar: 420000,
    category: "Solar / electrical",
    status: "in_rd",
    submitterUserId: DEMO_ADMIN_USER_ID,
    submitterName: DEMO_ADMIN_NAME,
    reviewerUserId: DEMO_ADMIN_USER_ID,
    reviewerName: DEMO_ADMIN_NAME,
    channelId: DEMO_IDEA_CHANNEL_APPROVED,
    decisionReason: "Approved for prototyping on a campus pilot site.",
    decidedAt: on(10),
    decidedByUserId: DEMO_ADMIN_USER_ID,
    decidedByName: DEMO_ADMIN_NAME,
    attachments: [],
    reviews: [
      {
        id: "b1000000-0000-4000-8000-000000000031",
        ideaId: DEMO_IDEA_APPROVED_ID,
        userId: DEMO_ADMIN_USER_ID,
        userName: DEMO_ADMIN_NAME,
        comment: "Clear lane fit. Approve for R&D with Bid Team Member as owner.",
        score: 5,
        createdAt: on(12),
      },
    ],
    rdItemId: DEMO_RD_ITEM_ID,
    createdAt: on(20),
    updatedAt: on(3),
  };

  const submitted: Idea = {
    id: DEMO_IDEA_SUBMITTED_ID,
    title: "Panel opportunity auto-brief",
    description:
      "Generate a one-page brief when a panel RFQ lands — buyer, lane fit, compliance gaps, and suggested go/no-go.",
    problem:
      "Panel RFQs arrive with short windows; the team rewrites the same context every time.",
    potentialValue:
      "Faster bid/no-bid on ICT panels; fewer missed closing dates.",
    potentialValueZar: 95000,
    category: "ICT / IS",
    status: "submitted",
    submitterUserId: DEMO_MEMBER_USER_ID,
    submitterName: DEMO_MEMBER_NAME,
    reviewerUserId: null,
    reviewerName: "",
    channelId: null,
    decisionReason: "",
    decidedAt: null,
    decidedByUserId: null,
    decidedByName: "",
    attachments: [],
    reviews: [],
    rdItemId: null,
    createdAt: on(1),
    updatedAt: on(1),
  };

  const rdItem: RdItem = {
    id: DEMO_RD_ITEM_ID,
    ideaId: DEMO_IDEA_APPROVED_ID,
    title: approved.title,
    stage: "prototyping",
    ownerUserId: DEMO_MEMBER_USER_ID,
    ownerName: DEMO_MEMBER_NAME,
    priority: "high",
    targetDate: until(21),
    effortNotes: "2–3 week prototype: QR labels + PWA checklist + sync stub.",
    progressNotes:
      "Label layout drafted; mobile checklist wireframe in progress.",
    atRisk: false,
    assignments: [
      {
        id: "b1000000-0000-4000-8000-000000000040",
        rdItemId: DEMO_RD_ITEM_ID,
        userId: DEMO_MEMBER_USER_ID,
        userName: DEMO_MEMBER_NAME,
      },
      {
        id: "b1000000-0000-4000-8000-000000000041",
        rdItemId: DEMO_RD_ITEM_ID,
        userId: DEMO_ADMIN_USER_ID,
        userName: DEMO_ADMIN_NAME,
      },
    ],
    documents: [],
    activity: [
      {
        id: "b1000000-0000-4000-8000-000000000050",
        rdItemId: DEMO_RD_ITEM_ID,
        authorUserId: DEMO_ADMIN_USER_ID,
        authorName: DEMO_ADMIN_NAME,
        body: "Moved from Backlog → Researching after approval.",
        createdAt: on(10),
      },
      {
        id: "b1000000-0000-4000-8000-000000000051",
        rdItemId: DEMO_RD_ITEM_ID,
        authorUserId: DEMO_MEMBER_USER_ID,
        authorName: DEMO_MEMBER_NAME,
        body: "Started prototyping QR label + checklist flow.",
        createdAt: on(3),
      },
    ],
    submitterName: DEMO_ADMIN_NAME,
    approvedByName: DEMO_ADMIN_NAME,
    approvedAt: on(10),
    createdAt: on(10),
    updatedAt: on(3),
  };

  return {
    ideas: [underReview, approved, submitted],
    rdItems: [rdItem],
  };
}
