import { AppSidebar } from "@/components/app-sidebar";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { trpc, trpcClient } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session, isPending: authPending } = authClient.useSession();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  // Check if we're in create mode from URL params
  const isCreateMode =
    typeof window !== "undefined" &&
    window.location.search.includes("create=true");

  // Get user's organizations
  const {
    data: organizations,
    isLoading: orgLoading,
    refetch: refetchOrgs,
  } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
    enabled: !!session,
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string }) =>
      trpcClient.createOrganization.mutate(data),
    onSuccess: (newOrg) => {
      refetchOrgs();
      setShowCreateForm(false);
      setOrgName("");
      setOrgSlug("");
      // Navigate to the new organization
      navigate({ to: `/${newOrg.slug}`, replace: true });
    },
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  // All useEffect hooks must be at the top before any conditional returns
  useEffect(() => {
    if (!session && !authPending) {
      navigate({ to: "/login" });
    }
  }, [session, authPending, navigate]);

  // If user has organizations, redirect to first org's dashboard (unless creating new org)
  useEffect(() => {
    if (
      organizations &&
      organizations.length > 0 &&
      !orgLoading &&
      !isCreateMode
    ) {
      const firstOrg = organizations[0];
      navigate({ to: `/${firstOrg.slug}`, replace: true });
    }
  }, [organizations, orgLoading, navigate, isCreateMode]);

  // Loading state
  if (authPending || orgLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return null;
  }

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setOrgName(name);
    setOrgSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !orgSlug.trim()) return;

    createOrgMutation.mutate({
      name: orgName.trim(),
      slug: orgSlug.trim(),
    });
  };

  // If user has no organizations OR is in create mode, show create organization screen
  if (!organizations || organizations.length === 0 || isCreateMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plus className="size-6" />
            </div>
            <CardTitle>Welcome to your workspace!</CardTitle>
            <CardDescription>
              Create your first organization to start collaborating with your
              team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Inc."
                  required
                />
              </div>
              <div>
                <Label htmlFor="orgSlug">Organization Slug</Label>
                <Input
                  id="orgSlug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="acme-inc"
                  pattern="^[a-z0-9-]+$"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This will be your organization's URL: /{orgSlug}
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createOrgMutation.isPending}
              >
                {createOrgMutation.isPending
                  ? "Creating..."
                  : "Create Organization"}
              </Button>
              {createOrgMutation.error && (
                <p className="text-sm text-red-500">
                  Error: {createOrgMutation.error.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main dashboard with sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {session.user.name}
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </Button>
          </div>

          {/* Organizations Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations?.map((org: any) => (
              <Card
                key={org.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <span className="text-sm font-semibold">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {org.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span>/{org.slug}</span>
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                          {org.role}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {org.planTier} plan
                    </span>
                    <span className="text-muted-foreground">
                      Joined {new Date(org.joinedAt || "").toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Organizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizations?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active organizations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Paid Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizations?.filter((org: any) => org.planTier !== "free")
                    .length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pro/Enterprise plans
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Owner Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizations?.filter((org: any) => org.role === "owner")
                    .length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Organizations you own
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Member Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizations?.filter((org: any) => org.role !== "owner")
                    .length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Member/Admin roles
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>

      {/* Create Organization Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Organization</CardTitle>
              <CardDescription>
                Add a new organization to collaborate with your team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Acme Inc."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="orgSlug">Organization Slug</Label>
                  <Input
                    id="orgSlug"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    placeholder="acme-inc"
                    pattern="^[a-z0-9-]+$"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createOrgMutation.isPending}
                  >
                    {createOrgMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
                {createOrgMutation.error && (
                  <p className="text-sm text-red-500">
                    Error: {createOrgMutation.error.message}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </SidebarProvider>
  );
}
