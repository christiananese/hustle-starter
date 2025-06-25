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
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Check, CheckSquare, FolderPlus, User } from "lucide-react";

export const Route = createFileRoute("/$orgSlug/get-started")({
  component: GetStartedPage,
});

// Custom circular progress component
function CircularProgress({ percentage }: { percentage: number }) {
  const circumference = 2 * Math.PI * 20; // radius = 20
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r="20"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx="22"
          cy="22"
          r="20"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-green-500 transition-all duration-300 ease-in-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-gray-700">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

function GetStartedPage() {
  const { orgSlug } = Route.useParams();

  // Get user data
  const { data: user } = useQuery({
    ...trpc.me.queryOptions(),
  });

  // Get current organization data
  const { data: organizations } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
  });

  const currentOrg = organizations?.find((org: any) => org.slug === orgSlug);

  if (!currentOrg) {
    return <div>Organization not found</div>;
  }

  // Calculate profile completion
  const completionItems = [
    {
      id: "name",
      label: "Add your name",
      completed: !!(user?.name && user.name.trim() !== ""),
    },
    {
      id: "avatar",
      label: "Upload profile picture",
      completed: !!(user?.image && user.image.trim() !== ""),
    },
    {
      id: "org-description",
      label: "Add organization description",
      completed: !!(
        currentOrg?.description && currentOrg.description.trim() !== ""
      ),
    },
  ];

  const completedCount = completionItems.filter(
    (item) => item.completed
  ).length;
  const completionPercentage = Math.round(
    (completedCount / completionItems.length) * 100
  );

  return (
    <div className="flex-1 space-y-4">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Get Started</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to {currentOrg.name}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Let's get you set up and ready to make the most of your
            organization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Profile Setup Card */}
          <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Complete Your Profile
                    </CardTitle>
                    <CardDescription>
                      {completedCount} of {completionItems.length} completed
                    </CardDescription>
                  </div>
                </div>
                <CircularProgress percentage={completionPercentage} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {completionItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        item.completed
                          ? "bg-green-500 text-white"
                          : "border-2 border-gray-300"
                      }`}
                    >
                      {item.completed && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span
                      className={`text-sm ${
                        item.completed
                          ? "text-gray-500 line-through"
                          : "text-gray-700"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <Link to="/$orgSlug/settings" params={{ orgSlug }}>
                <Button className="w-full mt-4">
                  <User className="w-4 h-4 mr-2" />
                  Update Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Create First Project Card */}
          <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <FolderPlus className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Create Your First Project
                  </CardTitle>
                  <CardDescription>
                    Set up a new project to organize your work
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Projects help you organize your API keys, team members, and
                resources in one place.
              </p>
              <Button className="w-full">
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>

          {/* Add First Tasks Card */}
          <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100">
                  <CheckSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Add Your First Tasks
                  </CardTitle>
                  <CardDescription>
                    Create tasks to track your progress
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Start organizing your workflow with tasks and milestones to keep
                your team aligned.
              </p>
              <Button className="w-full">
                <CheckSquare className="w-4 h-4 mr-2" />
                Add Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Learn & Explore Section */}
          <Card className="lg:col-span-3 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100">
                  <BookOpen className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Learn & Explore</CardTitle>
                  <CardDescription>
                    Discover all the features available to help you succeed
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Documentation</h4>
                  <p className="text-sm text-gray-600">
                    Learn how to use all the features and integrate with your
                    existing workflow.
                  </p>
                  <Button variant="outline" size="sm">
                    View Docs
                  </Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">API Reference</h4>
                  <p className="text-sm text-gray-600">
                    Explore our comprehensive API documentation and examples.
                  </p>
                  <Button variant="outline" size="sm">
                    API Docs
                  </Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Community</h4>
                  <p className="text-sm text-gray-600">
                    Join our community to get help, share ideas, and connect
                    with other users.
                  </p>
                  <Button variant="outline" size="sm">
                    Join Community
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
