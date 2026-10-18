"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { ComplianceBanner } from "@/components/portal/ComplianceBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function SubcontractorContractsPage() {
  const { isSubcontractor, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signingContract, setSigningContract] = useState<{
    id: string;
    title: string;
    bodyHtml: string;
  } | null>(null);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isSubcontractor) router.push("/subcontractor");
  }, [isSubcontractor, isLoading, router]);

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    queryFn: async () => {
      const res = await fetch("/api/contracts");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isSubcontractor,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          contractId: signingContract?.id,
          signature,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sign failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setSigningContract(null);
      setSignature("");
      setAgreed(false);
      toast({ title: "Contract signed successfully" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading || !isSubcontractor) return null;

  return (
    <PortalShell variant="subcontractor" title="Contracts">
      <ComplianceBanner />
      <div className="space-y-4">
        {contracts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No contracts yet.
            </CardContent>
          </Card>
        ) : (
          contracts.map(
            (c: {
              id: string;
              title: string;
              status: string;
              bodyHtml: string;
              signedPdfUrl?: string | null;
              signedAt?: string | null;
            }) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <Badge variant={c.status === "signed" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-2">
                  {c.status === "sent" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setSigningContract({
                          id: c.id,
                          title: c.title,
                          bodyHtml: c.bodyHtml,
                        })
                      }
                    >
                      Review & Sign
                    </Button>
                  )}
                  {c.signedPdfUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/documents/${c.id}/download?source=contract`}>
                        Download PDF
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          )
        )}
      </div>

      <Dialog open={!!signingContract} onOpenChange={() => setSigningContract(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-clarity-mask="true">
          <DialogHeader>
            <DialogTitle>{signingContract?.title}</DialogTitle>
            <DialogDescription>
              Review the contract and sign with your full legal name.
            </DialogDescription>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none border rounded-lg p-4 max-h-64 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: signingContract?.bodyHtml ?? "" }}
          />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
              <Label htmlFor="agree">I agree to the terms of this contract</Label>
            </div>
            <div className="space-y-2">
              <Label>Type your full name to sign</Label>
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!agreed || !signature.trim() || signMutation.isPending}
              onClick={() => signMutation.mutate()}
            >
              Sign Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}
