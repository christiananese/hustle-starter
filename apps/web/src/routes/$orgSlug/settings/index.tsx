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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/$orgSlug/settings/")({
  component: OrganizationSettings,
});

function OrganizationSettings() {
  const { orgSlug } = Route.useParams();
  const { data: organizations } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
  });

  const currentOrg = organizations?.find((org: any) => org.slug === orgSlug);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    website: "",
    description: "",
  });

  useEffect(() => {
    // Populate form when org data is loaded
    if (currentOrg) {
      setFormData({
        name: currentOrg.name || "",
        slug: currentOrg.slug || "",
        email: (currentOrg as any).email || "",
        website: (currentOrg as any).website || "",
        description: currentOrg.description || "",
      });
    }
  }, [currentOrg]);

  if (!currentOrg) {
    return <div>Organization not found</div>;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // TODO: Implement save functionality with TRPC mutation
    console.log("Saving org settings:", formData);
  };

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
              <BreadcrumbPage>General</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's general information and settings.
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your organization's basic details and information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter organization name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="orgSlug">Organization Slug</Label>
                <Input
                  id="orgSlug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange("slug", e.target.value)}
                  placeholder="organization-slug"
                  pattern="^[a-z0-9-]+$"
                />
                <p className="text-sm text-muted-foreground">
                  This is your organization's unique identifier in URLs.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="orgEmail">Contact Email</Label>
                <Input
                  id="orgEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@organization.com"
                />
                <p className="text-sm text-muted-foreground">
                  Primary contact email for this organization.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="orgWebsite">Website</Label>
                <Input
                  id="orgWebsite"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://www.organization.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="orgDescription">Description</Label>
                <textarea
                  id="orgDescription"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Brief description of your organization"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Logo</CardTitle>
              <CardDescription>
                Upload and manage your organization's logo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-lg bg-muted border-2 border-dashed">
                  <span className="text-2xl font-semibold text-muted-foreground">
                    {currentOrg.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <Button variant="outline" disabled>
                    Upload Logo
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Logo upload functionality coming soon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
