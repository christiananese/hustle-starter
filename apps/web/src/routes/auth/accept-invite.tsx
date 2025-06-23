import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2,
  Mail,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/accept-invite")({
  component: AcceptInvitePage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || "",
  }),
});

function AcceptInvitePage() {
  const { token } = useSearch({ from: "/auth/accept-invite" });
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user is already authenticated
  const { data: currentUser } = useQuery({
    ...trpc.me.queryOptions(),
    retry: false,
  });

  // Get invite details
  const {
    data: inviteDetails,
    isLoading: inviteLoading,
    error: inviteError,
  } = useQuery({
    ...trpc.acceptInvite.queryOptions({ token }),
    enabled: !!token,
    retry: false,
  });

  // Complete invite acceptance
  const completeAcceptance = useMutation({
    ...trpc.completeInviteAcceptance.mutationOptions(),
    onSuccess: (result) => {
      toast.success("Welcome to the team!", {
        description: "You've successfully joined the organization.",
      });

      // Navigate to the organization dashboard
      navigate({
        to: `/${result.organizationId}`,
        replace: true,
      });
    },
    onError: (error) => {
      toast.error("Failed to accept invitation", {
        description: error.message,
      });
      setIsProcessing(false);
    },
  });

  // Auto-accept if user is authenticated and invite is valid
  useEffect(() => {
    if (currentUser && inviteDetails && !isProcessing) {
      setIsProcessing(true);
      completeAcceptance.mutate({
        token,
        userId: currentUser.id,
      });
    }
  }, [currentUser, inviteDetails, token, isProcessing]);

  // Show loading state while checking invite
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Invalid Invite Link
              </h2>
              <p className="text-muted-foreground mb-4">
                This invite link appears to be invalid or incomplete.
              </p>
              <Button onClick={() => navigate({ to: "/auth/login" })}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Checking Invitation
              </h2>
              <p className="text-muted-foreground">
                Please wait while we verify your invitation...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteError || !inviteDetails) {
    const errorMessage =
      inviteError?.message || "Invalid or expired invitation";

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invitation Issue</h2>
              <p className="text-muted-foreground mb-4">{errorMessage}</p>

              <div className="space-y-2">
                <Button onClick={() => navigate({ to: "/auth/login" })}>
                  Go to Login
                </Button>
                <div className="text-sm text-muted-foreground">
                  If you believe this is an error, please contact the person who
                  invited you.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is authenticated and processing
  if (currentUser && (isProcessing || completeAcceptance.isPending)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Joining Organization
              </h2>
              <p className="text-muted-foreground">
                Please wait while we add you to {inviteDetails.organizationName}
                ...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User needs to authenticate first
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">You're Invited!</CardTitle>
            <CardDescription>
              You've been invited to join{" "}
              <strong>{inviteDetails.organizationName}</strong> as a{" "}
              <strong>{inviteDetails.role}</strong>.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <UserCheck className="h-4 w-4" />
              <AlertDescription>
                <strong>Invitation for:</strong> {inviteDetails.email}
                <br />
                <strong>Role:</strong> {inviteDetails.role}
                <br />
                <strong>Organization:</strong> {inviteDetails.organizationName}
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                To accept this invitation, you need to sign in or create an
                account with the email address{" "}
                <strong>{inviteDetails.email}</strong>.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1"
                  onClick={() =>
                    navigate({
                      to: "/auth/login",
                      search: {
                        redirect: `/auth/accept-invite?token=${token}`,
                        email: inviteDetails.email,
                      },
                    })
                  }
                >
                  Sign In
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    navigate({
                      to: "/auth/signup",
                      search: {
                        redirect: `/auth/accept-invite?token=${token}`,
                        email: inviteDetails.email,
                      },
                    })
                  }
                >
                  Create Account
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground pt-4 border-t">
                <p>
                  <strong>Important:</strong> You must use the email address{" "}
                  <code className="bg-gray-100 px-1 rounded">
                    {inviteDetails.email}
                  </code>{" "}
                  to accept this invitation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This shouldn't happen, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitation Processed</h2>
            <p className="text-muted-foreground mb-4">
              Your invitation is being processed. You should be redirected
              shortly.
            </p>
            <Button onClick={() => navigate({ to: "/dashboard" })}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
