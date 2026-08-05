import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/** App users (mirrors settings users; later link to auth.users). */
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  avatarPath: text("avatar_path"),
  ...timestamps,
}, (t) => [uniqueIndex("profiles_email_uidx").on(t.email)]);

/**
 * Auth users — credentials live in Postgres (Vercel-safe).
 * Prefer this over the legacy profiles table for login/registration.
 *
 * Role is a system key (admin|member|viewer|client) or a custom app_roles.key.
 * Status: active | invited | suspended | deactivated (soft-delete).
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("member"),
    passwordHash: text("password_hash").notNull(),
    /** Public URL (or storage path) for the user's profile picture. */
    avatarUrl: text("avatar_url"),
    /** active | invited | suspended | deactivated */
    status: text("status").notNull().default("active"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    inviteTokenHash: text("invite_token_hash"),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uidx").on(t.email)],
);

/** Named roles (system + custom) for the permissions matrix. */
export const appRoles = pgTable("app_roles", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  isSystem: boolean("is_system").notNull().default(false),
  ...timestamps,
});

/** module × action allowances per role. */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roleKey: text("role_key")
      .notNull()
      .references(() => appRoles.key, { onDelete: "cascade" }),
    module: text("module").notNull(),
    action: text("action").notNull(),
    allowed: boolean("allowed").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("role_permissions_role_mod_act_uidx").on(
      t.roleKey,
      t.module,
      t.action,
    ),
  ],
);

export const companyProfile = pgTable("company_profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  tradingAs: text("trading_as").notNull().default(""),
  regNo: text("reg_no").notNull().default(""),
  csdNo: text("csd_no").notNull().default(""),
  vatNo: text("vat_no").notNull().default(""),
  taxPin: text("tax_pin").notNull().default(""),
  bbbeeLevel: text("bbbee_level").notNull().default(""),
  address: text("address").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  bankDetails: jsonb("bank_details"),
  ...timestamps,
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => profiles.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  diff: jsonb("diff"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    sector: text("sector").notNull().default("public"),
    baseUrl: text("base_url").notNull().default(""),
    adapterKey: text("adapter_key").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    intervalMinutes: integer("interval_minutes").notNull().default(360),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastStatus: text("last_status"),
    lastError: text("last_error"),
    config: jsonb("config"),
    ...timestamps,
  },
  (t) => [uniqueIndex("sources_key_uidx").on(t.key)],
);

export const sourceRuns = pgTable("source_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("running"),
  itemsFound: integer("items_found").notNull().default(0),
  itemsNew: integer("items_new").notNull().default(0),
  errorText: text("error_text"),
});

