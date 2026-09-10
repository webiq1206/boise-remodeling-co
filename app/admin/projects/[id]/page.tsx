"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { PropertyProfileEditor } from "@/components/admin/PropertyProfileEditor";
import type { PropertyProfile } from "@/shared/propertyProfile";

export default function AdminProjectDetailPage() {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [coTitle, setCoTitle] = useState("");
  const [coDescription, setCoDescription] = useState("");
  const [coAmount, setCoAmount] = useState("0");
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !isAdmin) router.push("/admin");
  }, [isAdmin, isLoading, router]);

  const { data, isLoading: loadingProject } = useQuery({
    queryKey: ["/api/admin/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: isAdmin && !!projectId,
  });

  const { data: subcontractors = [] } = useQuery({
    queryKey: ["/api/admin/subcontractors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subcontractors");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/admin/contracts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/contracts");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin,
  });

  const actionMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", projectId] });
      toast({ title: "Updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", projectId] });
      toast({ title: "Project saved" });
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "entity");
      formData.append("entityType", "project");
      formData.append("entityId", projectId);
      formData.append("category", "attachment");
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", projectId] });
      toast({ title: "Document uploaded" });
    },
    onError: (e: Error) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (subcontractorId: string) => {
      const template = templates[0];
      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          projectId,
          subcontractorId,
          templateId: template?.id,
          title: `Contract - ${data?.project?.title}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: async (contract) => {
      await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", contractId: contract.id }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", projectId] });
      toast({ title: "Contract sent for signature" });
    },
  });

  if (isLoading || !isAdmin) return null;

  const project = data?.project;
  const assignments = data?.assignments ?? [];
  const changeOrders = data?.changeOrders ?? [];
  const documents = data?.documents ?? [];

  return (
    <PortalShell variant="admin" title={project?.title ?? "Project"}>
      {loadingProject || !project ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scope">Scope</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="change_orders">Change Orders</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> {project.name}</div>
                <div><span className="text-muted-foreground">Email:</span> {project.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {project.phone}</div>
                <div><span className="text-muted-foreground">Address:</span> {project.address}, {project.city}</div>
                <div><span className="text-muted-foreground">Amount:</span> ${project.contractAmount ? parseFloat(project.contractAmount).toLocaleString() : "TBD"}</div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant="outline">{project.status}</Badge>
                </div>
                {project.leadId && (
                  <div className="sm:col-span-2">
                    <Link href="/admin/leads" className="text-primary underline text-sm">
                      View original lead
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <PropertyProfileEditor
              profile={project.propertyProfile as PropertyProfile | null | undefined}
              saving={updateMutation.isPending}
              onSave={(profile) => updateMutation.mutate({ propertyProfile: profile })}
            />

            <div className="flex gap-2">
              <Select
                value={project.status}
                onValueChange={(v) => updateMutation.mutate({ status: v })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["draft", "active", "on_hold", "completed", "cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="scope" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Scope of Work</Label>
              <Textarea
                defaultValue={project.scopeOfWork ?? ""}
                rows={8}
                onBlur={(e) => updateMutation.mutate({ scopeOfWork: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input
                  defaultValue={project.paymentTerms ?? ""}
                  onBlur={(e) => updateMutation.mutate({ paymentTerms: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contract Amount</Label>
                <Input
                  defaultValue={project.contractAmount ?? ""}
                  onBlur={(e) => updateMutation.mutate({ contractAmount: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="mt-4 space-y-4">
            {assignments.map(
              (a: {
                id: string;
                subcontractorId: string;
                subcontractor: { firstName?: string; lastName?: string; email?: string; company?: string };
                status: string;
              }) => (
                <Card key={a.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {[a.subcontractor.firstName, a.subcontractor.lastName].filter(Boolean).join(" ") || a.subcontractor.email}
                      </p>
                      <p className="text-sm text-muted-foreground">{a.subcontractor.company}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{a.status}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => createContractMutation.mutate(
                          a.subcontractorId
                        )}
                      >
                        Send Contract
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          actionMutation.mutate({
                            action: "remove_assignment",
                            assignmentId: a.id,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Label>Assign Subcontractor</Label>
                <Select value={selectedSub} onValueChange={setSelectedSub}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcontractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcontractors.map(
                      (s: { id: string; firstName?: string; lastName?: string; email?: string }) => (
                        <SelectItem key={s.id} value={s.id}>
                          {[s.firstName, s.lastName].filter(Boolean).join(" ") || s.email}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!selectedSub}
                  onClick={() =>
                    actionMutation.mutate({
                      action: "assign",
                      subcontractorId: selectedSub,
                    })
                  }
                >
                  Assign
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="change_orders" className="mt-4 space-y-4">
            {changeOrders.map(
              (co: { id: string; number: number; title: string; description: string; amountDelta: string; status: string }) => (
                <Card key={co.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">#{co.number} {co.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{co.description}</p>
                        <p className="text-sm mt-1">${co.amountDelta}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline">{co.status}</Badge>
                        {co.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              actionMutation.mutate({
                                action: "update_change_order",
                                changeOrderId: co.id,
                                status: "approved",
                              })
                            }
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Input placeholder="Title" value={coTitle} onChange={(e) => setCoTitle(e.target.value)} />
                <Textarea placeholder="Description" value={coDescription} onChange={(e) => setCoDescription(e.target.value)} />
                <Input placeholder="Amount delta" type="number" value={coAmount} onChange={(e) => setCoAmount(e.target.value)} />
                <Button
                  onClick={() => {
                    actionMutation.mutate({
                      action: "create_change_order",
                      title: coTitle,
                      description: coDescription,
                      amountDelta: coAmount,
                    });
                    setCoTitle("");
                    setCoDescription("");
                    setCoAmount("0");
                  }}
                >
                  Add Change Order
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-4 space-y-4">
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDocMutation.mutate(file);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => docInputRef.current?.click()}
              disabled={uploadDocMutation.isPending}
            >
              Upload Document
            </Button>
            {documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No documents uploaded.</p>
            ) : (
              documents.map((d: { id: string; fileName: string }) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">{d.fileName}</span>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/api/documents/${d.id}/download`}>Download</a>
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-4">
            {(project.internalNotes ?? []).map(
              (n: { text: string; addedAt: string; addedBy: string }, i: number) => (
                <div key={i} className="text-sm border-b pb-2">
                  <p>{n.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.addedAt).toLocaleString()}</p>
                </div>
              )
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add internal note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <Button
                onClick={() => {
                  actionMutation.mutate({ action: "add_note", text: noteText });
                  setNoteText("");
                }}
              >
                Add
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </PortalShell>
  );
}
