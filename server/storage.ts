import { type Quote, type InsertQuote, type GalleryPhoto, type InsertGalleryPhoto, type Testimonial, type InsertTestimonial, type BlogPost, type InsertBlogPost, type User, type UpsertUser, type Lead, type InsertLead, type LeadPurchase, type InsertLeadPurchase, type Notification, type InsertNotification, quotes, galleryPhotos, testimonials, blogPosts, users, leads, leadPurchases, notifications } from "@shared/schema";
import { randomUUID } from "crypto";
import { BLOG_POSTS } from "@shared/blogContent";
import { db } from "./db";
import { eq, and, or, desc, lte } from "drizzle-orm";
import { getDesignatedRole } from "@/lib/adminAccess";

export interface IStorage {
  createQuote(quote: InsertQuote): Promise<Quote>;
  getAllQuotes(): Promise<Quote[]>;
  getQuoteById(id: string): Promise<Quote | undefined>;
  
  createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  getAllGalleryPhotos(): Promise<GalleryPhoto[]>;
  getGalleryPhotosByService(serviceType: string): Promise<GalleryPhoto[]>;
  
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  getAllTestimonials(): Promise<Testimonial[]>;
  getTestimonialsByService(serviceType: string): Promise<Testimonial[]>;
  
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  getAllBlogPosts(): Promise<BlogPost[]>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  
  // User/Auth methods (Replit Auth compatible)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getAllSubcontractors(): Promise<User[]>;
  getAllAdmins(): Promise<User[]>;
  
  // Lead methods
  createLead(lead: InsertLead): Promise<Lead>;
  getAllLeads(): Promise<Lead[]>;
  getLeadById(id: string): Promise<Lead | undefined>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsForSubcontractor(filters?: { city?: string; serviceType?: string; maxPrice?: number }): Promise<Lead[]>;
  updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  updateLeadPrices(): Promise<void>;
  acceptLead(leadId: string, adminUserId: string): Promise<Lead | undefined>;
  declineLead(leadId: string, adminUserId: string): Promise<Lead | undefined>;
  
  // Lead Purchase methods
  createLeadPurchase(purchase: InsertLeadPurchase): Promise<LeadPurchase>;
  getLeadPurchasesByUser(userId: string): Promise<LeadPurchase[]>;
  getLeadPurchaseByLead(leadId: string): Promise<LeadPurchase | undefined>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>; // Alias for consistency
  markNotificationRead(id: string): Promise<void>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>; // Returns the notification
  markNotificationEmailSent(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<number>; // Returns count of marked notifications
  
  // Lead Purchase methods (aliases for API consistency)
  getLeadPurchaseByLeadId(leadId: string): Promise<LeadPurchase | undefined>;
  getLeadPurchaseByPaymentIntentId(paymentIntentId: string): Promise<LeadPurchase | undefined>;
}

export class MemStorage implements IStorage {
  private quotes: Map<string, Quote>;
  private galleryPhotos: Map<string, GalleryPhoto>;
  private testimonials: Map<string, Testimonial>;
  private blogPosts: Map<string, BlogPost>;
  private users: Map<string, User>;
  private leads: Map<string, Lead>;
  private leadPurchases: Map<string, LeadPurchase>;
  private notifications: Map<string, Notification>;