export const buyers = pgTable(
  "buyers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    type: text("type").notNull().default("national"),
    province: text("province"),
    ...timestamps,
  },
  (t) => [uniqueIndex("buyers_normalized_name_uidx").on(t.normalizedName)],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    refNo: text("ref_no").notNull(),
    refNoNormalized: text("ref_no_normalized"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    buyerId: uuid("buyer_id").references(() => buyers.id),
    buyerName: text("buyer_name").notNull().default(""),
    sector: text("sector").notNull().default("public"),
    sourceId: uuid("source_id").references(() => sources.id),
    sourceLabel: text("source_label").notNull().default("Manual"),
    lane: text("lane").notNull().default("Other"),
    stage: text("stage").notNull().default("Spotted"),
    closingAt: timestamp("closing_at", { withTimezone: true }).notNull(),
    briefingAt: timestamp("briefing_at", { withTimezone: true }),
    briefingCompulsory: boolean("briefing_compulsory").notNull().default(false),
    briefingVenue: text("briefing_venue").notNull().default(""),
    estimatedValueZar: numeric("estimated_value_zar", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("ZAR"),
    sourceUrl: text("source_url").notNull().default(""),
    ownerId: uuid("owner_id").references(() => profiles.id),
    ownerName: text("owner_name").notNull().default(""),
    externalId: text("external_id"),
    contentHash: text("content_hash"),
    opportunityType: text("opportunity_type").notNull().default("tender"),
    isPanel: boolean("is_panel").notNull().default(false),
    panelMaxParticipants: integer("panel_max_participants"),
    panelTerm: text("panel_term"),
    relevanceScore: integer("relevance_score").notNull().default(0),
    lowRelevance: boolean("low_relevance").notNull().default(false),
    isAmended: boolean("is_amended").notNull().default(false),
    amendedAt: timestamp("amended_at", { withTimezone: true }),
    province: text("province"),
    category: text("category"),
    ocdsMainCategory: text("ocds_main_category"),
    matchVia: text("match_via"),
    documentLinks: jsonb("document_links").notNull().default([]),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    inPipeline: boolean("in_pipeline").notNull().default(false),
    searchText: text("search_text").notNull().default(""),
    convertedToLeadId: uuid("converted_to_lead_id"),
    convertedToAccountId: uuid("converted_to_account_id"),
    winProbability: integer("win_probability"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("opportunities_external_id_uidx").on(t.externalId),
    index("opportunities_closing_at_idx").on(t.closingAt),
    index("opportunities_in_pipeline_idx").on(t.inPipeline),
    index("opportunities_category_idx").on(t.category),
    index("opportunities_buyer_name_idx").on(t.buyerName),
    index("opportunities_province_idx").on(t.province),
    index("opportunities_type_idx").on(t.opportunityType),
    index("opportunities_is_panel_idx").on(t.isPanel),
    index("opportunities_stage_idx").on(t.stage),
    index("opportunities_owner_name_idx").on(t.ownerName),
    index("opportunities_created_at_idx").on(t.createdAt),
    index("opportunities_pipeline_category_closing_idx").on(
      t.inPipeline,
      t.category,
      t.closingAt,
    ),
  ],
);

export const sourceRecords = pgTable(
  "source_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    raw: jsonb("raw"),
    contentHash: text("content_hash"),
    url: text("url"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    uniqueIndex("source_records_source_external_uidx").on(
      t.sourceId,
      t.externalId,
    ),
  ],
);

export const opportunityRevisions = pgTable("opportunity_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id")
    .notNull()
    .references(() => opportunities.id, { onDelete: "cascade" }),
  sourceRecordId: uuid("source_record_id").references(() => sourceRecords.id, {
    onDelete: "set null",
  }),
  kind: text("kind").notNull(),
  changedFields: jsonb("changed_fields"),
  detectedAt: timestamp("detected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const laneKeywords = pgTable("lane_keywords", {
  id: uuid("id").defaultRandom().primaryKey(),
  lane: text("lane").notNull(),
  term: text("term").notNull(),
  weight: integer("weight").notNull().default(1),
  isNegative: boolean("is_negative").notNull().default(false),
  ...timestamps,
});

export const categoryLaneMap = pgTable(
  "category_lane_map",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    etendersCategory: text("etenders_category").notNull(),
    lane: text("lane").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("category_lane_map_category_uidx").on(t.etendersCategory),
  ],
);

export const portalWatchlist = pgTable("portal_watchlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: text("company_name").notNull(),
  portalUrl: text("portal_url").notNull().default(""),
  industry: text("industry").notNull().default(""),
  registrationStatus: text("registration_status").notNull().default("not_registered"),
  accountRef: text("account_ref").notNull().default(""),
  renewalDueOn: timestamp("renewal_due_on", { withTimezone: true }),
  hasAdapter: boolean("has_adapter").notNull().default(false),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  contactName: text("contact_name").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  lane: text("lane").notNull().default("Other"),
  sector: text("sector").notNull().default("private"),
  source: text("source").notNull().default("manual"),
  status: text("status").notNull().default("new"),
  notes: text("notes").notNull().default(""),
  ownerId: uuid("owner_id").references(() => profiles.id),
  ownerName: text("owner_name").notNull().default(""),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
    onDelete: "set null",
  }),
  refNo: text("ref_no").notNull().default(""),
  submissionKind: text("submission_kind"),
  accountId: uuid("account_id"),
  ...timestamps,
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientName: text("client_name").notNull(),
  projectTitle: text("project_title").notNull(),
  refNo: text("ref_no").notNull().default(""),
  lane: text("lane").notNull().default("Other"),
  sector: text("sector").notNull().default("public"),
  status: text("status").notNull().default("active"),
  progressPercent: integer("progress_percent").notNull().default(0),
  valueZar: numeric("value_zar", { precision: 14, scale: 2 }),
  startOn: timestamp("start_on", { withTimezone: true }),
  endOn: timestamp("end_on", { withTimezone: true }),
  notes: text("notes").notNull().default(""),
  ownerId: uuid("owner_id").references(() => profiles.id),
  ownerName: text("owner_name").notNull().default(""),
  convertedFromOpportunity: boolean("converted_from_opportunity")
    .notNull()
    .default(false),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
    onDelete: "set null",
  }),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  ...timestamps,
});

