"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { SubcontractorHomeDashboard } from "@/components/subcontractor/SubcontractorHomeDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { familyButtonClass } from "@/components/family/Button";
import { Shield, Leaf, Building2, ArrowRight, CheckCircle } from "lucide-react";

export default function SubcontractorPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isSubcontractor, isAdmin } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    
    // If admin, redirect to admin portal
    if (isAuthenticated && isAdmin) {
      router.push("/admin/dashboard");
      return;
    }
    
    // If authenticated as subcontractor, show portal home
    if (isAuthenticated && isSubcontractor) {
      return;
    }
  }, [isLoading, isAuthenticated, isSubcontractor, isAdmin, router]);

  const handleLogin = () => {
    window.location.href = "/api/login?returnTo=/subcontractor";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Leaf className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && isSubcontractor) {
    return <SubcontractorHomeDashboard />;
  }

  // Show login page if not authenticated
  return (
    <div className="min-h-screen bg-background" data-testid="page-subcontractor-login">
      {/* Hero Section */}
      <section className="container px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-serif tracking-tight text-foreground">
              Grow your remodeling business
            </h2>
            <p className="text-lg text-muted-foreground">
              Join our network of trusted subcontractors and get access to verified leads in the Kuna, Meridian, and Boise areas. Only pay for the leads you want.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-foreground/50 shrink-0" />
                <span>Pre-qualified leads with verified contact information</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-foreground/50 shrink-0" />
                <span>Only pay for leads you purchase - no monthly fees</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-foreground/50 shrink-0" />
                <span>Bulk discounts: 5% off 3+ leads, 10% off 5+, 20% off 10+</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-foreground/50 shrink-0" />
                <span>Email notifications when new leads match your preferences</span>
              </div>
            </div>
            <button
              type="button"
              className={familyButtonClass({ variant: "hero", size: "lg" })}
              onClick={handleLogin}
              data-testid="button-login"
            >
              Sign in to portal
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4">
            <Card className="border-primary/20 dark:border-primary/30">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Verified leads</CardTitle>
                <CardDescription>
                  Every lead goes through our review process before becoming available. We verify contact information and project details so you can focus on winning the job.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 dark:border-primary/30">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-2">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Local service area</CardTitle>
                <CardDescription>
                  We focus on Boise, Meridian, Nampa, Eagle, Kuna, Caldwell, and Star, across Ada County and Canyon County. Leads come from property owners in that service area.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-y-sm section-divider py-16">
        <div className="container px-4">
          <h3 className="text-2xl font-bold text-center mb-12">How it works</h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="brc-display-num tabular-nums w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-light flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold mb-2">Sign up</h4>
              <p className="text-sm text-muted-foreground">Create your free account and accept the subcontractor agreement</p>
            </div>
            <div className="text-center">
              <div className="brc-display-num tabular-nums w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-light flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold mb-2">Browse leads</h4>
              <p className="text-sm text-muted-foreground">View available leads with service details, location, and quote estimates</p>
            </div>
            <div className="text-center">
              <div className="brc-display-num tabular-nums w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-light flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold mb-2">Purchase leads</h4>
              <p className="text-sm text-muted-foreground">Buy the leads you want. Contact info is revealed after purchase</p>
            </div>
            <div className="text-center">
              <div className="brc-display-num tabular-nums w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-light flex items-center justify-center mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold mb-2">Win the job</h4>
              <p className="text-sm text-muted-foreground">Reach out to the homeowner, provide your quote, and close the deal</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container px-4 py-16">
        <Card className="bg-inverse border-0 text-inverse-foreground">
          <CardContent className="py-12 text-center">
            <h3 className="text-2xl font-serif mb-4">Ready to grow your business?</h3>
            <p className="text-inverse-muted mb-8 max-w-2xl mx-auto">
              Join our network today and start receiving high-quality remodeling leads. No monthly fees, no commitments: only pay for the leads you want.
            </p>
            <button
              type="button"
              className={familyButtonClass({ variant: "hero", size: "lg" })}
              onClick={handleLogin}
              data-testid="button-login-cta"
            >
              Get started now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
