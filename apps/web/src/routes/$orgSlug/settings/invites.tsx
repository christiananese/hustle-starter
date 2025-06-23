import { RoleBadge } from "@/components/role-badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { setCurrentOrgContext, trpc } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle,
  Clock,
  Mail,
  MoreVertical,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/$orgSlug/settings/invites")({
  component: InvitesPage,
});

function InvitesPage() {
  const { orgSlug } = Route.useParams();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">(
    "member"
  );

  // Queries
  const { data: organizations } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
  });

  const { data: invites, isLoading: invitesLoading } = useQuery({
    ...trpc.listInvites.queryOptions(),
    enabled: !!organizations?.find((org) => org.slug === orgSlug),
  });

  // Mutations
  const createInvite = useMutation({
    ...trpc.createInvite.mutationOptions(),
    onSuccess: () => {
      toast.success("Invitation sent!", {
        description: "The invitation has been sent to the email address.",
      });
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      queryClient.invalidateQueries({
        queryKey: trpc.listInvites.queryKey(),
      });
    },
    onError: (error) => {
      toast.error("Failed to send invitation", {
        description: error.message,
      });
    },
  });

  const resendInvite = useMutation({
    ...trpc.resendInvite.mutationOptions(),
    onSuccess: () => {
      toast.success("Invitation resent!", {
        description: "The invitation has been sent again.",
      });
    },
    onError: (error) => {
      toast.error("Failed to resend invitation", {
        description: error.message,
      });
    },
  });

  const revokeInvite = useMutation({
    ...trpc.revokeInvite.mutationOptions(),
    onSuccess: () => {
      toast.success("Invitation revoked", {
        description: "The invitation has been revoked.",
      });
      queryClient.invalidateQueries({
        queryKey: trpc.listInvites.queryKey(),
      });
    },
    onError: (error) => {
      toast.error("Failed to revoke invitation", {
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

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    createInvite.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
    });
  };

  const getInviteStatusBadge = (invite: any) => {
    if (invite.acceptedAt) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    }

    if (invite.isExpired) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  if (!currentOrg) {
    return <div>Organization not found</div>;
  }

  // Check if user has permission to manage invites (admin or owner)
  const canManageInvites =
    currentOrg.role === "admin" || currentOrg.role === "owner";

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
              <BreadcrumbPage>Invites</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Team Invitations
            </h1>
            <p className="text-muted-foreground">
              Manage pending and sent invitations to your organization.
            </p>
          </div>

          {canManageInvites && (
            <Dialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join {currentOrg.name}. They'll
                    receive an email with instructions to accept.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value: any) => setInviteRole(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendInvite}
                    disabled={createInvite.isPending}
                  >
                    {createInvite.isPending && (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {!canManageInvites && (
          <Alert>
            <AlertDescription>
              You need admin or owner permissions to manage team invitations.
            </AlertDescription>
          </Alert>
        )}

        {/* Invitations List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending & Recent Invitations</CardTitle>
            <CardDescription>
              View and manage all invitations sent to join your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading invitations...</span>
              </div>
            ) : !invites || invites.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No invitations</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't sent any invitations yet.
                </p>
                {canManageInvites && (
                  <Button onClick={() => setIsInviteDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Send First Invitation
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{invite.email}</span>
                          <RoleBadge role={invite.role} />
                          {getInviteStatusBadge(invite)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Invited by {invite.inviterName} on{" "}
                          {new Date(invite.createdAt).toLocaleDateString()}
                          {invite.expiresAt && (
                            <>
                              {" • "}
                              {invite.isExpired ? "Expired" : "Expires"} on{" "}
                              {new Date(invite.expiresAt).toLocaleDateString()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {canManageInvites && invite.isPending && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              resendInvite.mutate({ inviteId: invite.id })
                            }
                            disabled={resendInvite.isPending}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resend Invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              revokeInvite.mutate({ inviteId: invite.id })
                            }
                            disabled={revokeInvite.isPending}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revoke Invitation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
