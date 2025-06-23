import { RoleBadge } from "@/components/role-badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { setCurrentOrgContext, trpc } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/$orgSlug/settings/members")({
  component: MembersPage,
});

function MembersPage() {
  const { orgSlug } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: organizations } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
  });

  const currentOrg = organizations?.find((org: any) => org.slug === orgSlug);

  // Set current organization context for TRPC headers
  useEffect(() => {
    if (currentOrg) {
      setCurrentOrgContext({ id: currentOrg.id, slug: currentOrg.slug });
    }
    return () => {
      setCurrentOrgContext(null);
    };
  }, [currentOrg]);

  const { data: orgUsers, isLoading } = useQuery({
    ...trpc.listOrganizationUsers.queryOptions(),
    enabled: !!currentOrg?.id,
  });

  const updateRoleMutation = useMutation({
    ...trpc.updateUserRole.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.listOrganizationUsers.queryKey(),
      });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user role");
    },
  });

  const removeUserMutation = useMutation({
    ...trpc.removeUserFromOrganization.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.listOrganizationUsers.queryKey(),
      });
      toast.success("User removed from organization");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove user");
    },
  });

  if (!currentOrg) {
    return <div>Organization not found</div>;
  }

  const currentUserRole = currentOrg.role;
  const canManageUsers =
    currentUserRole === "admin" || currentUserRole === "owner";

  const handleRoleChange = (
    userId: string,
    newRole: "admin" | "member" | "viewer"
  ) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleRemoveUser = (userId: string, userName: string) => {
    if (
      confirm(
        `Are you sure you want to remove ${userName} from this organization?`
      )
    ) {
      removeUserMutation.mutate({ userId });
    }
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
              <BreadcrumbPage>Members</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Organization Members
            </h1>
            <p className="text-muted-foreground">
              Manage team members and their permissions.
            </p>
          </div>
          {canManageUsers && (
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {orgUsers?.length || 0} member{orgUsers?.length !== 1 ? "s" : ""}{" "}
              in this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading members...</p>
              </div>
            ) : orgUsers && orgUsers.length > 0 ? (
              <div className="space-y-4">
                {orgUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {user.userImage ? (
                          <img
                            src={user.userImage}
                            alt={user.userName}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {user.userName?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.userName || "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.userEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <RoleBadge role={user.role} />
                      {canManageUsers && user.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(user.userId, "admin")
                              }
                              disabled={user.role === "admin"}
                            >
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(user.userId, "member")
                              }
                              disabled={user.role === "member"}
                            >
                              Make Member
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(user.userId, "viewer")
                              }
                              disabled={user.role === "viewer"}
                            >
                              Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleRemoveUser(user.userId, user.userName)
                              }
                              className="text-destructive"
                            >
                              Remove from organization
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground mt-2">No members found</p>
                <p className="text-sm text-muted-foreground">
                  Invite your first team member to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