  constructor() {
    this.quotes = new Map();
    this.galleryPhotos = new Map();
    this.testimonials = new Map();
    this.blogPosts = new Map();
    this.users = new Map();
    this.leads = new Map();
    this.leadPurchases = new Map();
    this.notifications = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed gallery photos
    const sampleGalleryPhotos: GalleryPhoto[] = [
      {
        id: randomUUID(),
        serviceType: 'kitchen-remodel',
        city: 'boise',
        beforeImageUrl: '/images/gallery/gallery-kitchen-before.png',
        afterImageUrl: '/images/gallery/gallery-kitchen-after.png',
        title: 'Modern Kitchen Transformation',
        description: 'Full kitchen remodel with custom cabinets, quartz countertops, and new layout in Boise',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        serviceType: 'bathroom-remodel',
        city: 'meridian',
        beforeImageUrl: '/images/gallery/gallery-bathroom-before.png',
        afterImageUrl: '/images/gallery/gallery-bathroom-after.png',
        title: 'Primary Bathroom Renovation',
        description: 'Luxury primary bathroom remodel with walk-in shower, freestanding tub, and heated floors in Meridian',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        serviceType: 'whole-home-remodel',
        city: 'eagle',
        beforeImageUrl: '/images/gallery/gallery-whole-home-before.png',
        afterImageUrl: '/images/gallery/gallery-whole-home-after.png',
        title: 'Whole-Home Remodel',
        description: 'Complete interior renovation of a 1990s Eagle home with open floor plan, new kitchen, and three updated bathrooms',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        serviceType: 'room-addition',
        city: 'nampa',
        beforeImageUrl: '/images/gallery/gallery-addition-before.png',
        afterImageUrl: '/images/gallery/gallery-addition-after.png',
        title: 'Master Suite Addition',
        description: '600 sq ft master suite addition with ensuite bath and walk-in closet in Nampa',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        serviceType: 'basement-finish',
        city: 'boise',
        beforeImageUrl: '/images/gallery/gallery-basement-before.png',
        afterImageUrl: '/images/gallery/gallery-basement-after.png',
        title: 'Basement Finish',
        description: 'Unfinished basement transformed into a family room, home office, and full bath in Boise',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        serviceType: 'outdoor-living',
        city: 'star',
        beforeImageUrl: '/images/gallery/gallery-outdoor-before.png',
        afterImageUrl: '/images/gallery/gallery-outdoor-after.png',
        title: 'Outdoor Living Space',
        description: 'Covered patio with outdoor kitchen and pergola for year-round entertaining in Star',
        createdAt: new Date(),
      },
    ];

    sampleGalleryPhotos.forEach(photo => this.galleryPhotos.set(photo.id, photo));

    // No testimonials seeded. There are no real customer reviews yet - do not
    // fabricate placeholder ones. Populate this once real reviews exist.
    const sampleTestimonials: Testimonial[] = [];

    sampleTestimonials.forEach(testimonial => this.testimonials.set(testimonial.id, testimonial));

    // Seed blog posts from blogContent.ts
    const blogPostsFromContent: BlogPost[] = BLOG_POSTS.map(post => ({
      id: randomUUID(),
      slug: post.slug,
      title: post.title,
      seoTitle: post.seoTitle ?? null,
      metaDescription: post.metaDescription ?? null,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      category: post.category,
      tags: post.tags,
      faqs: post.faqs ?? [],
      publishedAt: new Date(post.publishedAt),
      createdAt: new Date(),
    }));

    blogPostsFromContent.forEach(post => this.blogPosts.set(post.id, post));
    
    // Seed test users for development (hardcoded IDs match frontend)
    const testUsers: User[] = [
      {
        id: "admin-temp-id",
        email: "hello@boiseremodeling.co",
        firstName: "Admin",
        lastName: "User",
        phone: null,
        role: "admin",
        company: null,
        licenseNumber: null,
        insuranceExpiry: null,
        profileImageUrl: null,
        agreementAccepted: false,
        agreementAcceptedAt: null,
        agreementSignature: null,
        agreementSignatureIp: null,
        agreementSignatureUserAgent: null,
        agreementVersion: null,
        creditBalance: "0",
        notificationPreferences: null,
        complianceNotificationsEnabled: true,
        complianceStatus: "non_compliant",
        stripeCustomerId: null,
        watchedLeads: [],
        declinedLeads: [],
        emailNotificationsEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "sub-temp-id",
        email: "contractor@example.com",
        firstName: "Test",
        lastName: "Subcontractor",
        phone: null,
        role: "subcontractor",
        company: null,
        licenseNumber: null,
        insuranceExpiry: null,
        profileImageUrl: null,
        agreementAccepted: true,
        agreementAcceptedAt: new Date(),
        agreementSignature: null,
        agreementSignatureIp: null,
        agreementSignatureUserAgent: null,
        agreementVersion: null,
        creditBalance: "0",
        notificationPreferences: null,
        complianceNotificationsEnabled: true,
        complianceStatus: "non_compliant",
        stripeCustomerId: null,
        watchedLeads: [],
        declinedLeads: [],
        emailNotificationsEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    testUsers.forEach(user => this.users.set(user.id, user));
  }

  // Quote methods
  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const id = randomUUID();
    const quote: Quote = {
      id,
      name: insertQuote.name,
      email: insertQuote.email,
      phone: insertQuote.phone,
      address: insertQuote.address ?? null,
      city: insertQuote.city,
      propertyProfile: insertQuote.propertyProfile ?? null,
      propertyType: insertQuote.propertyType,
      propertySize: insertQuote.propertySize ?? null,
      serviceType: insertQuote.serviceType,
      frequency: insertQuote.frequency ?? null,
      selectedServices: insertQuote.selectedServices ?? null,
      serviceData: insertQuote.serviceData ?? null,
      aiAnalysis: insertQuote.aiAnalysis ?? null,
      complexityScore: insertQuote.complexityScore ?? null,
      baseCost: insertQuote.baseCost ?? null,
      adjustedCost: insertQuote.adjustedCost ?? null,
      finalQuote: insertQuote.finalQuote ?? null,
      lineItems: insertQuote.lineItems ?? null,
      status: insertQuote.status ?? "pending",
      acceptedAt: null,
      scheduledDate: insertQuote.scheduledDate ?? null,
      message: insertQuote.message ?? null,
      createdAt: new Date(),
    };
    this.quotes.set(id, quote);
    return quote;
  }

  async getAllQuotes(): Promise<Quote[]> {
    return Array.from(this.quotes.values());
  }

  async getQuoteById(id: string): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }

  // Gallery photo methods
  async createGalleryPhoto(insertPhoto: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const id = randomUUID();
    const photo: GalleryPhoto = {
      ...insertPhoto,
      description: insertPhoto.description ?? null,
      id,
      createdAt: new Date(),
    };
    this.galleryPhotos.set(id, photo);
    return photo;
  }

  async getAllGalleryPhotos(): Promise<GalleryPhoto[]> {
    return Array.from(this.galleryPhotos.values());
  }

  async getGalleryPhotosByService(serviceType: string): Promise<GalleryPhoto[]> {
    return Array.from(this.galleryPhotos.values()).filter(
      photo => photo.serviceType === serviceType
    );
  }

  // Testimonial methods
  async createTestimonial(insertTestimonial: InsertTestimonial): Promise<Testimonial> {
    const id = randomUUID();
    const testimonial: Testimonial = {
      ...insertTestimonial,
      id,
      createdAt: new Date(),
    };
    this.testimonials.set(id, testimonial);
    return testimonial;
  }

