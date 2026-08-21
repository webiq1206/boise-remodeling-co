"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { NotificationsBell } from "@/components/NotificationsBell";
import {
  Leaf, MapPin, Clock, DollarSign, Building, Search, ArrowLeft, Mail, Phone, AlertTriangle,
  User, ChevronDown, Receipt, History, LogOut, ExternalLink, Copy, CheckCircle2,
  Download
} from "lucide-react";
import { buildLeadCsv, buildCsvFilename, downloadCsv, type CsvFormat } from "@/lib/leadCsv";
import { useExportedLeads, formatExportedDate } from "@/lib/exportedLeads";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanDisplayAddress } from "@/shared/addressValidation";

interface LineItem {
  serviceId?: string;
  service?: string;
  serviceName?: string;
  description?: string;
  price?: number;
  basePrice?: number;
  adjustedPrice?: number;
  calculationExplanation?: string;
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
  propertySize?: string | number | null;
  message?: string | null;
  baseLeadPrice?: string | null;
  currentLeadPrice?: string | null;
  purchasePrice?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  purchasedBy?: string | null;
  purchasedAt?: string | null;
  addressMissingHouseNumber?: boolean | null;
  possibleDuplicates?: Array<{
    id: string;
    status: string;
    createdAt: string;
    matchedOn: ("email" | "address")[];
  }>;
}

const PRIORITY_SERVICES = [
  { slug: "kitchen-remodel", name: "Kitchen Remodel" },
  { slug: "bathroom-remodel", name: "Bathroom Remodel" },
  { slug: "whole-home-remodel", name: "Whole-Home Remodel" },
  { slug: "room-addition", name: "Room Addition" },
  { slug: "basement-finish", name: "Basement Finish" },
  { slug: "outdoor-living", name: "Outdoor Living" },
];

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

