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
import { authClient } from "@/lib/auth-client";
import { trpc, trpcClient } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  // Get user's organizations
  const { data: organizations, refetch: refetchOrgs } = useQuery(
    trpc.myOrganizations.queryOptions()
  );

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string }) =>
      trpcClient.createOrganization.mutate(data),
    onSuccess: () => {
      refetchOrgs();
      setShowCreateForm(false);
      setOrgName("");
      setOrgSlug("");
    },
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  useEffect(() => {
    if (!session && !isPending) {
      navigate({ to: "/login" });
    }
  }, [session, isPending]);

  if (isPending) {
    return <div>Loading...</div>;
  }

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

  // If user has no organizations, show create organization screen
  if (organizations?.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
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
                <p className="text-sm text-gray-500 mt-1">
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
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user has organizations, show organization selector and dashboard
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {session.user.name}</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          Create New Organization
        </Button>
      </div>

      {/* Organizations List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations?.map((org: any) => (
          <Card
            key={org.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                {org.name}
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {org.role}
                </span>
              </CardTitle>
              <CardDescription>
                /{org.slug} • {org.planTier} plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Joined {new Date(org.joinedAt || "").toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Organization Modal/Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
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
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
