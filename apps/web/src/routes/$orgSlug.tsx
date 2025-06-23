import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/$orgSlug")({
  component: OrganizationLayout,
});

function OrganizationLayout() {
  const { orgSlug } = Route.useParams();
  const navigate = Route.useNavigate();
  const { data: session, isPending: authPending } = authClient.useSession();

  const { data: organizations, isLoading: orgsLoading } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
    enabled: !!session,
  });

  // Check authentication
  useEffect(() => {
    if (!session && !authPending) {
      navigate({
        to: "/auth/login",
        search: {
          redirect: `/${orgSlug}`,
        },
      });
    }
  }, [session, authPending, navigate, orgSlug]);

  // Check if user has access to this organization
  const currentOrg = organizations?.find((org: any) => org.slug === orgSlug);

  // Loading state
  if (authPending || orgsLoading) {
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

  // Organization not found or no access
  if (!currentOrg) {
    navigate({ to: "/dashboard" });
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar currentOrgSlug={orgSlug} />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