export const partners = pgTable("partners", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("letter"),
  role: text("role").notNull().default(""),
  status: text("status").notNull().default("active"),
  contactName: text("contact_name").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  website: text("website").notNull().default(""),
  notes: text("notes").notNull().default(""),
  letterType: text("letter_type").notNull().default(""),
  letterExpiresAt: timestamp("letter_expires_at", { withTimezone: true }),
  providesPartnerLetter: boolean("provides_partner_letter").notNull().default(false),
  sellsOurSystems: boolean("sells_our_systems").notNull().default(false),
  projectPartner: boolean("project_partner").notNull().default(false),
  ...timestamps,
});

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  buyerId: uuid("buyer_id").references(() => buyers.id, { onDelete: "set null" }),
  /** JSON-store account id (e.g. acct-innovationhub) — not a FK to drizzle accounts. */
  accountId: text("account_id"),
  organisation: text("organisation").notNull().default(""),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const interactions = pgTable("interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  notes: text("notes").notNull().default(""),
  userId: uuid("user_id").references(() => profiles.id),
  ...timestamps,
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  number: text("number").notNull(),
  buyerId: uuid("buyer_id").references(() => buyers.id),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  amountCents: integer("amount_cents").notNull().default(0),
  issuedOn: timestamp("issued_on", { withTimezone: true }),
  dueOn: timestamp("due_on", { withTimezone: true }),
  paidOn: timestamp("paid_on", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  ...timestamps,
}, (t) => [uniqueIndex("invoices_number_uidx").on(t.number)]);

export const documentTypes = pgTable(
  "document_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    validityMonths: integer("validity_months"),
    validityRule: jsonb("validity_rule"),
    requiredByDefault: boolean("required_by_default").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("document_types_key_uidx").on(t.key)],
);

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  bucketPath: text("bucket_path").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  kind: text("kind"),
  version: integer("version").notNull().default(1),
  supersedesId: uuid("supersedes_id"),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id),
  ...timestamps,
}, (t) => [index("files_entity_idx").on(t.entityType, t.entityId)]);

export const complianceDocuments = pgTable("compliance_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentTypeId: uuid("document_type_id")
    .notNull()
    .references(() => documentTypes.id),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  issuedOn: timestamp("issued_on", { withTimezone: true }),
  expiresOn: timestamp("expires_on", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  supersededById: uuid("superseded_by_id"),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id),
  notes: text("notes").notNull().default(""),
  filename: text("filename").notNull().default(""),
  mime: text("mime").notNull().default(""),
  size: integer("size").notNull().default(0),
  storedName: text("stored_name").notNull().default(""),
  ...timestamps,
});

export const bidPacks = pgTable("bid_packs", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id")
    .notNull()
    .references(() => opportunities.id, { onDelete: "cascade" }),
  fileId: uuid("file_id").references(() => files.id),
  includedDocumentIds: jsonb("included_document_ids").notNull().default([]),
  hadExpiryWarning: boolean("had_expiry_warning").notNull().default(false),
  createdBy: uuid("created_by").references(() => profiles.id),
  ...timestamps,
});

export const checklistItems = pgTable("checklist_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id")
    .notNull()
    .references(() => opportunities.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  required: boolean("required").notNull().default(true),
  done: boolean("done").notNull().default(false),
  fileId: uuid("file_id").references(() => files.id),
  ...timestamps,
});

export const proposalTemplates = pgTable("proposal_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  ...timestamps,
});

export const templateBlocks = pgTable("template_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => proposalTemplates.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("section"),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  sort: integer("sort").notNull().default(0),
});