  async getAllTestimonials(): Promise<Testimonial[]> {
    return Array.from(this.testimonials.values());
  }

  async getTestimonialsByService(serviceType: string): Promise<Testimonial[]> {
    return Array.from(this.testimonials.values()).filter(
      t => t.serviceType === serviceType
    );
  }

  // Blog post methods
  async createBlogPost(insertPost: InsertBlogPost): Promise<BlogPost> {
    // Check for slug uniqueness
    const existing = Array.from(this.blogPosts.values()).find(
      post => post.slug === insertPost.slug
    );
    if (existing) {
      throw new Error(`Blog post with slug "${insertPost.slug}" already exists`);
    }

    const id = randomUUID();
    const faqsData = (insertPost.faqs ?? []) as Array<{ question: string; answer: string }>;
    const post: BlogPost = {
      id,
      slug: insertPost.slug,
      title: insertPost.title,
      seoTitle: insertPost.seoTitle ?? null,
      metaDescription: insertPost.metaDescription ?? null,
      excerpt: insertPost.excerpt,
      content: insertPost.content,
      author: insertPost.author,
      category: insertPost.category,
      tags: insertPost.tags,
      faqs: faqsData,
      publishedAt: insertPost.publishedAt,
      createdAt: new Date(),
    };
    this.blogPosts.set(id, post);
    return post;
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values()).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    return Array.from(this.blogPosts.values()).find(
      post => post.slug === slug
    );
  }

  // User methods (Replit Auth compatible)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const id = userData.id || randomUUID();
    const existing = this.users.get(id);
    
    // Role comes from the shared allowlist (lib/adminAccess.ts), the same one
    // the OIDC login path uses, so the two cannot disagree.
    const role = userData.role ?? getDesignatedRole(userData.email);
    
    const user: User = {
      id,
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      phone: userData.phone ?? null,
      role: existing?.role ?? role,
      company: userData.company ?? null,
      licenseNumber: userData.licenseNumber ?? null,
      insuranceExpiry: userData.insuranceExpiry ?? null,
      agreementAccepted: userData.agreementAccepted ?? false,
      agreementAcceptedAt: userData.agreementAcceptedAt ?? null,
      agreementSignature: userData.agreementSignature ?? null,
      agreementSignatureIp: userData.agreementSignatureIp ?? null,
      agreementSignatureUserAgent: userData.agreementSignatureUserAgent ?? null,
      agreementVersion: userData.agreementVersion ?? null,
      creditBalance: userData.creditBalance ?? existing?.creditBalance ?? "0",
      notificationPreferences: userData.notificationPreferences ?? existing?.notificationPreferences ?? null,
      complianceNotificationsEnabled: userData.complianceNotificationsEnabled ?? existing?.complianceNotificationsEnabled ?? true,
      complianceStatus: userData.complianceStatus ?? existing?.complianceStatus ?? "non_compliant",
      stripeCustomerId: userData.stripeCustomerId ?? null,
      watchedLeads: (userData as any).watchedLeads ?? existing?.watchedLeads ?? [],
      declinedLeads: (userData as any).declinedLeads ?? existing?.declinedLeads ?? [],
      emailNotificationsEnabled:
        (userData as any).emailNotificationsEnabled ??
        (existing as any)?.emailNotificationsEnabled ??
        true,
      isActive: userData.isActive ?? true,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async getAllSubcontractors(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.role === "subcontractor" && u.isActive);
  }

