"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { AdminSubcontractorPanel } from "@/components/admin/AdminSubcontractorPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function AdminContractorsPage() {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewDoc, setReviewDoc] = useState<{
    id: string;
    type: string;
    fileName: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!isLoading && !isAdmin) router.push("/admin");
  }, [isAdmin, isLoading, router]);

  const { data: dashboard } = useQuery({
    queryKey: ["/api/admin/compliance/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/compliance/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAdmin,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      docId,
      action,
      reason,
    }: {
      docId: string;
      action: "approve" | "reject";
      reason?: string;
    }) => {
      const res = await fetch(`/api/admin/compliance/documents/${docId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/compliance/dashboard"] });
      setReviewDoc(null);
      setRejectionReason("");
      toast({ title: "Document reviewed" });
    },
  });

  const pendingDocs = (dashboard?.compliance?.contractors ?? []).flatMap(
    ({
      user,
      summary,
    }: {
      user: { id: string; firstName?: string; lastName?: string; email?: string };
      summary: { coi: { id: string; fileName: string; status: string } | null; w9: { id: string; fileName: string; status: string } | null };
    }) => {
      const docs = [];
      if (summary.coi?.status === "pending_review") {
        docs.push({ ...summary.coi, type: "coi", user });
      }
      if (summary.w9?.status === "pending_review") {
        docs.push({ ...summary.w9, type: "w9", user });
      }
      return docs;
    }
  );

  if (isLoading || !isAdmin) return null;

  return (
    <PortalShell variant="admin" title="Contractors">
      <div className="space-y-8">
        {pendingDocs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Compliance Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingDocs.map(
                (doc: {
                  id: string;
                  type: string;
                  fileName: string;
                  user: { firstName?: string; lastName?: string; email?: string };
                }) => (
                  <div key={doc.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium text-sm">
                        {[doc.user.firstName, doc.user.lastName].filter(Boolean).join(" ") ||
                          doc.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type.toUpperCase()} · {doc.fileName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/api/documents/${doc.id}/download?source=compliance`}>View</a>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          reviewMutation.mutate({ docId: doc.id, action: "approve" })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setReviewDoc({ id: doc.id, type: doc.type, fileName: doc.fileName })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}

        {reviewDoc && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reject Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3" data-clarity-mask="true">
              <Textarea
                placeholder="Rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() =>
                    reviewMutation.mutate({
                      docId: reviewDoc.id,
                      action: "reject",
                      reason: rejectionReason,
                    })
                  }
                >
                  Confirm Reject
                </Button>
                <Button variant="outline" onClick={() => setReviewDoc(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <AdminSubcontractorPanel />
      </div>
    </PortalShell>
  );
}