export const proposals = pgTable("proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
    onDelete: "set null",
  }),
  templateId: uuid("template_id").references(() => proposalTemplates.id),
  title: text("title").notNull(),
  opportunityRef: text("opportunity_ref").notNull().default(""),
  client: text("client").notNull().default(""),
  status: text("status").notNull().default("draft"),
  summary: text("summary").notNull().default(""),
  valueZar: numeric("value_zar", { precision: 14, scale: 2 }),
  version: integer("version").notNull().default(1),
  ownerId: uuid("owner_id").references(() => profiles.id),
  ownerName: text("owner_name").notNull().default(""),
  createdBy: uuid("created_by").references(() => profiles.id),
  approvedBy: uuid("approved_by").references(() => profiles.id),
  ...timestamps,
});

export const proposalSections = pgTable("proposal_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id")
    .notNull()
    .references(() => proposals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  sort: integer("sort").notNull().default(0),
});

export const proposalComments = pgTable("proposal_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id")
    .notNull()
    .references(() => proposals.id, { onDelete: "cascade" }),
  sectionId: uuid("section_id").references(() => proposalSections.id, {
    onDelete: "set null",
  }),
  userId: uuid("user_id").references(() => profiles.id),
  body: text("body").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  ...timestamps,
});

export const channels = pgTable("channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("public"),
  description: text("description").notNull().default(""),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const channelMembers = pgTable(
  "channel_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("channel_members_channel_profile_uidx").on(
      t.channelId,
      t.profileId,
    ),
  ],
);

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  userId: uuid("user_id").references(() => profiles.id),
  authorName: text("author_name").notNull().default(""),
  body: text("body").notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("reactions_message_profile_emoji_uidx").on(
      t.messageId,
      t.profileId,
      t.emoji,
    ),
  ],
);

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("Admin"),
  body: text("body").notNull().default(""),
  linkedTo: text("linked_to").notNull().default(""),
  pinned: boolean("pinned").notNull().default(false),
  solved: boolean("solved").notNull().default(false),
  authorId: uuid("author_id").references(() => profiles.id),
  authorName: text("author_name").notNull().default(""),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
    onDelete: "set null",
  }),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => profiles.id),
  authorName: text("author_name").notNull().default(""),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull().default("meeting"),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  location: text("location").notNull().default(""),
  agenda: text("agenda").notNull().default(""),
  videoUrl: text("video_url"),
  linkedTo: text("linked_to").notNull().default(""),
  attendees: text("attendees").notNull().default(""),
  allDay: boolean("all_day").notNull().default(false),
  createdBy: uuid("created_by").references(() => profiles.id),
  opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const eventAttendees = pgTable(
  "event_attendees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("event_attendees_event_profile_uidx").on(
      t.eventId,
      t.profileId,
    ),
  ],
);

export const newsFeeds = pgTable("news_feeds", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  feedUrl: text("feed_url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  ...timestamps,
});

export const newsSignals = pgTable("news_signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  feedId: uuid("feed_id").references(() => newsFeeds.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  url: text("url").notNull().default(""),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  matchedTerms: jsonb("matched_terms").notNull().default([]),
  lanes: jsonb("lanes").notNull().default([]),
  buyerGuess: text("buyer_guess"),
  promotedOpportunityId: uuid("promoted_opportunity_id").references(
    () => opportunities.id,
    { onDelete: "set null" },
  ),
  ...timestamps,
});

export const searchIndex = pgTable(
  "search_index",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("search_index_entity_uidx").on(t.entityType, t.entityId),
  ],
);

/**
 * PMO projects — linked to JSON-store account ids (text), not drizzle `accounts`.
 * Status: not_started | in_delivery | on_hold | closed
 * Health: green | amber | red
 */