  async getAllAdmins(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.role === "admin" && u.isActive);
  }

  // Lead methods
  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    
    // Ensure baseLeadPrice and currentLeadPrice are set
    const baseLeadPrice = insertLead.baseLeadPrice || "0";
    const currentLeadPrice = insertLead.currentLeadPrice || baseLeadPrice;
    
    const lead: Lead = {
      ...insertLead,
      quoteId: insertLead.quoteId ?? null,
      address: insertLead.address ?? null,
      propertyProfile: insertLead.propertyProfile ?? null,
      selectedServices: insertLead.selectedServices ?? null,
      frequency: insertLead.frequency ?? null,
      finalQuote: insertLead.finalQuote ?? null,
      lineItems: insertLead.lineItems ?? null,
      serviceData: insertLead.serviceData ?? null,
      message: insertLead.message ?? null,
      notes: (insertLead as any).notes ?? null,
      priority: (insertLead as any).priority ?? "normal",
      tags: (insertLead as any).tags ?? [],
      baseLeadPrice,
      currentLeadPrice,
      status: insertLead.status ?? "pending_admin",
      priceReductionRate: insertLead.priceReductionRate ?? "1.50",
      adminDeclined: insertLead.adminDeclined ?? false,
      lastPriceUpdate: new Date(),
      adminReviewedBy: insertLead.adminReviewedBy ?? null,
      adminReviewedAt: null,
      purchasedBy: insertLead.purchasedBy ?? null,
      purchasedAt: null,
      purchasePrice: insertLead.purchasePrice ?? null,
      stripePaymentIntentId: insertLead.stripePaymentIntentId ?? null,
      addressMissingHouseNumber: insertLead.addressMissingHouseNumber ?? false,
      projectId: insertLead.projectId ?? null,
      convertedToProjectAt: insertLead.convertedToProjectAt ?? null,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.leads.set(id, lead);
    return lead;
  }

  async getAllLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return Array.from(this.leads.values())
      .filter(lead => lead.status === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getLeadsForSubcontractor(filters?: { city?: string; serviceType?: string; maxPrice?: number }): Promise<Lead[]> {
    let leads = Array.from(this.leads.values()).filter(lead => lead.status === "available");

    if (filters?.city) {
      leads = leads.filter(lead => lead.city.toLowerCase() === filters.city!.toLowerCase());
    }

    if (filters?.serviceType) {
      leads = leads.filter(lead => 
        lead.serviceType.toLowerCase().includes(filters.serviceType!.toLowerCase()) ||
        lead.selectedServices?.some(s => s.toLowerCase().includes(filters.serviceType!.toLowerCase()))
      );
    }

    if (filters?.maxPrice) {
      leads = leads.filter(lead => {
        const price = parseFloat(lead.currentLeadPrice as string);
        return !isNaN(price) && price <= filters.maxPrice!;
      });
    }

    return leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;

    const updated: Lead = {
      ...lead,
      ...data,
      updatedAt: new Date(),
    };
    this.leads.set(id, updated);
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    const lead = this.leads.get(id);
    if (!lead) return false;
    this.leads.delete(id);
    for (const [key, purchase] of this.leadPurchases.entries()) {
      if (purchase.leadId === id) this.leadPurchases.delete(key);
    }
    for (const [key, notif] of this.notifications.entries()) {
      if (notif.leadId === id) this.notifications.delete(key);
    }
    return true;
  }

  async updateLeadPrices(): Promise<void> {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const lead of Array.from(this.leads.values())) {
      if (lead.status === "available" && lead.lastPriceUpdate) {
        const hoursSinceUpdate = (now.getTime() - new Date(lead.lastPriceUpdate).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate >= 24) {
          const currentPrice = parseFloat(lead.currentLeadPrice as string);
          const basePrice = parseFloat(lead.baseLeadPrice as string);
          const ratePercent = Math.max(0, parseFloat((lead.priceReductionRate as any) || "1.50"));
          const dailyFactor = Math.max(0, Math.min(1, 1 - ratePercent / 100));
          const minPrice = basePrice * 0.2;
          const daysSinceUpdate = Math.floor((now.getTime() - new Date(lead.lastPriceUpdate).getTime()) / oneDayMs);
          const raw = currentPrice * Math.pow(dailyFactor, daysSinceUpdate);
          const floored = Math.max(raw, minPrice);
          const minRoundedFloor = Math.max(10, Math.ceil(minPrice));
          const finalPrice = Math.max(Math.floor(floored), minRoundedFloor);

          await this.updateLead(lead.id, {
            currentLeadPrice: finalPrice.toFixed(2),
            lastPriceUpdate: now,
          });
        }
      }
    }
  }

  async acceptLead(leadId: string, adminUserId: string): Promise<Lead | undefined> {
    const lead = this.leads.get(leadId);
    if (!lead || lead.status !== "pending_admin") return undefined;

    return await this.updateLead(leadId, {
      status: "accepted",
      adminReviewedBy: adminUserId,
      adminReviewedAt: new Date(),
      adminDeclined: false,
    });
  }

  async declineLead(leadId: string, adminUserId: string): Promise<Lead | undefined> {
    const lead = this.leads.get(leadId);
    if (!lead || lead.status !== "pending_admin") return undefined;

    return await this.updateLead(leadId, {
      status: "available",
      adminReviewedBy: adminUserId,
      adminReviewedAt: new Date(),
      adminDeclined: true,
      // Start price decay clock when the lead becomes available
      lastPriceUpdate: new Date(),
    });
  }

  // Lead Purchase methods
  async createLeadPurchase(insertPurchase: InsertLeadPurchase): Promise<LeadPurchase> {
    const id = randomUUID();
    const purchase: LeadPurchase = {
      ...insertPurchase,
      creditsUsed: insertPurchase.creditsUsed ?? "0",
      stripeChargeId: insertPurchase.stripeChargeId ?? null,
      refunded: insertPurchase.refunded ?? false,
      refundReason: insertPurchase.refundReason ?? null,
      refundedAt: null,
      id,
      createdAt: new Date(),
    };
    this.leadPurchases.set(id, purchase);
    return purchase;
  }

  async getLeadPurchasesByUser(userId: string): Promise<LeadPurchase[]> {
    return Array.from(this.leadPurchases.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getLeadPurchaseByLead(leadId: string): Promise<LeadPurchase | undefined> {
    return Array.from(this.leadPurchases.values()).find(p => p.leadId === leadId);
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...insertNotification,
      projectId: insertNotification.projectId ?? null,
      contractId: insertNotification.contractId ?? null,
      complianceDocumentId: insertNotification.complianceDocumentId ?? null,
      leadId: insertNotification.leadId ?? null,
      read: insertNotification.read ?? false,
      emailSent: insertNotification.emailSent ?? false,
      emailSentAt: null,
      id,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markNotificationRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.set(id, {
        ...notification,
        read: true,
      });
    }
  }

  async markNotificationEmailSent(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.set(id, {
        ...notification,
        emailSent: true,
        emailSentAt: new Date(),
      });
    }
  }

  // Alias methods for API consistency
  async getLeadPurchaseByLeadId(leadId: string): Promise<LeadPurchase | undefined> {
    return this.getLeadPurchaseByLead(leadId);
  }

  async getLeadPurchaseByPaymentIntentId(paymentIntentId: string): Promise<LeadPurchase | undefined> {
    const purchases = Array.from(this.leadPurchases.values());
    return purchases.find(p => p.stripePaymentIntentId === paymentIntentId);
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return this.getNotificationsByUser(userId);
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    await this.markNotificationRead(id);
    return this.notifications.get(id);
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        count++;
      }
    }
    return count;
  }
}

