import PlanSelector, { type Plan } from "@/components/plan-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { setCurrentOrgContext, trpc } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/$orgSlug/settings/billing")({
  component: BillingPage,
  validateSearch: (search: Record<string, unknown>) => ({
    success: search.success === "true" || search.success === true,
    canceled: search.canceled === "true" || search.canceled === true,
  }),
});

function BillingPage() {
  const { orgSlug } = Route.useParams();
  const { success, canceled } = useSearch({
    from: "/$orgSlug/settings/billing",
  });
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Queries
  const { data: organizations } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
  });

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    ...trpc.getCurrentSubscription.queryOptions(),
    enabled: !!organizations?.find((org) => org.slug === orgSlug),
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    ...trpc.getPlans.queryOptions(),
  });

  // Mutations
  const createCheckoutSession = useMutation({
    ...trpc.createCheckoutSession.mutationOptions(),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error("Failed to start checkout", {
        description: error.message,
      });
    },
  });

  const createPortalSession = useMutation({
    ...trpc.createPortalSession.mutationOptions(),
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error) => {
      toast.error("Failed to open billing portal", {
        description: error.message,
      });
    },
  });

  const cancelSubscription = useMutation({
    ...trpc.cancelSubscription.mutationOptions(),
    onSuccess: () => {
      toast.success("Subscription canceled", {
        description:
          "Your subscription will end at the current billing period.",
      });
      queryClient.invalidateQueries({
        queryKey: trpc.getCurrentSubscription.queryKey(),
      });
    },
    onError: (error) => {
      toast.error("Failed to cancel subscription", {
        description: error.message,
      });
    },
  });

  const currentOrg = organizations?.find((org) => org.slug === orgSlug);

  // Set current organization context for TRPC headers
  useEffect(() => {
    if (currentOrg) {
      setCurrentOrgContext({ id: currentOrg.id, slug: currentOrg.slug });
    }
    return () => {
      setCurrentOrgContext(null);
    };
  }, [currentOrg]);

  // Handle URL parameters
  useEffect(() => {
    if (success) {
      toast.success("Subscription activated!", {
        description: "Your plan has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["getCurrentSubscription"] });
    }
    if (canceled) {
      toast.info("Checkout canceled", {
        description: "No changes were made to your subscription.",
      });
    }
  }, [success, canceled, queryClient]);

  const handlePlanSelection = (planId: string) => {
    if (planId === "free") {
      // Handle downgrade to free
      if (subscription?.stripeSubscriptionId) {
        if (
          confirm(
            "Are you sure you want to cancel your subscription and downgrade to the free plan?"
          )
        ) {
          cancelSubscription.mutate();
        }
      }
      return;
    }

    if (planId === "enterprise") {
      // Open contact form or email
      window.open(
        "mailto:sales@yourcompany.com?subject=Enterprise Plan Inquiry",
        "_blank"
      );
      return;
    }

    // Handle paid plan upgrades
    if (planId === "basic" || planId === "pro") {
      setSelectedPlan(planId);
      createCheckoutSession.mutate({ planId: planId as "basic" | "pro" });
    }
  };

  const getSubscriptionStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      canceled: { variant: "secondary" as const, label: "Canceled" },
      past_due: { variant: "destructive" as const, label: "Past Due" },
      incomplete: { variant: "outline" as const, label: "Incomplete" },
      trialing: { variant: "outline" as const, label: "Trial" },
      unpaid: { variant: "destructive" as const, label: "Unpaid" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline" as const,
      label: status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!currentOrg) {
    return <div>Organization not found</div>;
  }

  const isLoading = subscriptionLoading || plansLoading;
  const currentPlan = subscription?.planTier || "free";
  const hasActiveSubscription =
    subscription?.stripeSubscriptionId &&
    subscription?.subscriptionStatus === "active";

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={`/${orgSlug}`}>
                {currentOrg.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={`/${orgSlug}/settings`}>
                Settings
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Billing</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's billing and subscription settings.
          </p>
        </div>

        {/* Current Subscription Status */}
        {!isLoading && subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Current Subscription
                {subscription.subscriptionStatus &&
                  getSubscriptionStatusBadge(subscription.subscriptionStatus)}
              </CardTitle>
              <CardDescription>
                Your organization's current plan and billing status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold capitalize">
                    {currentPlan} Plan
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasActiveSubscription
                      ? "Subscription is active and billing normally"
                      : currentPlan === "free"
                        ? "You're on the free plan"
                        : "No active subscription"}
                  </p>
                </div>

                {hasActiveSubscription && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => createPortalSession.mutate()}
                      disabled={createPortalSession.isPending}
                    >
                      {createPortalSession.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Billing
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Alerts */}
        {subscription?.subscriptionStatus === "past_due" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your subscription payment is past due. Please update your payment
              method to avoid service interruption.
            </AlertDescription>
          </Alert>
        )}

        {subscription?.subscriptionStatus === "canceled" && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your subscription has been canceled and will end at the current
              billing period. You can reactivate it at any time.
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your subscription has been successfully updated! Changes may take
              a few minutes to reflect.
            </AlertDescription>
          </Alert>
        )}

        {/* Plan Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>
              Select the plan that best fits your organization's needs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading plans...</span>
              </div>
            ) : plans ? (
              <PlanSelector
                plans={plans as Plan[]}
                currentPlan={currentPlan}
                onSelectPlan={handlePlanSelection}
                loading={createCheckoutSession.isPending && !!selectedPlan}
                disabled={createCheckoutSession.isPending}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Unable to load plans. Please try again later.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>
              Important details about your billing and payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Payment Method</h4>
                <p className="text-sm text-muted-foreground">
                  {hasActiveSubscription
                    ? "Managed through Stripe billing portal"
                    : "No payment method on file"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Billing Cycle</h4>
                <p className="text-sm text-muted-foreground">
                  {hasActiveSubscription ? "Monthly" : "N/A"}
                </p>
              </div>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground space-y-2">
              <p>• All plans are billed monthly in advance</p>
              <p>• You can upgrade, downgrade, or cancel at any time</p>
              <p>• Billing is handled securely through Stripe</p>
              <p>• Need help? Contact our support team</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
