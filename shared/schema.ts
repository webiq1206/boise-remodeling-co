import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, decimal, boolean, index, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Detailed quote requests with AI analysis
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Customer info
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  
  // Property details
  address: text("address"),
  city: text("city").notNull(),
  propertyProfile: jsonb("property_profile").$type<import("@/shared/propertyProfile").PropertyProfile>(),
  propertyType: text("property_type").notNull(),
  propertySize: decimal("property_size", { precision: 10, scale: 2 }), // sq ft
  
  // Service details
  serviceType: text("service_type").notNull(),
  frequency: text("frequency"), // one-time, weekly, bi-weekly, monthly
  selectedServices: text("selected_services").array(), // array of service IDs
  serviceData: jsonb("service_data"), // service-specific measurements {serviceId: {linearFeet: 200, zones: 6, etc.}}
  
  // AI Analysis
  aiAnalysis: jsonb("ai_analysis"), // terrain, obstacles, complexity assessment
  complexityScore: decimal("complexity_score", { precision: 3, scale: 2 }), // 1.0-2.0 multiplier
  
  // Pricing
  baseCost: decimal("base_cost", { precision: 10, scale: 2 }),
  adjustedCost: decimal("adjusted_cost", { precision: 10, scale: 2 }), // after complexity
  finalQuote: decimal("final_quote", { precision: 10, scale: 2 }), // with margin
  lineItems: jsonb("line_items"), // detailed breakdown
  
  // Status
  status: text("status").default("pending"), // pending, accepted, declined, completed
  acceptedAt: timestamp("accepted_at"),
  scheduledDate: timestamp("scheduled_date"),
  
  // Additional
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  name: z.string().min(2, "Please enter your full name"),
  serviceType: z.string().min(1, "Please select a service type"),
  propertyType: z.string().min(1, "Please select a property type"),
  city: z.string().min(1, "Please select your city"),
});