// DBStorage class - Implements IStorage using PostgreSQL with Drizzle ORM
export class DBStorage implements IStorage {
  private seedPromise: Promise<void> | null = null;

  constructor() {
    // Start seeding in background
    this.seedPromise = this.seedDataIfEmpty();
  }

  private async seedDataIfEmpty(): Promise<void> {
    try {
      // Check if gallery photos table is empty
      const existingPhotos = await db.select().from(galleryPhotos).limit(1);
      if (existingPhotos.length === 0) {
        await this.seedGalleryPhotos();
      }

      // Check if testimonials table is empty
      const existingTestimonials = await db.select().from(testimonials).limit(1);
      if (existingTestimonials.length === 0) {
        await this.seedTestimonials();
      }

      // Sync blog posts from blogContent.ts (adds any new posts that don't exist)
      await this.syncBlogPosts();

      // Check if users table is empty (seed test users)
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length === 0) {
        await this.seedTestUsers();
      }
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  }

  private async seedGalleryPhotos(): Promise<void> {
    const sampleGalleryPhotos = [
      {
        serviceType: 'kitchen-remodel',
        city: 'boise',
        beforeImageUrl: '/images/gallery/gallery-kitchen-before.png',
        afterImageUrl: '/images/gallery/gallery-kitchen-after.png',
        title: 'Modern Kitchen Transformation',
        description: 'Full kitchen remodel with custom cabinets, quartz countertops, and new layout in Boise',
        createdAt: new Date(),
      },
      {
        serviceType: 'bathroom-remodel',
        city: 'meridian',
        beforeImageUrl: '/images/gallery/gallery-bathroom-before.png',
        afterImageUrl: '/images/gallery/gallery-bathroom-after.png',
        title: 'Primary Bathroom Renovation',
        description: 'Luxury primary bathroom remodel with walk-in shower, freestanding tub, and heated floors in Meridian',
        createdAt: new Date(),
      },
      {
        serviceType: 'whole-home-remodel',
        city: 'eagle',
        beforeImageUrl: '/images/gallery/gallery-whole-home-before.png',
        afterImageUrl: '/images/gallery/gallery-whole-home-after.png',
        title: 'Whole-Home Remodel',
        description: 'Complete interior renovation of a 1990s Eagle home with open floor plan, new kitchen, and three updated bathrooms',
        createdAt: new Date(),
      },
      {
        serviceType: 'room-addition',
        city: 'nampa',
        beforeImageUrl: '/images/gallery/gallery-addition-before.png',
        afterImageUrl: '/images/gallery/gallery-addition-after.png',
        title: 'Master Suite Addition',
        description: '600 sq ft master suite addition with ensuite bath and walk-in closet in Nampa',
        createdAt: new Date(),
      },
      {
        serviceType: 'basement-finish',
        city: 'boise',
        beforeImageUrl: '/images/gallery/gallery-basement-before.png',
        afterImageUrl: '/images/gallery/gallery-basement-after.png',
        title: 'Basement Finish',
        description: 'Unfinished basement transformed into a family room, home office, and full bath in Boise',
        createdAt: new Date(),
      },
      {
        serviceType: 'outdoor-living',
        city: 'star',
        beforeImageUrl: '/images/gallery/gallery-outdoor-before.png',
        afterImageUrl: '/images/gallery/gallery-outdoor-after.png',
        title: 'Outdoor Living Space',
        description: 'Covered patio with outdoor kitchen and pergola for year-round entertaining in Star',
        createdAt: new Date(),
      },
    ];

    for (const photo of sampleGalleryPhotos) {
      await db.insert(galleryPhotos).values(photo);
    }
  }

  private async seedTestimonials(): Promise<void> {
    // No-op. There are no real customer reviews yet, and this previously
    // wrote four fabricated ones (fake names, fake quotes) straight into the
    // production testimonials table on first run whenever that table was
    // empty. Do not fabricate reviews - wire this up once real ones exist.
  }

  private async syncBlogPosts(): Promise<void> {
    // Get existing slugs from database
    const existingPosts = await db.select({ slug: blogPosts.slug }).from(blogPosts);
    const existingSlugs = new Set(existingPosts.map(p => p.slug));
    
    // Add any new posts that don't exist in the database
    let addedCount = 0;
    for (const post of BLOG_POSTS) {
      if (!existingSlugs.has(post.slug)) {
        const inserted = await db
          .insert(blogPosts)
          .values({
            slug: post.slug,
            title: post.title,
            seoTitle: post.seoTitle ?? null,
            metaDescription: post.metaDescription ?? null,
            excerpt: post.excerpt,
            content: post.content,
            author: post.author,
            category: post.category,
            tags: post.tags,
            faqs: post.faqs ?? [],
            publishedAt: new Date(post.publishedAt),
            createdAt: new Date(),
          })
          .onConflictDoNothing({ target: blogPosts.slug })
          .returning({ slug: blogPosts.slug });
        existingSlugs.add(post.slug);
        if (inserted.length > 0) addedCount++;
      }
    }
    
    if (addedCount > 0) {
      console.log(`[Blog Sync] Added ${addedCount} new blog posts to database (total: ${BLOG_POSTS.length})`);
    }
  }

