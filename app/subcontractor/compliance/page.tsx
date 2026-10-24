"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { ComplianceBanner } from "@/components/portal/ComplianceBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import {
  ShieldCheck,
  FileSignature,
  FolderKanban,
  Upload,
  Download,
  AlertTriangle,
} from "lucide-react";

export default function SubcontractorCompliancePage() {
  const { isSubcontractor, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const coiInputRef = useRef<HTMLInputElement>(null);
  const w9InputRef = useRef<HTMLInputElement>(null);
  const [coiExpiry, setCoiExpiry] = useState("");

  useEffect(() => {
    if (!isLoading && !isSubcontractor) router.push("/subcontractor");
  }, [isSubcontractor, isLoading, router]);

  const { data, isLoading: loadingDocs } = useQuery({
    queryKey: ["/api/compliance"],
    queryFn: async () => {
      const res = await fetch("/api/compliance");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: isSubcontractor,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      docType,
      expiresAt,
    }: {
      file: File;
      docType: "coi" | "w9";
      expiresAt?: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "compliance");
      formData.append("docType", docType);
      if (expiresAt) formData.append("expiresAt", expiresAt);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance"] });
      toast({ title: "Document uploaded", description: "Pending admin review." });
    },
    onError: (e: Error) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading || !isSubcontractor) return null;

  const summary = data?.summary;
  const currentCoi = data?.docs?.find(
    (d: { type: string; isCurrent: boolean }) => d.type === "coi" && d.isCurrent
  );
  const currentW9 = data?.docs?.find(
    (d: { type: string; isCurrent: boolean }) => d.type === "w9" && d.isCurrent
  );

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending_review: "secondary",
      rejected: "destructive",
      expired: "destructive",
    };
    return <Badge variant={variants[status] ?? "outline"}>{status.replace("_", " ")}</Badge>;
  };

  return (
    <PortalShell variant="subcontractor" title="Compliance Documents">
      <ComplianceBanner />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Certificate of Insurance (COI)
            </CardTitle>
            <CardDescription>
              Upload your current COI with expiration date. Required for lead purchases and project assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentCoi && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{currentCoi.fileName}</span>
                  {statusBadge(currentCoi.status)}
                </div>
                {currentCoi.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(currentCoi.expiresAt).toLocaleDateString()}
                  </p>
                )}
                {currentCoi.rejectionReason && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {currentCoi.rejectionReason}
                  </p>
                )}
                {currentCoi.status === "approved" && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/api/documents/${currentCoi.id}/download?source=compliance`}>
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="coi-expiry">Expiration Date</Label>
              <Input
                id="coi-expiry"
                type="date"
                value={coiExpiry}
                onChange={(e) => setCoiExpiry(e.target.value)}
              />
            </div>
            <input
              data-clarity-mask="True"
              ref={coiInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (!coiExpiry) {
                    toast({
                      title: "Expiration required",
                      description: "Please set COI expiration date.",
                      variant: "destructive",
                    });
                    return;
                  }
                  uploadMutation.mutate({ file, docType: "coi", expiresAt: coiExpiry });
                }
              }}
            />
            <Button
              onClick={() => coiInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload COI
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              W-9 Form
            </CardTitle>
            <CardDescription>
              Upload your completed W-9 for tax reporting purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentW9 && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{currentW9.fileName}</span>
                  {statusBadge(currentW9.status)}
                </div>
                {currentW9.rejectionReason && (
                  <p className="text-xs text-destructive">{currentW9.rejectionReason}</p>
                )}
              </div>
            )}
            <input
              data-clarity-mask="True"
              ref={w9InputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate({ file, docType: "w9" });
              }}
            />
            <Button
              onClick={() => w9InputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload W-9
            </Button>
          </CardContent>
        </Card>
      </div>

      {!loadingDocs && summary && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                summary.status === "compliant"
                  ? "default"
                  : summary.status === "expiring_soon"
                    ? "secondary"
                    : "destructive"
              }
              className="text-sm"
            >
              {summary.status.replace("_", " ")}
            </Badge>
          </CardContent>
        </Card>
      )}
    </PortalShell>
  );
}
