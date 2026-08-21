"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AdminAnalyticsPanel } from "@/components/admin/AdminAnalyticsPanel";
import { AdminSubcontractorPanel } from "@/components/admin/AdminSubcontractorPanel";
import { NotificationsBell } from "@/components/NotificationsBell";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
  CheckCircle2, XCircle, Clock, DollarSign, MapPin, Phone, Mail, Building, 
  ChevronDown, ChevronUp, Receipt, AlertTriangle, Server, Hash, Search, Filter, X, 
  ArrowUpDown, MessageSquare, Plus, Tag, Flag, LogOut, Shield, ArrowLeftRight, Trash2,
  Pencil, Check, FolderKanban
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRouter, useSearchParams } from "next/navigation";
import { cleanDisplayAddress, hasLeadingHouseNumber, HOUSE_NUMBER_ERROR_MESSAGE } from "@/shared/addressValidation";
import { PropertyProfileEditor } from "@/components/admin/PropertyProfileEditor";
import type { PropertyProfile } from "@/shared/propertyProfile";

interface LineItem {
  serviceId?: string;
  service?: string;
  serviceName?: string;
  description?: string;
  price?: number;
  basePrice?: number;
  adjustedPrice?: number;
  calculationExplanation?: string;
  isRecurring?: boolean;
}

const RECURRING_ELIGIBLE_SERVICE_IDS = new Set<string>();

function isServiceRecurring(serviceId: string, frequency: string | null | undefined): boolean {
  if (!frequency || frequency === "one-time") return false;
  return RECURRING_ELIGIBLE_SERVICE_IDS.has(serviceId);
}

function formatFreqLabel(f: string): string {
  const map: Record<string, string> = { 'one-time': 'One-time', 'weekly': 'Weekly', 'bi-weekly': 'Bi-weekly', 'monthly': 'Monthly' };
  return map[f] || f;
}

function getLeadFrequencyDisplay(lead: { frequency?: string | null; selectedServices?: string[] | null; serviceData?: any }): string {
  const freq = lead.frequency || "one-time";
  const services = lead.selectedServices;
  if (!services || services.length === 0) {
    return formatFreqLabel(freq);
  }
  const svcData = lead.serviceData && typeof lead.serviceData === 'string'
    ? (() => { try { return JSON.parse(lead.serviceData); } catch { return {}; } })()
    : (lead.serviceData || {});

  const recurringCount = services.filter(sid => {
    if (!RECURRING_ELIGIBLE_SERVICE_IDS.has(sid)) return false;
    const svcFreq = svcData[sid]?.frequency || freq;
    return svcFreq !== "one-time";
  }).length;
  const totalCount = services.length;

  if (recurringCount === 0) return "One-time";
  if (recurringCount === totalCount) {
    const firstRecurringFreq = services
      .map(sid => svcData[sid]?.frequency || freq)
      .find(f => f !== "one-time") || freq;
    return formatFreqLabel(firstRecurringFreq);
  }
  return `Mixed (${recurringCount} recurring)`;
}

function getSeasonMultiplier(frequency: string | null | undefined): { multiplier: number; label: string } | null {
  if (!frequency || frequency === "one-time") return null;
  switch (frequency) {
    case "weekly": return { multiplier: 30, label: "30 weeks" };
    case "bi-weekly": return { multiplier: 15, label: "15 visits" };
    case "monthly": return { multiplier: 7, label: "7 months" };
    default: return null;
  }
}

interface ServiceDataEntry {
  propertySize?: number;
  linearFeet?: number;
  zones?: number;
  treeCount?: number;
  quantity?: number;
  frequency?: string;
  [key: string]: unknown;
}

interface Lead {
  id: string;
  quoteId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city: string;
  propertyType: string;
  serviceType: string;
  selectedServices?: string[] | null;
  frequency?: string | null;
  finalQuote?: string | null;
  lineItems?: LineItem[] | null;
  serviceData?: Record<string, ServiceDataEntry> | null;
  message?: string | null;
  baseLeadPrice?: string | null;
  currentLeadPrice?: string | null;
  status: string;
  priority?: string | null;
  tags?: string[] | null;
  notes?: Array<{text: string; addedBy: string; addedAt: string}> | null;
  createdAt: string;
  updatedAt?: string | null;
  purchasedBy?: string | null;
  purchasedAt?: string | null;
  addressMissingHouseNumber?: boolean | null;
  projectId?: string | null;
  convertedToProjectAt?: string | null;
  propertyProfile?: PropertyProfile | null;
  possibleDuplicates?: Array<{
    id: string;
    status: string;
    createdAt: string;
    matchedOn: ("email" | "address")[];
  }>;
}

// Priority services data for service names
const PRIORITY_SERVICES = [
  { slug: "kitchen-remodel", name: "Kitchen Remodel" },
  { slug: "bathroom-remodel", name: "Bathroom Remodel" },
  { slug: "whole-home-remodel", name: "Whole-Home Remodel" },
  { slug: "room-addition", name: "Room Addition" },
  { slug: "basement-finish", name: "Basement Finish" },
  { slug: "outdoor-living", name: "Outdoor Living" },
];

function formatMeasurement(serviceId: string, data: ServiceDataEntry | undefined): string {
  if (!data) return '';
  
  const parts: string[] = [];
  
  if (data.propertySize) {
    parts.push(`${data.propertySize.toLocaleString()} sq ft`);
  }
  if (data.linearFeet) {
    parts.push(`${data.linearFeet.toLocaleString()} linear ft`);
  }
  if (data.zones) {
    parts.push(`${data.zones} zone${data.zones > 1 ? 's' : ''}`);
  }
  if (data.treeCount) {
    parts.push(`${data.treeCount} tree${data.treeCount > 1 ? 's' : ''}`);
  }
  if (data.quantity) {
    parts.push(`${data.quantity} unit${data.quantity > 1 ? 's' : ''}`);
  }
  
  return parts.join(', ');
}