  private async seedBlogPosts(): Promise<void> {
    for (const post of BLOG_POSTS) {
      await db.insert(blogPosts).values({
        slug: post.slug,
        title: post.title,
        seoTitle: post.seoTitle ?? null,
        metaDescription: post.metaDescription ?? null,
        excerpt: post.excerpt,
        content: post.content,
        author: post.author,
        category: post.category,
        tags: post.tags,
        faqs: post.faqs ?? [],
        publishedAt: new Date(post.publishedAt),
        createdAt: new Date(),
      });
    }
  }

  private async seedTestUsers(): Promise<void> {
    const testUsers = [
      {
        id: "admin-temp-id",
        email: "hello@boiseremodeling.co",
        firstName: "Admin",
        lastName: "User",
        phone: null,
        role: "admin",
        company: null,
        licenseNumber: null,
        insuranceExpiry: null,
        profileImageUrl: null,
        agreementAccepted: false,
        agreementAcceptedAt: null,
        stripeCustomerId: null,
        emailNotificationsEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "sub-temp-id",
        email: "contractor@example.com",
        firstName: "Test",
        lastName: "Subcontractor",
        phone: null,
        role: "subcontractor",
        company: null,
        licenseNumber: null,
        insuranceExpiry: null,
        profileImageUrl: null,
        agreementAccepted: true,
        agreementAcceptedAt: new Date(),
        stripeCustomerId: null,
        emailNotificationsEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const user of testUsers) {
      await db.insert(users).values(user);
    }
  }

  // Quote methods
  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const result = await db.insert(quotes).values({
      name: insertQuote.name,
      email: insertQuote.email,
      phone: insertQuote.phone,
      address: insertQuote.address ?? null,
      city: insertQuote.city,
      propertyType: insertQuote.propertyType,
      propertySize: insertQuote.propertySize ?? null,
      serviceType: insertQuote.serviceType,
      frequency: insertQuote.frequency ?? null,
      selectedServices: insertQuote.selectedServices ?? null,
      serviceData: insertQuote.serviceData ?? null,
      aiAnalysis: insertQuote.aiAnalysis ?? null,
      complexityScore: insertQuote.complexityScore ?? null,
      baseCost: insertQuote.baseCost ?? null,
      adjustedCost: insertQuote.adjustedCost ?? null,
      finalQuote: insertQuote.finalQuote ?? null,
      lineItems: insertQuote.lineItems ?? null,
      status: insertQuote.status ?? "pending",
      scheduledDate: insertQuote.scheduledDate ?? null,
      message: insertQuote.message ?? null,
    }).returning();
    return result[0];
  }

  async getAllQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuoteById(id: string): Promise<Quote | undefined> {
    const result = await db.select().from(quotes).where(eq(quotes.id, id));
    return result[0];
  }

  // Gallery photo methods
  async createGalleryPhoto(insertPhoto: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const result = await db.insert(galleryPhotos).values({
      serviceType: insertPhoto.serviceType,
      city: insertPhoto.city,
      beforeImageUrl: insertPhoto.beforeImageUrl,
      afterImageUrl: insertPhoto.afterImageUrl,
      title: insertPhoto.title,
      description: insertPhoto.description ?? null,
    }).returning();
    return result[0];
  }

  async getAllGalleryPhotos(): Promise<GalleryPhoto[]> {
    return await db.select().from(galleryPhotos);
  }

  async getGalleryPhotosByService(serviceType: string): Promise<GalleryPhoto[]> {
    return await db.select().from(galleryPhotos).where(eq(galleryPhotos.serviceType, serviceType));
  }

  // Testimonial methods
  async createTestimonial(insertTestimonial: InsertTestimonial): Promise<Testimonial> {
    const result = await db.insert(testimonials).values({
      customerName: insertTestimonial.customerName,
      serviceType: insertTestimonial.serviceType,
      city: insertTestimonial.city,
      rating: insertTestimonial.rating,
      testimonial: insertTestimonial.testimonial,
    }).returning();
    return result[0];
  }

