"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Mail, Phone, Building, FileText, Globe, Shield, DollarSign, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface User {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  company?: string | null;
  licenseNumber?: string | null;
  role: string;
  creditBalance?: string | null;
  agreementAccepted?: boolean | null;
  agreementAcceptedAt?: string | Date | null;
  agreementSignature?: string | null;
  agreementSignatureIp?: string | null;
  agreementSignatureUserAgent?: string | null;
  agreementVersion?: string | null;
}

interface CreditTransaction {
  id: string;
  userId: string;
  amount: string;
  type: string;
  description?: string | null;
  adminId?: string | null;
  leadPurchaseId?: string | null;
  balanceAfter: string;
  createdAt: string | Date;
}

export function AdminSubcontractorPanel() {
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<User | null>(null);
  const [creditDialogSub, setCreditDialogSub] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: subcontractors = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/subcontractors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subcontractors");
      if (!res.ok) throw new Error("Failed to fetch subcontractors");
      return res.json();
    },
  });

  const { data: creditHistory = [] } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/admin/subcontractors", selectedSubcontractor?.id, "credits"],
    queryFn: async () => {
      if (!selectedSubcontractor?.id) return [];
      const res = await fetch(`/api/admin/subcontractors/${selectedSubcontractor.id}/credits`);
      if (!res.ok) throw new Error("Failed to fetch credit history");
      return res.json();
    },
    enabled: !!selectedSubcontractor?.id,
  });

  const addCreditMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
      const res = await fetch(`/api/admin/subcontractors/${userId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add credits");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subcontractors"] });
      if (selectedSubcontractor) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subcontractors", selectedSubcontractor.id, "credits"] });
      }
      toast({ title: "Credits Added", description: `$${parseFloat(creditAmount).toFixed(2)} in credits added successfully.` });
      setCreditDialogSub(null);
      setCreditAmount("");
      setCreditDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddCredits = () => {
    if (!creditDialogSub) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive dollar amount.", variant: "destructive" });
      return;
    }
    addCreditMutation.mutate({
      userId: creditDialogSub.id,
      amount,
      description: creditDescription.trim(),
    });
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

  const getFullName = (sub: User) => {
    const firstName = sub.firstName || "";
    const lastName = sub.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || sub.email || "Unknown";
  };

  const formatCurrency = (amount: string | null | undefined) => {
    if (!amount) return "$0.00";
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subcontractors</CardTitle>
          <CardDescription>Manage subcontractor accounts and agreements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Subcontractors</CardTitle>
          <CardDescription>
            Manage subcontractor accounts and view agreement status ({subcontractors.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subcontractors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No subcontractors found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Agreement</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcontractors.map((sub) => (
                  <TableRow
                    key={sub.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedSubcontractor(sub)}
                    data-testid={`row-subcontractor-${sub.id}`}
                  >
                    <TableCell className="font-medium" data-testid={`text-subcontractor-name-${sub.id}`}>
                      {getFullName(sub)}
                    </TableCell>
                    <TableCell data-testid={`text-subcontractor-email-${sub.id}`}>
                      {sub.email || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-subcontractor-company-${sub.id}`}>
                      {sub.company || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-subcontractor-credits-${sub.id}`}>
                      <span className={parseFloat(sub.creditBalance || "0") > 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
                        {formatCurrency(sub.creditBalance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {sub.agreementAccepted ? (
                        <Badge variant="default" className="bg-primary" data-testid={`badge-agreement-signed-${sub.id}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Signed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-agreement-pending-${sub.id}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreditDialogSub(sub);
                        }}
                        data-testid={`button-add-credits-${sub.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Credits
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subcontractor Detail Modal */}
      <Dialog open={!!selectedSubcontractor} onOpenChange={() => setSelectedSubcontractor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="modal-subcontractor-detail">
          <DialogHeader>
            <DialogTitle>Subcontractor Details</DialogTitle>
            <DialogDescription>
              View contact information, credits, and agreement status
            </DialogDescription>
          </DialogHeader>
          {selectedSubcontractor && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" data-testid="text-detail-name">
                      {getFullName(selectedSubcontractor)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span data-testid="text-detail-email">{selectedSubcontractor.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span data-testid="text-detail-phone">{selectedSubcontractor.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span data-testid="text-detail-company">{selectedSubcontractor.company || "N/A"}</span>
                  </div>
                  {selectedSubcontractor.licenseNumber && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span data-testid="text-detail-license">License: {selectedSubcontractor.licenseNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Credit Balance Section */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Account Credits</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="brc-display-num tabular-nums text-2xl font-light" data-testid="text-detail-credit-balance">
                      {formatCurrency(selectedSubcontractor.creditBalance)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setCreditDialogSub(selectedSubcontractor)}
                    data-testid="button-add-credits-detail"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Credits
                  </Button>
                </div>

                {creditHistory.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs text-muted-foreground font-medium">Transaction History ({creditHistory.length})</p>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {creditHistory.map((tx) => {
                        const isCredit = parseFloat(tx.amount) > 0;
                        return (
                          <div key={tx.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30" data-testid={`row-credit-tx-${tx.id}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {isCredit ? (
                                <ArrowDownLeft className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <span className="text-xs block truncate">
                                  {tx.type === "admin_credit" ? "Admin Credit" : "Lead Purchase"}
                                </span>
                                {tx.description && (
                                  <span className="text-xs text-muted-foreground block truncate">{tx.description}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <span className={`text-xs font-medium ${isCredit ? "text-green-600" : "text-red-500"}`}>
                                {isCredit ? "+" : ""}{formatCurrency(tx.amount)}
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                Bal: {formatCurrency(tx.balanceAfter)}
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                {formatDate(tx.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Agreement Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedSubcontractor.agreementAccepted ? (
                      <Badge variant="default" className="bg-primary" data-testid="badge-detail-agreement-signed">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Agreement Signed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" data-testid="badge-detail-agreement-pending">
                        <Clock className="h-3 w-3 mr-1" />
                        Agreement Pending
                      </Badge>
                    )}
                  </div>

                  {selectedSubcontractor.agreementAccepted && (
                    <div className="bg-muted/50 rounded-md p-4 space-y-3 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Electronic Signature</p>
                        <p className="font-medium text-lg italic" data-testid="text-detail-signature">
                          {selectedSubcontractor.agreementSignature || "N/A"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Date/Time Signed</p>
                          <p data-testid="text-detail-signed-datetime">
                            {formatDateTime(selectedSubcontractor.agreementAcceptedAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Agreement Version</p>
                          <p data-testid="text-detail-agreement-version">
                            {selectedSubcontractor.agreementVersion || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" /> IP Address
                        </p>
                        <p className="font-mono text-sm" data-testid="text-detail-ip">
                          {selectedSubcontractor.agreementSignatureIp || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Shield className="h-3 w-3" /> User Agent
                        </p>
                        <p className="text-xs font-mono text-muted-foreground break-all" data-testid="text-detail-user-agent">
                          {selectedSubcontractor.agreementSignatureUserAgent || "N/A"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Credits Dialog */}
      <Dialog open={!!creditDialogSub} onOpenChange={(open) => { if (!open) { setCreditDialogSub(null); setCreditAmount(""); setCreditDescription(""); } }}>
        <DialogContent className="max-w-sm" data-testid="modal-add-credits" data-clarity-mask="true">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Add Credits
            </DialogTitle>
            <DialogDescription>
              Add account credits for {creditDialogSub ? getFullName(creditDialogSub) : ""}
              {creditDialogSub?.creditBalance && parseFloat(creditDialogSub.creditBalance) > 0 && (
                <span className="block mt-1">Current balance: {formatCurrency(creditDialogSub.creditBalance)}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount ($)</Label>
              <Input
                id="credit-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                data-testid="input-credit-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-description">Note (optional)</Label>
              <Textarea
                id="credit-description"
                placeholder="Reason for credit (e.g., promotion, refund, incentive)"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="input-credit-description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreditDialogSub(null); setCreditAmount(""); setCreditDescription(""); }} data-testid="button-cancel-credits">
              Cancel
            </Button>
            <Button
              onClick={handleAddCredits}
              disabled={!creditAmount || parseFloat(creditAmount) <= 0 || addCreditMutation.isPending}
              data-testid="button-confirm-credits"
            >
              {addCreditMutation.isPending ? "Adding..." : `Add $${creditAmount && parseFloat(creditAmount) > 0 ? parseFloat(creditAmount).toFixed(2) : "0.00"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