export const pmoProjects = pgTable(
  "pmo_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    accountName: text("account_name").notNull().default(""),
    name: text("name").notNull(),
    status: text("status").notNull().default("not_started"),
    health: text("health").notNull().default("green"),
    valueZar: numeric("value_zar", { precision: 14, scale: 2 }),
    startOn: timestamp("start_on", { withTimezone: true }),
    dueOn: timestamp("due_on", { withTimezone: true }),
    projectManagerUserId: text("project_manager_user_id"),
    projectManagerName: text("project_manager_name").notNull().default(""),
    sourceOpportunityId: text("source_opportunity_id"),
    sourceLeadId: text("source_lead_id"),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("pmo_projects_account_id_idx").on(t.accountId),
    index("pmo_projects_status_idx").on(t.status),
    index("pmo_projects_health_idx").on(t.health),
    index("pmo_projects_pm_idx").on(t.projectManagerUserId),
  ],
);

/** Team members assigned to a project (members see only assigned projects). */
export const pmoProjectAssignments = pgTable(
  "pmo_project_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => pmoProjects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pmo_project_assignments_project_user_uidx").on(
      t.projectId,
      t.userId,
    ),
    index("pmo_project_assignments_user_idx").on(t.userId),
  ],
);

export const pmoAppointmentLetters = pgTable("pmo_appointment_letters", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => pmoProjects.id, { onDelete: "cascade" }),
  letterDate: timestamp("letter_date", { withTimezone: true }),
  reference: text("reference").notNull().default(""),
  awardedValueZar: numeric("awarded_value_zar", { precision: 14, scale: 2 }),
  signatory: text("signatory").notNull().default(""),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const pmoSlas = pgTable("pmo_slas", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => pmoProjects.id, { onDelete: "cascade" }),
  term: text("term").notNull().default(""),
  serviceLevels: text("service_levels").notNull().default(""),
  penalties: text("penalties").notNull().default(""),
  reviewDates: jsonb("review_dates").notNull().default([]),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const pmoPurchaseOrders = pgTable("pmo_purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => pmoProjects.id, { onDelete: "cascade" }),
  poNumber: text("po_number").notNull().default(""),
  amountZar: numeric("amount_zar", { precision: 14, scale: 2 }),
  poDate: timestamp("po_date", { withTimezone: true }),
  remainingBalanceZar: numeric("remaining_balance_zar", {
    precision: 14,
    scale: 2,
  }),
  linkedInvoiceIds: jsonb("linked_invoice_ids").notNull().default([]),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const pmoCharters = pgTable("pmo_charters", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => pmoProjects.id, { onDelete: "cascade" }),
  objectives: text("objectives").notNull().default(""),
  scopeIn: text("scope_in").notNull().default(""),
  scopeOut: text("scope_out").notNull().default(""),
  deliverables: text("deliverables").notNull().default(""),
  milestones: text("milestones").notNull().default(""),
  budgetZar: numeric("budget_zar", { precision: 14, scale: 2 }),
  assumptions: text("assumptions").notNull().default(""),
  constraints: text("constraints").notNull().default(""),
  signOff: jsonb("sign_off"),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  ...timestamps,
});

export const pmoPlans = pgTable("pmo_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => pmoProjects.id, { onDelete: "cascade" }),
  schedule: text("schedule").notNull().default(""),
  wbs: text("wbs").notNull().default(""),
  resourcing: text("resourcing").notNull().default(""),
  budgetPlan: text("budget_plan").notNull().default(""),
  riskRegister: jsonb("risk_register").notNull().default([]),
  qualityApproach: text("quality_approach").notNull().default(""),
  changeControl: text("change_control").notNull().default(""),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  ...timestamps,
});

export const pmoStatusReports = pgTable("pmo_status_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => pmoProjects.id, { onDelete: "cascade" }),
  period: text("period").notNull().default(""),
  cadence: text("cadence").notNull().default("monthly"),
  progress: text("progress").notNull().default(""),
  percentComplete: integer("percent_complete").notNull().default(0),
  milestonesHit: text("milestones_hit").notNull().default(""),
  risksIssues: text("risks_issues").notNull().default(""),
  nextSteps: text("next_steps").notNull().default(""),
  reportedAt: timestamp("reported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  ...timestamps,
});

export const pmoProjectStakeholders = pgTable(
  "pmo_project_stakeholders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => pmoProjects.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    influence: text("influence").notNull().default("medium"),
    interest: text("interest").notNull().default("medium"),
    engagementNotes: text("engagement_notes").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pmo_project_stakeholders_project_contact_uidx").on(
      t.projectId,
      t.contactId,
    ),
  ],
);