  async getAllTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials);
  }

  async getTestimonialsByService(serviceType: string): Promise<Testimonial[]> {
    return await db.select().from(testimonials).where(eq(testimonials.serviceType, serviceType));
  }

  // Blog post methods
  async createBlogPost(insertPost: InsertBlogPost): Promise<BlogPost> {
    const faqsData = (insertPost.faqs ?? []) as Array<{ question: string; answer: string }>;
    const result = await db.insert(blogPosts).values({
      slug: insertPost.slug,
      title: insertPost.title,
      seoTitle: insertPost.seoTitle ?? null,
      metaDescription: insertPost.metaDescription ?? null,
      excerpt: insertPost.excerpt,
      content: insertPost.content,
      author: insertPost.author,
      category: insertPost.category,
      tags: insertPost.tags,
      faqs: faqsData,
      publishedAt: insertPost.publishedAt,
    }).returning();
    return result[0];
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt));
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return result[0];
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const id = userData.id || randomUUID();
    const existing = await this.getUser(id);
    
    // Role comes from the shared allowlist (lib/adminAccess.ts), the same one
    // the OIDC login path uses, so the two cannot disagree.
    const defaultRole = getDesignatedRole(userData.email);

    if (existing) {
      // Update existing user - preserve existing role, or use admin if in admin list and no explicit role
      const newRole = userData.role ?? existing.role ?? defaultRole;
      const result = await db.update(users).set({
        email: userData.email ?? existing.email,
        firstName: userData.firstName ?? existing.firstName,
        lastName: userData.lastName ?? existing.lastName,
        profileImageUrl: userData.profileImageUrl ?? existing.profileImageUrl,
        phone: userData.phone ?? existing.phone,
        role: newRole,
        company: userData.company ?? existing.company,
        licenseNumber: userData.licenseNumber ?? existing.licenseNumber,
        insuranceExpiry: userData.insuranceExpiry ?? existing.insuranceExpiry,
        agreementAccepted: userData.agreementAccepted ?? existing.agreementAccepted,
        agreementAcceptedAt: userData.agreementAcceptedAt ?? existing.agreementAcceptedAt,
        agreementSignature: userData.agreementSignature ?? existing.agreementSignature,
        agreementSignatureIp: userData.agreementSignatureIp ?? existing.agreementSignatureIp,
        agreementSignatureUserAgent: userData.agreementSignatureUserAgent ?? existing.agreementSignatureUserAgent,
        agreementVersion: userData.agreementVersion ?? existing.agreementVersion,
        stripeCustomerId: userData.stripeCustomerId ?? existing.stripeCustomerId,
        emailNotificationsEnabled:
          (userData as any).emailNotificationsEnabled ?? (existing as any).emailNotificationsEnabled ?? true,
        isActive: userData.isActive ?? existing.isActive,
        updatedAt: new Date(),
      }).where(eq(users.id, id)).returning();
      return result[0];
    } else {
      // Insert new user
      const result = await db.insert(users).values({
        id,
        email: userData.email ?? null,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        phone: userData.phone ?? null,
        role: userData.role ?? defaultRole,
        company: userData.company ?? null,
        licenseNumber: userData.licenseNumber ?? null,
        insuranceExpiry: userData.insuranceExpiry ?? null,
        agreementAccepted: userData.agreementAccepted ?? false,
        agreementAcceptedAt: userData.agreementAcceptedAt ?? null,
        agreementSignature: userData.agreementSignature ?? null,
        agreementSignatureIp: userData.agreementSignatureIp ?? null,
        agreementSignatureUserAgent: userData.agreementSignatureUserAgent ?? null,
        agreementVersion: userData.agreementVersion ?? null,
        stripeCustomerId: userData.stripeCustomerId ?? null,
        emailNotificationsEnabled: (userData as any).emailNotificationsEnabled ?? true,
        isActive: userData.isActive ?? true,
      }).returning();
      return result[0];
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllSubcontractors(): Promise<User[]> {
    return await db.select().from(users).where(
      and(eq(users.role, "subcontractor"), eq(users.isActive, true))
    );
  }

  async getAllAdmins(): Promise<User[]> {
    return await db.select().from(users).where(
      and(eq(users.role, "admin"), eq(users.isActive, true))
    );
  }

  // Lead methods
  async createLead(insertLead: InsertLead): Promise<Lead> {
    const baseLeadPrice = insertLead.baseLeadPrice || "0";
    const currentLeadPrice = insertLead.currentLeadPrice || baseLeadPrice;

    const result = await db.insert(leads).values({
      quoteId: insertLead.quoteId ?? null,
      name: insertLead.name,
      email: insertLead.email,
      phone: insertLead.phone,
      address: insertLead.address ?? null,
      city: insertLead.city,
      propertyType: insertLead.propertyType,
      serviceType: insertLead.serviceType,
      selectedServices: insertLead.selectedServices ?? null,
      frequency: insertLead.frequency ?? null,
      finalQuote: insertLead.finalQuote ?? null,
      lineItems: insertLead.lineItems ?? null,
      serviceData: insertLead.serviceData ?? null,
      message: insertLead.message ?? null,
      baseLeadPrice,
      currentLeadPrice,
      priceReductionRate: insertLead.priceReductionRate ?? "1.50",
      status: insertLead.status ?? "pending_admin",
      adminReviewedBy: insertLead.adminReviewedBy ?? null,
      adminDeclined: insertLead.adminDeclined ?? false,
      purchasedBy: insertLead.purchasedBy ?? null,
      purchasePrice: insertLead.purchasePrice ?? null,
      stripePaymentIntentId: insertLead.stripePaymentIntentId ?? null,
    }).returning();
    return result[0];
  }

  async getAllLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const result = await db.select().from(leads).where(eq(leads.id, id));
    return result[0];
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.status, status)).orderBy(desc(leads.createdAt));
  }

  async getLeadsForSubcontractor(filters?: { city?: string; serviceType?: string; maxPrice?: number }): Promise<Lead[]> {
    let result = await db.select().from(leads).where(eq(leads.status, "available")).orderBy(desc(leads.createdAt));

    // Apply filters in JS (more complex SQL filters could be done with drizzle-orm builders)
    if (filters?.city) {
      result = result.filter(lead => lead.city.toLowerCase() === filters.city!.toLowerCase());
    }

    if (filters?.serviceType) {
      result = result.filter(lead => 
        lead.serviceType.toLowerCase().includes(filters.serviceType!.toLowerCase()) ||
        lead.selectedServices?.some(s => s.toLowerCase().includes(filters.serviceType!.toLowerCase()))
      );
    }

    if (filters?.maxPrice) {
      result = result.filter(lead => {
        const price = parseFloat(lead.currentLeadPrice as string);
        return !isNaN(price) && price <= filters.maxPrice!;
      });
    }

    return result;
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined> {
    const result = await db.update(leads).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(leads.id, id)).returning();
    return result[0];
  }

  async deleteLead(id: string): Promise<boolean> {
    const lead = await this.getLeadById(id);
    if (!lead) return false;
    await db.delete(notifications).where(eq(notifications.leadId, id));
    await db.delete(leadPurchases).where(eq(leadPurchases.leadId, id));
    await db.delete(leads).where(eq(leads.id, id));
    return true;
  }

  async updateLeadPrices(): Promise<void> {
    const now = new Date();
    const availableLeads = await db.select().from(leads).where(eq(leads.status, "available"));

    for (const lead of availableLeads) {
      if (lead.lastPriceUpdate) {
        const hoursSinceUpdate = (now.getTime() - new Date(lead.lastPriceUpdate).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate >= 24) {
          const currentPrice = parseFloat(lead.currentLeadPrice as string);
          const basePrice = parseFloat(lead.baseLeadPrice as string);
          const ratePercent = Math.max(0, parseFloat((lead.priceReductionRate as any) || "1.50"));
          const dailyFactor = Math.max(0, Math.min(1, 1 - ratePercent / 100));
          const minPrice = basePrice * 0.2;
          const daysSinceUpdate = Math.floor((now.getTime() - new Date(lead.lastPriceUpdate).getTime()) / (1000 * 60 * 60 * 24));
          const raw = currentPrice * Math.pow(dailyFactor, daysSinceUpdate);
          const floored = Math.max(raw, minPrice);
          const minRoundedFloor = Math.max(10, Math.ceil(minPrice));
          const finalPrice = Math.max(Math.floor(floored), minRoundedFloor);

          await db.update(leads).set({
            currentLeadPrice: finalPrice.toFixed(2),
            lastPriceUpdate: now,
            updatedAt: now,
          }).where(eq(leads.id, lead.id));
        }
      }
    }
  }

  async acceptLead(leadId: string, adminUserId: string): Promise<Lead | undefined> {
    const lead = await this.getLeadById(leadId);
    if (!lead || lead.status !== "pending_admin") return undefined;

    return await this.updateLead(leadId, {
      status: "accepted",
      adminReviewedBy: adminUserId,
      adminReviewedAt: new Date(),
      adminDeclined: false,
    });
  }

  async declineLead(leadId: string, adminUserId: string): Promise<Lead | undefined> {
    const lead = await this.getLeadById(leadId);
    if (!lead || lead.status !== "pending_admin") return undefined;

    return await this.updateLead(leadId, {
      status: "available",
      adminReviewedBy: adminUserId,
      adminReviewedAt: new Date(),
      adminDeclined: true,
      // Start price decay clock when the lead becomes available
      lastPriceUpdate: new Date(),
    });
  }

  // Lead Purchase methods
  async createLeadPurchase(insertPurchase: InsertLeadPurchase): Promise<LeadPurchase> {
    const result = await db.insert(leadPurchases).values({
      leadId: insertPurchase.leadId,
      userId: insertPurchase.userId,
      purchasePrice: insertPurchase.purchasePrice,
      stripePaymentIntentId: insertPurchase.stripePaymentIntentId,
      stripeChargeId: insertPurchase.stripeChargeId ?? null,
      refunded: insertPurchase.refunded ?? false,
      refundReason: insertPurchase.refundReason ?? null,
    }).returning();
    return result[0];
  }

  async getLeadPurchasesByUser(userId: string): Promise<LeadPurchase[]> {
    return await db.select().from(leadPurchases).where(eq(leadPurchases.userId, userId)).orderBy(desc(leadPurchases.createdAt));
  }

  async getLeadPurchaseByLead(leadId: string): Promise<LeadPurchase | undefined> {
    const result = await db.select().from(leadPurchases).where(eq(leadPurchases.leadId, leadId));
    return result[0];
  }

  async getLeadPurchaseByLeadId(leadId: string): Promise<LeadPurchase | undefined> {
    return this.getLeadPurchaseByLead(leadId);
  }

  async getLeadPurchaseByPaymentIntentId(paymentIntentId: string): Promise<LeadPurchase | undefined> {
    const result = await db.select().from(leadPurchases).where(eq(leadPurchases.stripePaymentIntentId, paymentIntentId));
    return result[0];
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values({
      userId: insertNotification.userId,
      type: insertNotification.type,
      title: insertNotification.title,
      message: insertNotification.message,
      leadId: insertNotification.leadId ?? null,
      read: insertNotification.read ?? false,
      emailSent: insertNotification.emailSent ?? false,
    }).returning();
    return result[0];
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return this.getNotificationsByUser(userId);
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const result = await db.update(notifications).set({ read: true }).where(eq(notifications.id, id)).returning();
    return result[0];
  }

  async markNotificationEmailSent(id: string): Promise<void> {
    await db.update(notifications).set({
      emailSent: true,
      emailSentAt: new Date(),
    }).where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      .returning();
    return result.length;
  }
}

// Prefer database storage when configured; otherwise use in-memory storage (dev-only convenience).
export const storage: IStorage = process.env.DATABASE_URL ? new DBStorage() : new MemStorage();