function calculateQuoteRange(finalQuote: string | number, variance: number = 0.15) {
  const point = typeof finalQuote === 'string' ? parseFloat(finalQuote) : finalQuote;
  if (!point || isNaN(point)) return { min: 0, max: 0, point: 0 };
  const min = Math.round(point * (1 - variance));
  const max = Math.round(point * (1 + variance));
  return { min, max, point };
}

function formatQuoteRangeWholeFromValue(value: string | number, variance: number = 0.15): string {
  const { min, max } = calculateQuoteRange(value, variance);
  if (min === 0 && max === 0) return "Pending";
  return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
}

function useEnvironment() {
  return useMemo(() => {
    if (typeof window === 'undefined') return { isProduction: false, environmentLabel: 'Development', hostname: '' };
    const hostname = window.location.hostname;
    const isProduction = hostname === 'boiseremodeling.co' || hostname === 'www.boiseremodeling.co';
    return {
      isProduction,
      environmentLabel: isProduction ? 'Production' : 'Development',
      hostname
    };
  }, []);
}

function QuoteBreakdownSection({ lead }: { lead: Lead }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const lineItems = lead.lineItems || [];
  const serviceData = lead.serviceData || {};
  const hasBreakdown = lineItems.length > 0 || Object.keys(serviceData).length > 0;
  
  if (!hasBreakdown && !lead.finalQuote) {
    return null;
  }
  
  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return '$0';
    return `$${price.toLocaleString()}`;
  };

  const seasonInfo = getSeasonMultiplier(lead.frequency);
  const hasAnyRecurring = lineItems.some(item => {
    const sid = item.serviceId || item.service || "";
    return item.isRecurring || isServiceRecurring(sid, lead.frequency);
  });

  const recurringTotal = lineItems.reduce((sum, item) => {
    const sid = item.serviceId || item.service || "";
    const recurring = item.isRecurring ?? isServiceRecurring(sid, lead.frequency);
    return sum + (recurring ? (item.price || item.adjustedPrice || 0) : 0);
  }, 0);
  const oneTimeTotal = lineItems.reduce((sum, item) => {
    const sid = item.serviceId || item.service || "";
    const recurring = item.isRecurring ?? isServiceRecurring(sid, lead.frequency);
    return sum + (!recurring ? (item.price || item.adjustedPrice || 0) : 0);
  }, 0);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-t pt-2">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between p-0 h-auto font-medium text-xs hover:bg-transparent"
            data-testid={`button-toggle-breakdown-${lead.id}`}
          >
            <span className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
              Quote Breakdown
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-2" data-testid={`section-breakdown-${lead.id}`}>
          {lineItems.length > 0 ? (
            <div className="space-y-1.5">
              {lineItems.map((item, index) => {
                const serviceId = item.serviceId || item.service || '';
                const serviceName = item.serviceName || item.service || 'Service';
                const price = item.price || item.adjustedPrice || 0;
                const measurement = serviceData[serviceId] ? formatMeasurement(serviceId, serviceData[serviceId]) : '';
                const svcFreq = serviceData[serviceId]?.frequency || lead.frequency || "one-time";
                const recurring = item.isRecurring ?? isServiceRecurring(serviceId, svcFreq);
                
                return (
                  <div 
                    key={index} 
                    className="bg-muted/50 rounded-md px-2 py-1.5"
                    data-testid={`lineitem-${lead.id}-${index}`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="font-medium text-xs" data-testid={`text-service-name-${lead.id}-${index}`}>
                          {serviceName}
                        </span>
                        {(svcFreq !== "one-time" || (lead.frequency && lead.frequency !== "one-time")) && (
                          <Badge variant={recurring ? "default" : "secondary"} className="text-caption px-1 py-0">
                            {recurring ? `Recurring (${formatFreqLabel(svcFreq)})` : "One-time"}
                          </Badge>
                        )}
                      </div>
                      <span className="font-semibold text-xs text-primary flex-shrink-0" data-testid={`text-service-price-${lead.id}-${index}`}>
                        {formatPrice(price)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-label text-muted-foreground mt-0.5" data-testid={`text-service-desc-${lead.id}-${index}`}>
                        {item.description}
                      </p>
                    )}
                    {measurement && (
                      <p className="text-label text-muted-foreground mt-0.5" data-testid={`text-service-measurement-${lead.id}-${index}`}>
                        Measurement: {measurement}
                      </p>
                    )}
                    {item.calculationExplanation && (
                      <p className="text-label text-muted-foreground/70 italic mt-1 pl-2 border-l-2 border-muted" data-testid={`text-service-explanation-${lead.id}-${index}`}>
                        {item.calculationExplanation}
                      </p>
                    )}
                  </div>
                );
              })}
              
              {lead.finalQuote && (
                <>
                  <div className="flex justify-between items-center pt-1.5 border-t">
                    <span className="font-semibold text-xs">
                      Total Estimate
                    </span>
                    <span className="font-bold text-sm text-primary" data-testid={`text-total-quote-${lead.id}`}>
                      {formatQuoteRangeWholeFromValue(lead.finalQuote, 0.15)}
                    </span>
                  </div>
                  {hasAnyRecurring && seasonInfo && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Est. seasonal value ({seasonInfo.label})</span>
                      <span className="font-semibold text-primary">
                        {formatQuoteRangeWholeFromValue(
                          (recurringTotal > 0 ? recurringTotal * seasonInfo.multiplier : parseFloat(lead.finalQuote) * seasonInfo.multiplier) + oneTimeTotal,
                          0.15
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {Object.keys(serviceData).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Measurements</p>
                  {Object.entries(serviceData).map(([svcId, data]) => (
                    <div key={svcId} className="bg-muted/50 rounded-md px-2 py-1 text-xs">
                      <span className="font-medium">{svcId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="text-muted-foreground ml-1.5">{formatMeasurement(svcId, data)}</span>
                    </div>
                  ))}
                </div>
              )}
              {lead.finalQuote && (
                <>
                  <div className="flex justify-between items-center pt-1.5 border-t">
                    <span className="font-semibold text-xs">
                      Total Estimate
                    </span>
                    <span className="font-bold text-sm text-primary" data-testid={`text-total-quote-${lead.id}`}>
                      {formatQuoteRangeWholeFromValue(lead.finalQuote, 0.15)}
                    </span>
                  </div>
                  {hasAnyRecurring && seasonInfo && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Est. seasonal value ({seasonInfo.label})</span>
                      <span className="font-semibold text-primary">
                        {formatQuoteRangeWholeFromValue(parseFloat(lead.finalQuote) * seasonInfo.multiplier, 0.15)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function AdminDashboardContent({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("leadId");
  const tabParam = searchParams.get("tab");
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "available" | "all" | "archived" | "subcontractors">(() => {
    if (tabParam === "pending" || tabParam === "accepted" || tabParam === "available" || tabParam === "all" || tabParam === "archived" || tabParam === "subcontractors") return tabParam;
    return "pending";
  });
  
  const { user, isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const environment = useEnvironment();

  // Route guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) {
      router.push("/admin");
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") ?? "");
  const [filterServiceType, setFilterServiceType] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterQuoteMin, setFilterQuoteMin] = useState<string>("");
  const [filterQuoteMax, setFilterQuoteMax] = useState<string>("");
  const [filterLeadAge, setFilterLeadAge] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "quote" | "leadPrice" | "age">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const { data: leads = [], isLoading, isError, refetch } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json();
    },
    enabled: isAuthenticated && isAdmin,
  });

  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) return {};
      return res.json();
    },
    enabled: isAuthenticated && isAdmin,
  });

  const autoRelease = siteSettings.auto_release_leads === "true";

  const toggleAutoReleaseMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "auto_release_leads", value: String(enabled) }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
  });

  // Deep-link support
  useEffect(() => {
    if (!leadIdParam) return;
    if (!leads || leads.length === 0) return;

    const lead = leads.find(l => l.id === leadIdParam);
    if (!lead) return;

    if (searchQuery) {
      setSearchQuery("");
      return;
    }

    const desiredTab: typeof activeTab =
      lead.status === "pending_admin"
        ? "pending"
        : lead.status === "accepted"
          ? "accepted"
          : lead.status === "available"
            ? "available"
            : lead.status === "purchased"
              ? "all"
              : lead.status === "archived"
                ? "archived"
                : "pending";

    if (activeTab !== desiredTab) {
      setActiveTab(desiredTab);
      return;
    }

    requestAnimationFrame(() => {
      const el = document.getElementById(`lead-${leadIdParam}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeTab, leadIdParam, leads, searchQuery]);
  
  // Filter and search leads
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query) ||
        lead.address?.toLowerCase().includes(query) ||
        lead.city?.toLowerCase().includes(query)
      );
    }
    
    if (filterServiceType !== "all") {
      filtered = filtered.filter(l => l.serviceType === filterServiceType);
    }
    
    if (filterCity !== "all") {
      filtered = filtered.filter(l => l.city.toLowerCase() === filterCity.toLowerCase());
    }
    
    if (filterQuoteMin) {
      const min = parseFloat(filterQuoteMin);
      if (!isNaN(min)) {
        filtered = filtered.filter(l => {
          if (!l.finalQuote) return false;
          const { max: quoteMax } = calculateQuoteRange(l.finalQuote, 0.15);
          return quoteMax >= min;
        });
      }
    }
    if (filterQuoteMax) {
      const max = parseFloat(filterQuoteMax);
      if (!isNaN(max)) {
        filtered = filtered.filter(l => {
          if (!l.finalQuote) return false;
          const { min: quoteMin } = calculateQuoteRange(l.finalQuote, 0.15);
          return quoteMin <= max;
        });
      }
    }
    
    if (filterLeadAge !== "all") {
      const now = new Date();
      filtered = filtered.filter(l => {
        const created = new Date(l.createdAt);
        const hours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        
        switch (filterLeadAge) {
          case "today":
            return hours < 24;
          case "24h":
            return hours >= 24 && hours < 48;
          case "48h+":
            return hours >= 48;
          default:
            return true;
        }
      });
    }
    
    if (filterPriority !== "all") {
      filtered = filtered.filter(l => (l.priority || "normal") === filterPriority);
    }
    
    if (filterTags.length > 0) {
      filtered = filtered.filter(l => {
        const leadTags: string[] = Array.isArray(l.tags) ? l.tags : [];
        return filterTags.some(tag => leadTags.includes(tag));
      });
    }
    
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "quote":
          const pointA = a.finalQuote ? calculateQuoteRange(a.finalQuote, 0.15).point : 0;
          const pointB = b.finalQuote ? calculateQuoteRange(b.finalQuote, 0.15).point : 0;
          comparison = pointA - pointB;
          break;
        case "leadPrice":
          const priceA = parseFloat(a.currentLeadPrice || "0");
          const priceB = parseFloat(b.currentLeadPrice || "0");
          comparison = priceA - priceB;
          break;
        case "age":
          const ageA = new Date().getTime() - new Date(a.createdAt).getTime();
          const ageB = new Date().getTime() - new Date(b.createdAt).getTime();
          comparison = ageA - ageB;
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [leads, searchQuery, filterServiceType, filterCity, filterQuoteMin, filterQuoteMax, filterLeadAge, filterPriority, filterTags, sortBy, sortOrder]);
  
  const clearFilters = () => {
    setSearchQuery("");
    setFilterServiceType("all");
    setFilterCity("all");
    setFilterQuoteMin("");
    setFilterQuoteMax("");
    setFilterLeadAge("all");
    setFilterPriority("all");
    setFilterTags([]);
    setSortBy("date");
    setSortOrder("desc");
  };
  
  const hasActiveFilters = searchQuery || filterServiceType !== "all" || filterCity !== "all" || 
    filterQuoteMin || filterQuoteMax || filterLeadAge !== "all" || filterPriority !== "all" || filterTags.length > 0 || sortBy !== "date" || sortOrder !== "desc";

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    leads.forEach(lead => {
      const tags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
      tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [leads]);

  const acceptLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await fetch(`/api/leads/${leadId}/accept`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to accept lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead Accepted", description: "You have accepted this lead." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const declineLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await fetch(`/api/leads/${leadId}/decline`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to decline lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead Declined", description: "Lead is now available for subcontractors." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ leadId, note }: { leadId: string; note: string }) => {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Note Added", description: "Your note has been added to the lead." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: Partial<Lead> }) => {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead Updated", description: "Lead details have been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await fetch(`/api/leads/${leadId}/delete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to delete lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead Deleted", description: "The lead has been permanently deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const mergeLeadsMutation = useMutation({
    mutationFn: async ({ targetLeadId, sourceLeadId }: { targetLeadId: string; sourceLeadId: string }) => {
      const res = await fetch(`/api/admin/leads/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLeadId, sourceLeadId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to merge leads");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      const refundNote = data?.refund
        ? ` Refunded $${data.refund.amount} to the prior buyer.`
        : "";
      const swapNote = data?.directionSwapped
        ? " (Older lead was kept; newer was archived.)"
        : "";
      toast({
        title: "Leads Merged",
        description: `Newer lead archived and combined into the older one.${swapNote}${refundNote}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Merge Failed", description: error.message, variant: "destructive" });
    },
  });

  const convertToProjectMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await fetch(`/api/admin/leads/${leadId}/convert-to-project`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to convert lead");
      return data;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Project Created",
        description: "Lead converted to project successfully.",
      });
      router.push(`/admin/projects/${project.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Conversion Failed", description: error.message, variant: "destructive" });
    },
  });

  const pendingLeads = filteredLeads.filter(l => l.status === "pending_admin");
  const acceptedLeads = filteredLeads.filter(l => l.status === "accepted");
  const declinedLeads = filteredLeads.filter(l => l.status === "available");
  const allPurchasedLeads = filteredLeads.filter(l => l.status === "purchased");
  const archivedLeads = filteredLeads.filter(l => l.status === "archived");

  const tabLeads = useMemo(() => {
    switch (activeTab) {
      case "pending": return pendingLeads;
      case "accepted": return acceptedLeads;
      case "available": return declinedLeads;
      case "all": return allPurchasedLeads;
      case "archived": return archivedLeads;
      default: return pendingLeads;
    }
  }, [activeTab, pendingLeads, acceptedLeads, declinedLeads, allPurchasedLeads, archivedLeads]);

  const formatCurrency = (amount: string | null | undefined) => {
    if (!amount) return "$0.00";
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatLeadAge = (date: Date | string | null) => {
    if (!date) return "N/A";
    const now = new Date();
    const created = new Date(date);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  const getServiceName = (serviceSlug: string): string => {
    const service = PRIORITY_SERVICES.find(s => s.slug === serviceSlug);
    return service ? service.name : serviceSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const getLeadDisplayTitle = (lead: { serviceType: string; selectedServices?: string[] | null; lineItems?: LineItem[] | null }): string => {
    const services = lead.selectedServices;
    if (!services || services.length <= 1) {
      return getServiceName(lead.serviceType);
    }

    let topIndex = 0;
    if (lead.lineItems && lead.lineItems.length > 0) {
      let maxPrice = -1;
      for (const item of lead.lineItems) {
        const price = item.adjustedPrice ?? item.price ?? 0;
        const slug = item.serviceId || item.service || "";
        const idx = slug ? services.indexOf(slug) : -1;
        if (price > maxPrice && idx >= 0) {
          maxPrice = price;
          topIndex = idx;
        }
      }
    }

    const topSlug = services[topIndex];
    const topName = getServiceName(topSlug);
    if (services.length === 2) {
      const otherSlug = services[topIndex === 0 ? 1 : 0];
      return `${topName} & ${getServiceName(otherSlug)}`;
    }
    return `${topName} + ${services.length - 1} more`;
  };

  const getPropertySizeFromServiceData = (serviceData: Record<string, ServiceDataEntry> | null | undefined): number | null => {
    if (!serviceData) return null;
    for (const data of Object.values(serviceData)) {
      if (data?.propertySize && typeof data.propertySize === 'number' && data.propertySize > 0) {
        return data.propertySize;
      }
    }
    return null;
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const NotesSection = ({ lead, onAddNote }: { lead: Lead; onAddNote: (note: string) => void }) => {
    const [noteText, setNoteText] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const notes = lead.notes || [];
    
    const handleAddNote = () => {
      if (noteText.trim()) {
        onAddNote(noteText.trim());
        setNoteText("");
        setIsDialogOpen(false);
      }
    };
    
    return (
      <div className="border-t pt-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium">Notes ({notes.length})</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-1" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Note</DialogTitle>
                <DialogDescription>
                  Add an internal note about this lead. Notes are only visible to admins.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Enter your note here..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={!noteText.trim()}>
                  Add Note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {notes.length > 0 ? (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {notes.map((note, index) => (
              <div key={index} className="bg-muted/50 rounded-md px-2 py-1.5 text-xs">
                <div className="flex items-start justify-between mb-0.5">
                  <p className="font-medium text-label text-muted-foreground">{note.addedBy}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.addedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="text-xs">{note.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No notes yet.</p>
        )}
      </div>
    );
  };

  const LeadCard = ({ lead, showActions = false }: { lead: Lead; showActions?: boolean }) => {
    const leadTags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
    const priority = lead.priority || "normal";
    const [editingTags, setEditingTags] = useState(false);
    const [newTag, setNewTag] = useState("");
    const [editingPriority, setEditingPriority] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [editingPrice, setEditingPrice] = useState(false);
    const [priceEstimate, setPriceEstimate] = useState("");
    const [priceLeadPrice, setPriceLeadPrice] = useState("");
    const [editingAddress, setEditingAddress] = useState(false);
    const [addressDraft, setAddressDraft] = useState("");
    const [addressErr, setAddressErr] = useState("");

    const getPriorityColor = (p: string) => {
      switch (p) {
        case "urgent": return "bg-red-600 text-white";
        case "high": return "bg-orange-600 text-white";
        case "normal": return "bg-blue-600 text-white";
        case "low": return "bg-slate-600 text-white";
        default: return "bg-blue-600 text-white";
      }
    };

    return (
    <Card id={`lead-${lead.id}`} key={lead.id} className="overflow-visible" data-testid={`card-lead-${lead.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <CardTitle className="text-base" data-testid={`text-lead-name-${lead.id}`}>
              {lead.name}
            </CardTitle>
            {priority !== "normal" && (
              <Badge className={`${getPriorityColor(priority)} text-caption px-1.5 py-0`}>
                <Flag className="h-2.5 w-2.5 mr-0.5" />
                {priority.toUpperCase()}
              </Badge>
            )}
            <Badge variant={lead.status === "pending_admin" ? "default" : lead.status === "purchased" ? "secondary" : lead.status === "archived" ? "destructive" : "outline"} className="text-caption px-1.5 py-0" data-testid={`badge-status-${lead.id}`}>
              {lead.status === "pending_admin" ? "Pending Review" : lead.status === "purchased" ? "Purchased" : lead.status === "archived" ? "Archived" : "Available"}
            </Badge>
            {lead.possibleDuplicates && lead.possibleDuplicates.length > 0 && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-caption px-1.5 py-0 text-amber-700 border-amber-500 dark:text-amber-400 dark:border-amber-600 cursor-help"
                    data-testid={`badge-duplicate-${lead.id}`}
                  >
                    Possible duplicate
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent className="w-96 text-xs space-y-2">
                  <p className="font-medium">
                    {lead.possibleDuplicates.length} matching lead{lead.possibleDuplicates.length === 1 ? '' : 's'}
                  </p>
                  <ul className="space-y-2">
                    {lead.possibleDuplicates.slice(0, 5).map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 flex-wrap">
                        <a
                          href={`/admin/dashboard?leadId=${encodeURIComponent(d.id)}`}
                          className="font-mono text-blue-600 dark:text-blue-400 underline"
                          data-testid={`link-duplicate-${d.id}`}
                        >
                          {d.id.slice(0, 8)}
                        </a>
                        <span className="text-muted-foreground">{d.matchedOn.join(' + ')}</span>
                        <span className="text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
                        <Badge variant="secondary" className="text-caption px-1 py-0">{d.status}</Badge>
                        {d.status !== "archived" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-label"
                                disabled={mergeLeadsMutation.isPending}
                                data-testid={`button-merge-${lead.id}-${d.id}`}
                              >
                                <ArrowLeftRight className="h-3 w-3 mr-1" />
                                Merge into this lead
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Merge duplicate lead?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  The OLDER of these two leads is always kept and the newer one is archived (regardless of which card you click from). Services and pricing from the newer lead will be combined into the older one. If a subcontractor already purchased the archived lead it will be refunded automatically. The action is recorded in the lead notes for reversibility.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-merge-${d.id}`}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => mergeLeadsMutation.mutate({ targetLeadId: lead.id, sourceLeadId: d.id })}
                                  data-testid={`button-confirm-merge-${d.id}`}
                                >
                                  Merge
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </li>
                    ))}
                  </ul>
                </HoverCardContent>
              </HoverCard>
            )}
            {lead.updatedAt && lead.createdAt && new Date(lead.updatedAt).getTime() - new Date(lead.createdAt).getTime() > 60000 && (
              <Badge
                variant="outline"
                className="text-caption px-1.5 py-0 text-blue-700 border-blue-500 dark:text-blue-400 dark:border-blue-600"
                title={`Updated ${new Date(lead.updatedAt).toLocaleString()}`}
                data-testid={`badge-updated-${lead.id}`}
              >
                Updated {new Date(lead.updatedAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {showActions && (
              <>
                <Popover open={editingPriority} onOpenChange={setEditingPriority}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Flag className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <Label>Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(value) => {
                        updateLeadMutation.mutate({ leadId: lead.id, data: { priority: value } });
                        setEditingPriority(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>
                <Popover open={editingTags} onOpenChange={setEditingTags}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Tag className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <Label>Tags</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTag.trim()) {
                              const updatedTags = [...leadTags, newTag.trim()];
                              updateLeadMutation.mutate({ leadId: lead.id, data: { tags: updatedTags } });
                              setNewTag("");
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newTag.trim()) {
                              const updatedTags = [...leadTags, newTag.trim()];
                              updateLeadMutation.mutate({ leadId: lead.id, data: { tags: updatedTags } });
                              setNewTag("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {leadTags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                            <button
                              onClick={() => {
                                const updatedTags = leadTags.filter((_, i) => i !== idx);
                                updateLeadMutation.mutate({ leadId: lead.id, data: { tags: updatedTags } });
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  data-testid={`button-delete-lead-${lead.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="dialog-confirm-delete-lead">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete this lead? This will remove all associated data including purchase records and notifications. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid={`button-cancel-delete-lead-${lead.id}`}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    data-testid={`button-confirm-delete-lead-${lead.id}`}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteLeadMutation.mutate(lead.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <CardDescription className="text-xs mt-0.5">
          {getLeadDisplayTitle(lead)} in {lead.city}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            {editingPrice ? (
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <label className="text-caption text-muted-foreground w-16 flex-shrink-0">Estimate:</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 250"
                    value={priceEstimate}
                    onChange={(e) => setPriceEstimate(e.target.value)}
                    className="h-7 text-xs w-24"
                    data-testid={`input-price-estimate-${lead.id}`}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-caption text-muted-foreground w-16 flex-shrink-0">Lead $:</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 25"
                    value={priceLeadPrice}
                    onChange={(e) => setPriceLeadPrice(e.target.value)}
                    className="h-7 text-xs w-24"
                    data-testid={`input-lead-price-${lead.id}`}
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-6 text-caption px-2"
                    data-testid={`button-save-price-${lead.id}`}
                    onClick={() => {
                      const updates: Partial<Lead> = {};
                      if (priceEstimate && !isNaN(parseFloat(priceEstimate))) {
                        updates.finalQuote = priceEstimate;
                      }
                      if (priceLeadPrice && !isNaN(parseFloat(priceLeadPrice))) {
                        updates.currentLeadPrice = priceLeadPrice;
                        updates.baseLeadPrice = priceLeadPrice;
                      }
                      if (Object.keys(updates).length > 0) {
                        updateLeadMutation.mutate({ leadId: lead.id, data: updates });
                      }
                      setEditingPrice(false);
                    }}
                  >
                    <Check className="h-3 w-3 mr-1" /> Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-caption px-2"
                    onClick={() => setEditingPrice(false)}
                    data-testid={`button-cancel-price-${lead.id}`}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="min-w-0 flex items-start gap-1">
                <div>
                  <p className="font-medium text-sm leading-tight">
                    {lead.finalQuote ? formatQuoteRangeWholeFromValue(lead.finalQuote, 0.15) : "Pending"}
                  </p>
                  <p className="text-muted-foreground text-label leading-tight">
                    Lead: {formatCurrency(lead.currentLeadPrice)}
                    {lead.baseLeadPrice !== lead.currentLeadPrice && (
                      <span className="ml-1">(was {formatCurrency(lead.baseLeadPrice)})</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 flex-shrink-0"
                  onClick={() => {
                    setPriceEstimate(lead.finalQuote || "");
                    setPriceLeadPrice(lead.currentLeadPrice || "");
                    setEditingPrice(true);
                  }}
                  title="Override price"
                  data-testid={`button-edit-price-${lead.id}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium text-sm leading-tight">{formatDate(lead.createdAt)}</p>
              <p className="text-muted-foreground text-label leading-tight">
                {formatLeadAge(lead.createdAt)}, {getLeadFrequencyDisplay(lead)}
              </p>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={() => acceptLeadMutation.mutate(lead.id)}
              disabled={acceptLeadMutation.isPending}
              size="sm"
              className="flex-1"
              data-testid={`button-accept-${lead.id}`}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Accept
            </Button>
            <Button
              onClick={() => declineLeadMutation.mutate(lead.id)}
              disabled={declineLeadMutation.isPending}
              variant="outline"
              size="sm"
              className="flex-1"
              data-testid={`button-decline-${lead.id}`}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Send to Subs
            </Button>
          </div>
        )}

        <div className={`${expanded ? 'block' : 'hidden'} md:block space-y-2`}>
          {lead.quoteId && (
            <div className="flex items-center gap-1.5 text-label text-muted-foreground border-t pt-2">
              <Hash className="h-3 w-3" />
              <span>Quote ID: {lead.quoteId}</span>
            </div>
          )}

          <div className="flex gap-2 border-t pt-2">
            {lead.projectId ? (
              <Button size="sm" variant="outline" asChild className="flex-1">
                <a href={`/admin/projects/${lead.projectId}`}>
                  <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                  View Project
                </a>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={convertToProjectMutation.isPending}
                onClick={() => convertToProjectMutation.mutate(lead.id)}
              >
                <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                Convert to Project
              </Button>
            )}
          </div>

          {leadTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {leadTags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-caption px-1.5 py-0">
                  <Tag className="h-2.5 w-2.5 mr-0.5" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {lead.selectedServices && lead.selectedServices.length > 0 && (
            <div className="border-t pt-2">
              <p className="text-xs font-medium mb-1.5 text-muted-foreground">Services</p>
              <div className="flex flex-wrap gap-1">
                {lead.selectedServices.map((serviceId, index) => (
                  <Badge key={index} variant="outline" className="text-label px-1.5 py-0">
                    {getServiceName(serviceId)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {!!lead.serviceData && typeof lead.serviceData === "object" && Object.keys(lead.serviceData).length > 0 && (
            <div className="border-t pt-2">
              <p className="text-xs font-medium mb-1 text-muted-foreground">Measurements</p>
              <div className="space-y-1">
                {Object.entries(lead.serviceData).map(([serviceId, data]) => {
                  const measurement = formatMeasurement(serviceId, data);
                  return (
                    <div key={serviceId} className="bg-muted/50 rounded-md px-2 py-1 text-xs">
                      <span className="font-medium">{getServiceName(serviceId)}:</span>
                      {measurement && (
                        <span className="text-muted-foreground ml-1.5">{measurement}</span>
                      )}
                      {!measurement && data && (
                        <span className="text-muted-foreground ml-1.5 italic">No measurements provided</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs border-t pt-2">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <a 
                href={`mailto:${lead.email}`} 
                className="text-primary hover:underline truncate"
                data-testid={`text-email-${lead.id}`}
              >
                {lead.email}
              </a>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <a 
                href={`tel:${lead.phone}`} 
                className="text-primary hover:underline"
                data-testid={`text-phone-${lead.id}`}
              >
                {lead.phone}
              </a>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              {(() => {
                const cleaned = cleanDisplayAddress(lead.address, lead.city);
                const cityLabel = lead.city.charAt(0).toUpperCase() + lead.city.slice(1);
                return (
                  <span className="truncate" data-testid={`text-address-${lead.id}`}>
                    {cleaned.display
                      ? `${cleaned.display}, ${cityLabel}, Idaho`
                      : `${cityLabel}, Idaho`}
                  </span>
                );
              })()}
              <Popover
                open={editingAddress}
                onOpenChange={(open) => {
                  setEditingAddress(open);
                  if (open) {
                    const cleaned = cleanDisplayAddress(lead.address, lead.city);
                    setAddressDraft(cleaned.display || lead.address || "");
                    setAddressErr("");
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Edit street address"
                    data-testid={`button-edit-address-${lead.id}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-2" align="start">
                  <Label className="text-xs">Street address (must start with a house number)</Label>
                  <Input
                    value={addressDraft}
                    onChange={(e) => {
                      setAddressDraft(e.target.value);
                      setAddressErr("");
                    }}
                    placeholder="1234 W Main St"
                    data-testid={`input-edit-address-${lead.id}`}
                  />
                  {addressErr && (
                    <p className="text-xs text-destructive" data-testid={`text-edit-address-error-${lead.id}`}>
                      {addressErr}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Tip: phone {lead.phone}. Call the customer to confirm the exact house number, then save.
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingAddress(false)}
                      data-testid={`button-cancel-edit-address-${lead.id}`}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const trimmed = addressDraft.trim();
                        if (!hasLeadingHouseNumber(trimmed)) {
                          setAddressErr(HOUSE_NUMBER_ERROR_MESSAGE);
                          return;
                        }
                        updateLeadMutation.mutate(
                          { leadId: lead.id, data: { address: trimmed, addressMissingHouseNumber: false } as Partial<Lead> },
                          { onSuccess: () => setEditingAddress(false) },
                        );
                      }}
                      disabled={updateLeadMutation.isPending}
                      data-testid={`button-save-edit-address-${lead.id}`}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-1.5">
              <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span>{lead.propertyType.replace(/-/g, " ")}</span>
              {(() => {
                const propertySize = getPropertySizeFromServiceData(lead.serviceData);
                return propertySize ? (
                  <span className="text-muted-foreground ml-1">({propertySize.toLocaleString()} sq ft)</span>
                ) : null;
              })()}
            </div>
          </div>

          {lead.message && (
            <div className="border-t pt-2">
              <p className="text-xs text-muted-foreground mb-0.5">Customer Message:</p>
              <p className="text-xs" data-testid={`text-message-${lead.id}`}>{lead.message}</p>
            </div>
          )}

          <PropertyProfileEditor
            profile={lead.propertyProfile}
            saving={updateLeadMutation.isPending}
            onSave={(profile) =>
              updateLeadMutation.mutate({
                leadId: lead.id,
                data: { propertyProfile: profile },
              })
            }
          />

          <QuoteBreakdownSection lead={lead} />

          <NotesSection lead={lead} onAddNote={(note) => addNoteMutation.mutate({ leadId: lead.id, note })} />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full md:hidden justify-center gap-1 text-xs text-muted-foreground"
          data-testid={`button-toggle-lead-details-${lead.id}`}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show details
            </>
          )}
        </Button>
      </CardContent>
    </Card>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={embedded ? "py-16" : "min-h-screen bg-background flex items-center justify-center"}>
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="w-12 h-12 text-muted-foreground/60" />
          <div>
            <p className="text-foreground mb-1">We could not load the leads dashboard.</p>
            <p className="text-sm text-muted-foreground">This is usually temporary. Please try again.</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-admin-leads">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-admin-dashboard" className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && (
      <header className="border-b bg-card">
        <div className="container px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-bold">Admin Dashboard</h1>
                  <Badge 
                    variant={environment.isProduction ? "default" : "outline"}
                    className={environment.isProduction ? "bg-primary" : "border-amber-500 text-amber-700 dark:text-amber-400"}
                  >
                    <Server className="h-3 w-3 mr-1" />
                    {environment.environmentLabel}
                  </Badge>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  Welcome, {user?.firstName || user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/subcontractor/leads")}
                data-testid="button-switch-to-subcontractor"
                title="View as Subcontractor"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Sub Portal</span>
              </Button>
              <NotificationsBell />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-0 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      )}
      
      <div className={embedded ? "" : "container px-3 md:px-4 py-4 md:py-8"}>
        {!environment.isProduction && (
          <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-md flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">Development Environment</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You&apos;re viewing the development database. For production leads, visit{" "}
                <a 
                  href="https://boiseremodeling.co/admin" 
                  className="underline font-medium hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  boiseremodeling.co/admin
                </a>
              </p>
            </div>
          </div>
        )}
      
        <div className="mb-4 md:mb-8">
          <AdminAnalyticsPanel user={user} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
          <Card>
            <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="brc-display-num tabular-nums text-2xl md:text-3xl font-light" data-testid="count-pending">{pendingLeads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Accepted</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="brc-display-num tabular-nums text-2xl md:text-3xl font-light" data-testid="count-accepted">{acceptedLeads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Available</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="brc-display-num tabular-nums text-2xl md:text-3xl font-light" data-testid="count-available">{declinedLeads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Purchased</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="brc-display-num tabular-nums text-2xl md:text-3xl font-light" data-testid="count-purchased">{allPurchasedLeads.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-3 md:p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Auto-Release Leads</p>
              <p className="text-xs text-muted-foreground">
                {autoRelease
                  ? "New leads skip admin review and go straight to the subcontractor marketplace."
                  : "New leads require admin review before appearing in the marketplace."}
              </p>
            </div>
            <Switch
              checked={autoRelease}
              onCheckedChange={(checked) => toggleAutoReleaseMutation.mutate(Boolean(checked))}
              disabled={toggleAutoReleaseMutation.isPending}
              aria-label="Toggle auto-release leads"
              data-testid="toggle-auto-release"
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="p-3 md:p-4 pb-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Search className="h-4 w-4" />
                Search & Filters
              </CardTitle>
              <div className="flex items-center gap-1 md:gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} aria-label="Clear filters">
                    <X className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} aria-label={showFilters ? "Hide filters" : "Show filters"}>
                  <Filter className="h-4 w-4 mr-0 md:mr-1" />
                  <span className="hidden md:inline">{showFilters ? "Hide" : "Show"} Filters</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, address, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium mb-2 block">Service Type</label>
                  <Select value={filterServiceType} onValueChange={setFilterServiceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {Array.from(new Set(leads.map(l => l.serviceType))).map(serviceType => (
                        <SelectItem key={serviceType} value={serviceType}>
                          {serviceType.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">City</label>
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {Array.from(new Set(leads.map(l => l.city))).sort().map(city => (
                        <SelectItem key={city} value={city.toLowerCase()}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Lead Age</label>
                  <Select value={filterLeadAge} onValueChange={setFilterLeadAge}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Ages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ages</SelectItem>
                      <SelectItem value="today">Today (&lt;24h)</SelectItem>
                      <SelectItem value="24h">24-48 Hours</SelectItem>
                      <SelectItem value="48h+">48+ Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tags</label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !filterTags.includes(value)) {
                        setFilterTags([...filterTags, value]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tags..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                      {allTags.length === 0 && (
                        <SelectItem value="" disabled>No tags available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {filterTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {filterTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                          <button
                            onClick={() => setFilterTags(filterTags.filter(t => t !== tag))}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="quote">Quote Value</SelectItem>
                        <SelectItem value="leadPrice">Lead Price</SelectItem>
                        <SelectItem value="age">Age</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      title={sortOrder === "asc" ? "Ascending" : "Descending"}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Quote Value Range</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min $"
                      value={filterQuoteMin}
                      onChange={(e) => setFilterQuoteMin(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Max $"
                      value={filterQuoteMax}
                      onChange={(e) => setFilterQuoteMax(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground pt-2 border-t">
              Showing {tabLeads.length} of {filteredLeads.length} leads
              {hasActiveFilters && " (filtered)"}
            </div>
          </CardContent>
        </Card>

        {activeTab === "pending" && pendingLeads.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-3 md:p-4 space-y-3">
              <div>
                <span className="text-sm font-semibold">Bulk Actions</span>
                <p className="text-xs text-muted-foreground">Perform actions on all filtered leads</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (pendingLeads.length > 0 && confirm(`Accept ${pendingLeads.length} lead(s)?`)) {
                      pendingLeads.forEach(lead => acceptLeadMutation.mutate(lead.id));
                    }
                  }}
                  disabled={acceptLeadMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Accept All Filtered ({pendingLeads.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (pendingLeads.length > 0 && confirm(`Decline ${pendingLeads.length} lead(s)?`)) {
                      pendingLeads.forEach(lead => declineLeadMutation.mutate(lead.id));
                    }
                  }}
                  disabled={declineLeadMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline All Filtered ({pendingLeads.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const csv = [
                      ["Name", "Email", "Phone", "City", "Service Type", "Quote Value", "Lead Price", "Status", "Created At"].join(","),
                      ...pendingLeads.map(lead => [
                        lead.name,
                        lead.email,
                        lead.phone,
                        lead.city,
                        lead.serviceType,
                        lead.finalQuote ? formatQuoteRangeWholeFromValue(lead.finalQuote, 0.15) : "Pending",
                        lead.currentLeadPrice,
                        lead.status,
                        new Date(lead.createdAt).toISOString()
                      ].map(v => `"${v}"`).join(","))
                    ].join("\n");
                    
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    toast({ title: "Export Complete", description: `Exported ${pendingLeads.length} leads to CSV` });
                  }}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Export to CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="w-max md:w-full">
              <TabsTrigger value="pending" data-testid="tab-pending" className="text-xs md:text-sm">
                Pending ({pendingLeads.length})
              </TabsTrigger>
              <TabsTrigger value="accepted" data-testid="tab-accepted" className="text-xs md:text-sm">
                Accepted ({acceptedLeads.length})
              </TabsTrigger>
              <TabsTrigger value="available" data-testid="tab-available" className="text-xs md:text-sm">
                Available ({declinedLeads.length})
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all" className="text-xs md:text-sm">
                Purchased ({allPurchasedLeads.length})
              </TabsTrigger>
              <TabsTrigger value="archived" data-testid="tab-archived" className="text-xs md:text-sm">
                Archived ({archivedLeads.length})
              </TabsTrigger>
              <TabsTrigger value="subcontractors" data-testid="tab-subcontractors" className="text-xs md:text-sm">
                Subs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pending" className="space-y-4">
            {pendingLeads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {hasActiveFilters ? "No pending leads match your filters" : "No pending leads to review"}
                </CardContent>
              </Card>
            ) : (
              pendingLeads.map(lead => <LeadCard key={lead.id} lead={lead} showActions />)
            )}
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4">
            {acceptedLeads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {hasActiveFilters ? "No accepted leads match your filters" : "You haven't accepted any leads yet"}
                </CardContent>
              </Card>
            ) : (
              acceptedLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)
            )}
          </TabsContent>

          <TabsContent value="available" className="space-y-4">
            {declinedLeads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {hasActiveFilters ? "No available leads match your filters" : "No leads available for subcontractors"}
                </CardContent>
              </Card>
            ) : (
              declinedLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {allPurchasedLeads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {hasActiveFilters ? "No purchased leads match your filters" : "No purchased leads yet"}
                </CardContent>
              </Card>
            ) : (
              allPurchasedLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            {archivedLeads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {hasActiveFilters ? "No archived leads match your filters" : "No archived leads. Unpurchased leads older than 7 days are auto-archived."}
                </CardContent>
              </Card>
            ) : (
              archivedLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)
            )}
          </TabsContent>

          <TabsContent value="subcontractors" className="space-y-4">
            <AdminSubcontractorPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AdminLeadsPanel({ embedded = false }: { embedded?: boolean }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    }>
      <AdminDashboardContent embedded={embedded} />
    </Suspense>
  );
}
