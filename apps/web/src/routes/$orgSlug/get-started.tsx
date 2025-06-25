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
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  FolderPlus,
  Play,
  User,
} from "lucide-react";

export const Route = createFileRoute("/$orgSlug/get-started")({
  component: GetStartedPage,
});

function GetStartedPage() {
  const { orgSlug } = Route.useParams();
  const { data: organizations } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
  });

  const currentOrg = organizations?.find((org: any) => org.slug === orgSlug);

  if (!currentOrg) {
    return <div>Organization not found</div>;
  }

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={`/${orgSlug}`}>Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Get Started</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Get Started with {currentOrg.name}
            </h1>
            <p className="text-muted-foreground">
              Let's help you set up your organization and get the most out of
              our platform.
            </p>
          </div>
        </div>

        {/* Onboarding Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Profile Setup Card */}
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile Setup</CardTitle>
              </div>
              <CardDescription>
                Complete your profile to personalize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span>Add Full Name</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span>Upload Profile Picture</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span>Tell us more about your organization</span>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                <User className="w-4 h-4 mr-2" />
                Complete Profile
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Create First Project Card */}
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-primary" />
                <CardTitle>Create First Project</CardTitle>
              </div>
              <CardDescription>
                Set up your first project to start organizing your work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span>Choose project name</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span>Set project description</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span>Configure project settings</span>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Project
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Add First Tasks Card */}
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <CardTitle>Add First Tasks</CardTitle>
              </div>
              <CardDescription>
                Create your first tasks to start tracking your progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span>Create task templates</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span>Set task priorities</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-muted rounded-full" />
                  <span>Assign team members</span>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                <CheckSquare className="w-4 h-4 mr-2" />
                Add Tasks
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Learn Section (Optional) */}
          <Card className="rounded-xl lg:col-span-3">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Learn & Explore</CardTitle>
              </div>
              <CardDescription>
                Discover advanced features and best practices to maximize your
                productivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Play className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-medium">Quick Start Video</h4>
                    <p className="text-sm text-muted-foreground">
                      5 min tutorial
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-medium">Documentation</h4>
                    <p className="text-sm text-muted-foreground">
                      Complete guide
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <User className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-medium">Community Forum</h4>
                    <p className="text-sm text-muted-foreground">
                      Get help & tips
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