function getServiceName(serviceSlug: string): string {
  const service = PRIORITY_SERVICES.find(s => s.slug === serviceSlug);
  return service ? service.name : serviceSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function QuoteBreakdownSection({ lead }: { lead: Lead }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const lineItems = lead.lineItems || [];
  const hasBreakdown = lineItems.length > 0;
  
  if (!hasBreakdown && !lead.finalQuote) {
    return null;
  }
  
  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return '$0';
    return `$${price.toLocaleString()}`;
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-t pt-4 mt-4">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between p-0 h-auto font-medium text-sm hover:bg-transparent"
          >
            <span className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Project Details
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-3">
          {lineItems.length > 0 ? (
            <div className="space-y-3">
              {lineItems.map((item, index) => {
                const serviceName = item.serviceName || item.service || 'Service';
                const price = item.price || item.adjustedPrice || 0;
                
                return (
                  <div key={index} className="bg-muted/50 rounded-md p-3">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-medium text-sm">{serviceName}</span>
                      <span className="font-semibold text-sm text-primary">{formatPrice(price)}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                );
              })}
              
              {lead.finalQuote && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold text-sm">Estimated Project Value</span>
                  <span className="font-bold text-lg text-primary">
                    {formatQuoteRangeWholeFromValue(lead.finalQuote, 0.15)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">Estimated Project Value</span>
              <span className="font-bold text-lg text-primary">
                {lead.finalQuote ? formatQuoteRangeWholeFromValue(lead.finalQuote, 0.15) : "Contact for quote"}
              </span>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function PurchaseHistoryPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const { user, isAuthenticated, isLoading: authLoading, isSubcontractor } = useAuth();
  const { isExported, exportedAt, markExported } = useExportedLeads(user?.id);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);

  // Reset selection whenever the filter changes so users don't accidentally
  // export rows that aren't visible.
  useEffect(() => {
    setSelectedPurchaseIds([]);
  }, [searchQuery]);

  const togglePurchaseSelection = (id: string) => {
    setSelectedPurchaseIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Route guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/subcontractor");
      return;
    }
    if (!isSubcontractor) {
      router.push("/admin/dashboard");
      return;
    }
  }, [authLoading, isAuthenticated, isSubcontractor, router]);

  // Fetch purchase history
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads/purchases"],
    queryFn: async () => {
      const res = await fetch("/api/leads/purchases");
      if (!res.ok) throw new Error("Failed to fetch purchases");
      return res.json();
    },
    enabled: isAuthenticated && isSubcontractor,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Filter and sort purchases
  const filteredPurchases = useMemo(() => {
    let filtered = [...purchases];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query) ||
        lead.city?.toLowerCase().includes(query) ||
        lead.serviceType?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.purchasedAt || a.createdAt).getTime() - new Date(b.purchasedAt || b.createdAt).getTime();
          break;
        case "price":
          comparison = parseFloat(a.purchasePrice || a.currentLeadPrice || "0") - parseFloat(b.purchasePrice || b.currentLeadPrice || "0");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [purchases, searchQuery, sortBy, sortOrder]);

  const totalSpent = useMemo(() => {
    return purchases.reduce((sum, lead) => sum + parseFloat(lead.purchasePrice || lead.currentLeadPrice || "0"), 0);
  }, [purchases]);

  const formatCurrency = (amount: string | null | undefined) => {
    if (!amount) return "$0.00";
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const copyToClipboard = (text: string, leadId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(leadId);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const exportLeads = useMemo(() => {
    if (selectedPurchaseIds.length === 0) return filteredPurchases;
    const selectedSet = new Set(selectedPurchaseIds);
    return filteredPurchases.filter(l => selectedSet.has(l.id));
  }, [filteredPurchases, selectedPurchaseIds]);

  const visibleIds = useMemo(() => filteredPurchases.map(l => l.id), [filteredPurchases]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every(id => selectedPurchaseIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedPurchaseIds([]);
    } else {
      setSelectedPurchaseIds(visibleIds);
    }
  };

  const handleExport = (format: CsvFormat) => {
    if (exportLeads.length === 0) return;
    const csv = buildLeadCsv(exportLeads, { format, getServiceName });
    const filename = buildCsvFilename(format);
    downloadCsv(csv, filename);
    markExported(filteredPurchases.map(l => l.id));
    toast({
      title: `Exported ${exportLeads.length} ${exportLeads.length === 1 ? "lead" : "leads"}`,
      description: filename,
    });
  };

  const PurchasedLeadCard = ({ lead }: { lead: Lead }) => {
    return (
      <Card className={`overflow-hidden transition-all ${selectedPurchaseIds.includes(lead.id) ? 'ring-2 ring-primary' : ''}`} id={`lead-${lead.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Checkbox
                checked={selectedPurchaseIds.includes(lead.id)}
                onCheckedChange={() => togglePurchaseSelection(lead.id)}
                className="mt-1.5"
                aria-label={`Select ${lead.name} for export`}
                data-testid={`checkbox-purchase-${lead.id}`}
              />
            <div>
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                {getServiceName(lead.serviceType)}
                <Badge variant="secondary" className="text-foreground bg-muted">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Purchased
                </Badge>
                {(() => {
                  const when = exportedAt(lead.id);
                  if (!when) return null;
                  return (
                    <Badge
                      variant="outline"
                      className="text-caption px-1.5 py-0 text-muted-foreground"
                      title={`Exported ${when.toLocaleString()}`}
                      data-testid={`badge-exported-${lead.id}`}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Exported {formatExportedDate(when)}
                    </Badge>
                  );
                })()}
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
                    <HoverCardContent className="w-72 text-xs space-y-2">
                      <div className="font-medium">
                        Matches {lead.possibleDuplicates.length} other lead{lead.possibleDuplicates.length === 1 ? '' : 's'} on{' '}
                        {Array.from(new Set(lead.possibleDuplicates.flatMap((d) => d.matchedOn))).join(' / ')}.
                      </div>
                      <ul className="space-y-1">
                        {lead.possibleDuplicates.slice(0, 5).map((d) => (
                          <li key={d.id} className="flex justify-between gap-2">
                            <span className="font-mono">{d.id.slice(0, 8)}</span>
                            <span className="capitalize text-muted-foreground">{d.status.replace(/_/g, ' ')}</span>
                            <span className="text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
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
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                {lead.city} • {lead.propertyType.replace(/-/g, " ")}
              </CardDescription>
            </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Purchased</p>
              <p className="font-medium">{formatDate(lead.purchasedAt)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Contact Info - REVEALED */}
          <div className="bg-muted/50 border border-primary/20 dark:border-primary/30 rounded-lg p-4">
            <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Contact Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{lead.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(lead.name, `${lead.id}-name`)}
                >
                  {copiedId === `${lead.id}-name` ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                    {lead.email}
                  </a>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(lead.email, `${lead.id}-email`)}
                  >
                    {copiedId === `${lead.id}-email` ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={`mailto:${lead.email}`}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              
              {lead.phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(lead.phone || "", `${lead.id}-phone`)}
                    >
                      {copiedId === `${lead.id}-phone` ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a href={`tel:${lead.phone}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
              
              {(() => {
                const cleaned = cleanDisplayAddress(lead.address, lead.city);
                if (!cleaned.display) return null;
                const fullAddress = `${cleaned.display}, ${lead.city}`;
                return (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{fullAddress}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(fullAddress, `${lead.id}-address`)}
                      >
                        {copiedId === `${lead.id}-address` ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a 
                          href={`https://maps.google.com/?q=${encodeURIComponent(`${fullAddress}, ID`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  Project: {lead.finalQuote ? formatQuoteRangeWholeFromValue(lead.finalQuote, 0.15) : "Contact for quote"}
                </p>
                <p className="text-muted-foreground text-xs">Estimated value</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{lead.frequency || "One-time"}</p>
                <p className="text-muted-foreground text-xs">Service frequency</p>
              </div>
            </div>
          </div>

          {lead.selectedServices && lead.selectedServices.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Services Requested:</p>
              <div className="flex flex-wrap gap-2">
                {lead.selectedServices.map((serviceId, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {getServiceName(serviceId)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {lead.message && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Customer Message:</p>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">{lead.message}</p>
            </div>
          )}

          <QuoteBreakdownSection lead={lead} />

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Lead Purchase Price</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(lead.purchasePrice || lead.currentLeadPrice)}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Purchased: {formatDateTime(lead.purchasedAt)}</p>
              <p>Lead created: {formatDate(lead.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Leaf className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-purchase-history">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push("/subcontractor/leads")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">Purchase History</h1>
                <p className="text-sm text-muted-foreground">
                  View your purchased leads
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsBell />
              <Button variant="outline" onClick={() => router.push("/subcontractor/leads")}>
                Browse Leads
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8 px-4">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4" /> Total Purchases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="brc-display-num tabular-nums text-3xl font-light">{purchases.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="brc-display-num tabular-nums text-3xl font-light">${totalSpent.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building className="h-4 w-4" /> Avg Lead Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="brc-display-num tabular-nums text-3xl font-light">
                ${purchases.length > 0 ? (totalSpent / purchases.length).toFixed(2) : "0.00"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Sort */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">By Date</SelectItem>
                    <SelectItem value="price">By Price</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? "↑ Oldest" : "↓ Newest"}
                </Button>
                <Button
                  variant="outline"
                  onClick={toggleSelectAllVisible}
                  disabled={filteredPurchases.length === 0}
                  data-testid="button-toggle-select-all-purchases"
                >
                  {allVisibleSelected ? "Clear" : "Select all visible"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={exportLeads.length === 0}
                      data-testid="button-export-purchases"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                      {selectedPurchaseIds.length > 0 ? (
                        <span className="ml-1 text-muted-foreground">
                          ({exportLeads.length} selected)
                        </span>
                      ) : (
                        filteredPurchases.length > 0 && filteredPurchases.length !== purchases.length && (
                          <span className="ml-1 text-muted-foreground">
                            ({filteredPurchases.length})
                          </span>
                        )
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>
                      {selectedPurchaseIds.length > 0 ? "Export selected " : "Export "}
                      {exportLeads.length}{" "}
                      {exportLeads.length === 1 ? "lead" : "leads"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleExport("yardbook")}
                      data-testid="menu-export-yardbook"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">Yardbook customer CSV</span>
                        <span className="text-xs text-muted-foreground">
                          Drag-and-drop into Yardbook import
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport("full")}
                      data-testid="menu-export-full"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">Full lead CSV</span>
                        <span className="text-xs text-muted-foreground">
                          All fields for spreadsheets
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase List */}
        {purchasesLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading purchase history...</div>
        ) : filteredPurchases.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              {searchQuery ? (
                <>
                  <p className="text-muted-foreground">No purchases match your search.</p>
                  <Button variant="ghost" className="underline" onClick={() => setSearchQuery("")}>Clear search</Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">You haven&apos;t purchased any leads yet.</p>
                  <Button onClick={() => router.push("/subcontractor/leads")}>
                    Browse Available Leads
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPurchases.map(lead => <PurchasedLeadCard key={lead.id} lead={lead} />)}
          </div>
        )}
      </div>
    </div>
  );
}