// Schema for quote submissions from the wizard (includes AI-generated fields)
export const quoteSubmissionSchema = insertQuoteSchema.extend({
  // Make AI-generated fields optional with proper types
  aiAnalysis: z.any().optional(),
  complexityScore: z.union([z.string(), z.number()]).optional(),
  baseCost: z.union([z.string(), z.number()]).optional(),
  adjustedCost: z.union([z.string(), z.number()]).optional(),
  finalQuote: z.union([z.string(), z.number()]).optional(),
  lineItems: z.any().optional(),
  serviceData: z.any().optional(), // service-specific measurements
  status: z.string().optional(),
  scheduledDate: z.union([z.string(), z.date()]).optional(),
  frequency: z.string().optional(),
  selectedServices: z.array(z.string()).optional(),
  address: z.string().optional(),
  message: z.string().optional(),
  // Allow propertySize as string or number (will be normalized)
  propertySize: z.union([z.string(), z.number()]).optional(),
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type QuoteSubmission = z.infer<typeof quoteSubmissionSchema>;
export type Quote = typeof quotes.$inferSelect;

// Gallery Photos Schema
export const galleryPhotos = pgTable("gallery_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceType: text("service_type").notNull(),
  city: text("city").notNull(),
  beforeImageUrl: text("before_image_url").notNull(),
  afterImageUrl: text("after_image_url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGalleryPhotoSchema = createInsertSchema(galleryPhotos).omit({
  id: true,
  createdAt: true,
});

export type GalleryPhoto = typeof galleryPhotos.$inferSelect;
export type InsertGalleryPhoto = z.infer<typeof insertGalleryPhotoSchema>;

// Testimonials Schema
export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  serviceType: text("service_type").notNull(),
  city: text("city").notNull(),
  rating: text("rating").notNull(), // 1-5
  testimonial: text("testimonial").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;

// Blog Posts Schema
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  seoTitle: text("seo_title"),
  metaDescription: text("meta_description"),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array().notNull(),
  faqs: jsonb("faqs").$type<Array<{ question: string; answer: string }>>().notNull().default(sql`'[]'::jsonb`),
  publishedAt: timestamp("published_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  })
);

// Users table (extends Replit Auth with lead distribution fields)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Lead distribution specific fields
  phone: text("phone"),
  role: text("role").notNull().default("subcontractor"), // admin or subcontractor
  company: text("company"),
  licenseNumber: text("license_number"),
  insuranceExpiry: timestamp("insurance_expiry"),
  
  // Agreement acceptance and e-signature
  agreementAccepted: boolean("agreement_accepted").default(false),
  agreementAcceptedAt: timestamp("agreement_accepted_at"),
  agreementSignature: text("agreement_signature"), // Typed name as signature
  agreementSignatureIp: text("agreement_signature_ip"), // IP address when signing
  agreementSignatureUserAgent: text("agreement_signature_user_agent"), // Browser info
  agreementVersion: text("agreement_version"), // Version of agreement signed
  
  // Stripe
  stripeCustomerId: text("stripe_customer_id"),
  
  // Account credits
  creditBalance: decimal("credit_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  
  // Watchlist for contractors
  watchedLeads: jsonb("watched_leads").$type<string[]>().default(sql`'[]'::jsonb`), // Array of lead IDs
  
  // Declined/Passed leads - hidden from this contractor's view
  declinedLeads: jsonb("declined_leads").$type<string[]>().default(sql`'[]'::jsonb`), // Array of lead IDs

  // Notification preferences
  // Subcontractors can disable email notifications from the portal.
  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(true),
  complianceNotificationsEnabled: boolean("compliance_notifications_enabled").notNull().default(true),
  notificationPreferences: jsonb("notification_preferences").$type<{
    coiReminders?: boolean;
    w9Reminders?: boolean;
    contractReminders?: boolean;
    leadEmails?: boolean;
    notifyPriceDrops?: boolean;
  }>().default(sql`'{"coiReminders":true,"w9Reminders":true,"contractReminders":true,"leadEmails":true,"notifyPriceDrops":true}'::jsonb`),

  // Cached compliance status (updated on doc changes)
  complianceStatus: text("compliance_status").default("non_compliant"), // compliant, non_compliant, expiring_soon
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

// Leads Schema (extends quotes)
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Link to original quote
  quoteId: varchar("quote_id").references(() => quotes.id),
  
  // Lead details (copied from quote for denormalization)
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city").notNull(),
  propertyProfile: jsonb("property_profile").$type<import("@/shared/propertyProfile").PropertyProfile>(),
  propertyType: text("property_type").notNull(),
  serviceType: text("service_type").notNull(),
  selectedServices: text("selected_services").array(),
  frequency: text("frequency"), // one-time or recurring
  finalQuote: decimal("final_quote", { precision: 10, scale: 2 }),
  lineItems: jsonb("line_items"),
  serviceData: jsonb("service_data"),
  message: text("message"),
  notes: jsonb("notes"), // Array of {text: string, addedBy: string, addedAt: Date}[]
  
  // Lead pricing
  baseLeadPrice: decimal("base_lead_price", { precision: 10, scale: 2 }).notNull(),
  currentLeadPrice: decimal("current_lead_price", { precision: 10, scale: 2 }).notNull(),
  priceReductionRate: decimal("price_reduction_rate", { precision: 5, scale: 2 }).default("1.50"), // 1.5% daily
  lastPriceUpdate: timestamp("last_price_update").defaultNow(),
  
  // Lead status
  status: text("status").notNull().default("pending_admin"), // pending_admin, available, purchased, declined_admin
  adminReviewedBy: varchar("admin_reviewed_by").references(() => users.id),
  adminReviewedAt: timestamp("admin_reviewed_at"),
  adminDeclined: boolean("admin_declined").default(false),
  
  // Priority and tags
  priority: text("priority").default("normal"), // low, normal, high, urgent
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`), // Array of tag strings
  
  // Purchase tracking
  purchasedBy: varchar("purchased_by").references(() => users.id),
  purchasedAt: timestamp("purchased_at"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  // Set true when the customer's saved address has no leading house number.
  // Surfaced in admin/sub portals so the buyer knows to call the customer
  // before driving out. Defaults to false; backfill script may set true on
  // historical rows.
  addressMissingHouseNumber: boolean("address_missing_house_number")
    .notNull()
    .default(false),

  // Project conversion
  projectId: varchar("project_id"),
  convertedToProjectAt: timestamp("converted_to_project_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("leads_status_idx").on(table.status),
  cityIdx: index("leads_city_idx").on(table.city),
  serviceTypeIdx: index("leads_service_type_idx").on(table.serviceType),
  statusCityIdx: index("leads_status_city_idx").on(table.status, table.city),
  priceIdx: index("leads_current_price_idx").on(table.currentLeadPrice),
}));

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastPriceUpdate: true,
}).extend({
  // Make pricing fields optional since backend calculates them
  baseLeadPrice: z.string().optional(),
  currentLeadPrice: z.string().optional(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

// Lead Purchases Schema (transaction history)
export const leadPurchases = pgTable("lead_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().unique().references(() => leads.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
  stripeChargeId: text("stripe_charge_id"),
  creditsUsed: decimal("credits_used", { precision: 10, scale: 2 }).notNull().default("0"),
  
  refunded: boolean("refunded").default(false),
  refundReason: text("refund_reason"),
  refundedAt: timestamp("refunded_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("lead_purchases_user_id_idx").on(table.userId),
}));

export const insertLeadPurchaseSchema = createInsertSchema(leadPurchases).omit({
  id: true,
  createdAt: true,
});

export type LeadPurchase = typeof leadPurchases.$inferSelect;
export type InsertLeadPurchase = z.infer<typeof insertLeadPurchaseSchema>;

// Credit Transactions Schema (audit trail for credit changes)
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(),
  description: text("description"),
  adminId: varchar("admin_id").references(() => users.id),
  leadPurchaseId: varchar("lead_purchase_id").references(() => leadPurchases.id),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("credit_transactions_user_id_idx").on(table.userId),
}));

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

// Notifications Schema
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // new_lead, lead_purchased, lead_price_drop, admin_new_quote
  title: text("title").notNull(),
  message: text("message").notNull(),
  leadId: varchar("lead_id").references(() => leads.id),
  projectId: varchar("project_id"),
  contractId: varchar("contract_id"),
  complianceDocumentId: varchar("compliance_document_id"),
  
  // Status
  read: boolean("read").default(false),
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  userIdReadIdx: index("notifications_user_id_read_idx").on(table.userId, table.read),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const siteSettings = pgTable("site_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by"),
});

export type SiteSetting = typeof siteSettings.$inferSelect;

// Consultation Requests Schema (new contacts from the homepage form)
export const consultationRequests = pgTable("consultation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  zip: text("zip").notNull(),
  address: text("address"),
  city: text("city"),
  propertyProfile: jsonb("property_profile").$type<import("@/shared/propertyProfile").PropertyProfile>(),
  projectType: text("project_type").notNull(),
  message: text("message"),
  // Calculator estimate (optional; populated when user used the estimate tool)
  estimateProject: text("estimate_project"),
  estimateFinish: text("estimate_finish"),
  estimateLow: decimal("estimate_low", { precision: 10, scale: 2 }),
  estimateHigh: decimal("estimate_high", { precision: 10, scale: 2 }),
  estimateSqft: integer("estimate_sqft"),
  estimateConfidence: text("estimate_confidence"),
  /*
   * Estimate accuracy loop. Recording what a job actually contracted for is
   * the only thing that ever proves whether the estimator is right: the
   * invariant suite proves the model is self-consistent, and the cost guide
   * proves nothing at all (its ADU floor was 26% above the cheapest real job).
   * Variance is computed against the range shown to the homeowner, so the
   * question answered is "did we tell them the truth", not "did we guess a
   * midpoint".
   */
  actualContractValue: decimal("actual_contract_value", { precision: 12, scale: 2 }),
  actualRecordedAt: timestamp("actual_recorded_at"),
  actualNotes: text("actual_notes"),
  /*
   * Meta (Facebook) Lead Ads. The Graph leadgen id of the lead this row was
   * created from, unique so a webhook redelivery can never store the same
   * Meta lead twice. Null for every lead that arrived through the site.
   */
  fbLeadId: text("fb_lead_id"),
  /*
   * One browser-generated id follows a homeowner from the estimate gate to the
   * consultation form and across safe retries. The unique index makes the
   * database, rather than the browser, the authority on whether this is a new
   * inquiry and therefore eligible for a new-lead conversion.
   */
  inquiryId: text("inquiry_id"),
  /*
   * A short-lived server fingerprint catches duplicate callbacks where a
   * browser lost its inquiry id. It contains only a SHA-256 digest, never raw
   * contact data.
   */
  inquiryDedupeKey: text("inquiry_dedupe_key"),
  sourceStage: text("source_stage").default("consultation"),
  acceptedAt: timestamp("accepted_at").defaultNow(),
  conversionRecordedAt: timestamp("conversion_recorded_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  deliveryLockedAt: timestamp("delivery_locked_at"),
  deliveryAttemptCount: integer("delivery_attempt_count").notNull().default(0),
  deliveryStatus: jsonb("delivery_status").$type<{
    crm: "pending" | "sent" | "failed" | "skipped";
    adminEmail: "pending" | "sent" | "failed" | "skipped";
    customerEmail: "pending" | "sent" | "failed" | "skipped";
    lastError?: string;
    lastAttemptAt?: string;
  }>(),
  submissionIpHash: text("submission_ip_hash"),
  // Status
  status: text("status").notNull().default("new"), // new, contacted, converted, closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("consultation_requests_fb_lead_id_idx")
    .on(table.fbLeadId)
    .where(sql`fb_lead_id IS NOT NULL`),
  uniqueIndex("consultation_requests_inquiry_id_idx")
    .on(table.inquiryId)
    .where(sql`inquiry_id IS NOT NULL`),
  uniqueIndex("consultation_requests_inquiry_dedupe_idx")
    .on(table.inquiryDedupeKey)
    .where(sql`inquiry_dedupe_key IS NOT NULL`),
  index("consultation_requests_ip_created_idx").on(table.submissionIpHash, table.createdAt),
]);

export const insertConsultationRequestSchema = createInsertSchema(consultationRequests).omit({
  id: true,
  createdAt: true,
});

export type ConsultationRequest = typeof consultationRequests.$inferSelect;
export type InsertConsultationRequest = z.infer<typeof insertConsultationRequestSchema>;

// --- Compliance & Project Management ---

export type ComplianceDocType = "coi" | "w9";
export type ComplianceDocStatus = "pending_review" | "approved" | "rejected" | "expired";
export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "cancelled";
export type ContractStatus = "draft" | "sent" | "signed" | "void";
export type ChangeOrderStatus = "draft" | "pending_signature" | "approved" | "rejected";

export const complianceDocuments = pgTable("compliance_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // coi | w9
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size"),
  status: text("status").notNull().default("pending_review"),
  expiresAt: timestamp("expires_at"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  version: integer("version").notNull().default(1),
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("compliance_documents_user_id_idx").on(table.userId),
  userTypeCurrentIdx: index("compliance_documents_user_type_current_idx").on(table.userId, table.type, table.isCurrent),
}));

export const insertComplianceDocumentSchema = createInsertSchema(complianceDocuments).omit({
  id: true,
  createdAt: true,
  uploadedAt: true,
});

export type ComplianceDocument = typeof complianceDocuments.$inferSelect;
export type InsertComplianceDocument = z.infer<typeof insertComplianceDocumentSchema>;

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").unique().references(() => leads.id),
  quoteId: varchar("quote_id").references(() => quotes.id),
  title: text("title").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city").notNull(),
  propertyProfile: jsonb("property_profile").$type<import("@/shared/propertyProfile").PropertyProfile>(),
  propertyType: text("property_type").notNull(),
  serviceType: text("service_type").notNull(),
  selectedServices: text("selected_services").array(),
  lineItems: jsonb("line_items"),
  serviceData: jsonb("service_data"),
  message: text("message"),
  scopeOfWork: text("scope_of_work"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  contractAmount: decimal("contract_amount", { precision: 10, scale: 2 }),
  paymentTerms: text("payment_terms"),
  startDate: timestamp("start_date"),
  completionDate: timestamp("completion_date"),
  status: text("status").notNull().default("draft"),
  internalNotes: jsonb("internal_notes").$type<Array<{ text: string; addedBy: string; addedAt: string; type?: string }>>().default(sql`'[]'::jsonb`),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdBy: varchar("created_by").references(() => users.id),
  convertedFromLeadAt: timestamp("converted_from_lead_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("projects_status_idx").on(table.status),
}));

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const projectAssignments = pgTable("project_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  subcontractorId: varchar("subcontractor_id").notNull().references(() => users.id),
  role: text("role").notNull().default("primary"), // primary | sub
  status: text("status").notNull().default("assigned"), // assigned | active | completed | removed
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  projectIdx: index("project_assignments_project_idx").on(table.projectId),
  subIdx: index("project_assignments_sub_idx").on(table.subcontractorId),
}));

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments).omit({
  id: true,
  assignedAt: true,
});

export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;

export const changeOrders = pgTable("change_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  amountDelta: decimal("amount_delta", { precision: 10, scale: 2 }).notNull().default("0"),
  scopeDelta: text("scope_delta"),
  status: text("status").notNull().default("draft"),
  approvedAt: timestamp("approved_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("change_orders_project_idx").on(table.projectId),
}));

export const insertChangeOrderSchema = createInsertSchema(changeOrders).omit({
  id: true,
  createdAt: true,
});

export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;

export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  bodyHtml: text("body_html").notNull(),
  version: text("version").notNull().default("1.0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  subcontractorId: varchar("subcontractor_id").notNull().references(() => users.id),
  templateId: varchar("template_id").references(() => contractTemplates.id),
  title: text("title").notNull(),
  bodyHtml: text("body_html").notNull(),
  status: text("status").notNull().default("draft"),
  mergeData: jsonb("merge_data").$type<Record<string, string>>(),
  signature: text("signature"),
  signedAt: timestamp("signed_at"),
  signatureIp: text("signature_ip"),
  signatureUserAgent: text("signature_user_agent"),
  signedPdfUrl: text("signed_pdf_url"),
  sentAt: timestamp("sent_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("contracts_project_idx").on(table.projectId),
  subIdx: index("contracts_sub_idx").on(table.subcontractorId),
  statusIdx: index("contracts_status_idx").on(table.status),
}));

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export const entityDocuments = pgTable("entity_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // lead | project | contract
  entityId: varchar("entity_id").notNull(),
  category: text("category").notNull().default("attachment"), // photo | attachment | signed_contract | other
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  entityIdx: index("entity_documents_entity_idx").on(table.entityType, table.entityId),
}));

export const insertEntityDocumentSchema = createInsertSchema(entityDocuments).omit({
  id: true,
  createdAt: true,
});

export type EntityDocument = typeof entityDocuments.$inferSelect;
export type InsertEntityDocument = z.infer<typeof insertEntityDocumentSchema>;

export const complianceReminderLog = pgTable("compliance_reminder_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: text("document_type").notNull(),
  reminderType: text("reminder_type").notNull(), // missing | expiring_30 | expiring_14 | expiring_7 | expired
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (table) => ({
  dedupeIdx: index("compliance_reminder_log_dedupe_idx").on(table.userId, table.documentType, table.reminderType, table.sentAt),
}));

/**
 * File bytes, kept in the database.
 *
 * WHY NOT AN OBJECT STORE. The blob helper falls back to the container
 * filesystem when no BLOB_READ_WRITE_TOKEN is set, and this app runs on
 * ephemeral containers - so an uploaded RE-10 was surviving until the next
 * deploy and then 404ing, taking the document link on the lead with it.
 * Postgres is already here, already backed up, and already private. A few
 * hundred kilobytes per lead is nothing next to what it costs to lose the
 * document an agent sent us.
 *
 * Base64 text rather than bytea: it survives every driver and serializer in
 * this stack unchanged, and at this size the ~33% overhead is irrelevant.
 */
export const storedFiles = pgTable("stored_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  /** Storage key, e.g. "re10/<uuid>/0-RE-10.pdf". Unguessable by construction. */
  key: text("key").notNull().unique(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  /** The file itself, base64 encoded. */
  data: text("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StoredFile = typeof storedFiles.$inferSelect;