export const pmoStakeholderComms = pgTable("pmo_stakeholder_comms", {
  id: uuid("id").defaultRandom().primaryKey(),
  stakeholderId: uuid("stakeholder_id")
    .notNull()
    .references(() => pmoProjectStakeholders.id, { onDelete: "cascade" }),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  channel: text("channel").notNull().default("email"),
  summary: text("summary").notNull().default(""),
  authorName: text("author_name").notNull().default(""),
  ...timestamps,
});

/**
 * Ideas & R&D — additive innovation pipeline.
 * Status: submitted | under_review | approved | in_rd | rejected | parked
 * R&D stage: backlog | researching | prototyping | validating | completed | shelved
 */
export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    problem: text("problem").notNull().default(""),
    potentialValue: text("potential_value").notNull().default(""),
    potentialValueZar: numeric("potential_value_zar", {
      precision: 14,
      scale: 2,
    }),
    category: text("category").notNull().default("Other"),
    status: text("status").notNull().default("submitted"),
    submitterUserId: text("submitter_user_id").notNull(),
    submitterName: text("submitter_name").notNull().default(""),
    reviewerUserId: text("reviewer_user_id"),
    reviewerName: text("reviewer_name").notNull().default(""),
    channelId: text("channel_id"),
    decisionReason: text("decision_reason").notNull().default(""),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByUserId: text("decided_by_user_id"),
    decidedByName: text("decided_by_name").notNull().default(""),
    rdItemId: text("rd_item_id"),
    ...timestamps,
  },
  (t) => [
    index("ideas_status_idx").on(t.status),
    index("ideas_category_idx").on(t.category),
    index("ideas_submitter_idx").on(t.submitterUserId),
  ],
);

export const ideaReviews = pgTable(
  "idea_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull().default(""),
    comment: text("comment").notNull().default(""),
    score: integer("score"),
    ...timestamps,
  },
  (t) => [index("idea_reviews_idea_id_idx").on(t.ideaId)],
);

export const ideaAttachments = pgTable(
  "idea_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mime: text("mime").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    storedName: text("stored_name").notNull(),
    ...timestamps,
  },
  (t) => [index("idea_attachments_idea_id_idx").on(t.ideaId)],
);

export const rdItems = pgTable(
  "rd_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    stage: text("stage").notNull().default("backlog"),
    ownerUserId: text("owner_user_id"),
    ownerName: text("owner_name").notNull().default(""),
    priority: text("priority").notNull().default("medium"),
    targetDate: timestamp("target_date", { withTimezone: true }),
    effortNotes: text("effort_notes").notNull().default(""),
    progressNotes: text("progress_notes").notNull().default(""),
    atRisk: boolean("at_risk").notNull().default(false),
    submitterName: text("submitter_name").notNull().default(""),
    approvedByName: text("approved_by_name").notNull().default(""),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("rd_items_stage_idx").on(t.stage),
    index("rd_items_idea_id_idx").on(t.ideaId),
    index("rd_items_owner_idx").on(t.ownerUserId),
  ],
);

export const rdAssignments = pgTable(
  "rd_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rdItemId: uuid("rd_item_id")
      .notNull()
      .references(() => rdItems.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("rd_assignments_rd_user_uidx").on(t.rdItemId, t.userId),
    index("rd_assignments_user_idx").on(t.userId),
  ],
);

export const rdActivity = pgTable(
  "rd_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rdItemId: uuid("rd_item_id")
      .notNull()
      .references(() => rdItems.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").notNull().default(""),
    authorName: text("author_name").notNull().default(""),
    body: text("body").notNull(),
    ...timestamps,
  },
  (t) => [index("rd_activity_rd_item_id_idx").on(t.rdItemId)],
);

export const rdDocuments = pgTable(
  "rd_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rdItemId: uuid("rd_item_id")
      .notNull()
      .references(() => rdItems.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mime: text("mime").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    storedName: text("stored_name").notNull(),
    ...timestamps,
  },
  (t) => [index("rd_documents_rd_item_id_idx").on(t.rdItemId)],
);
