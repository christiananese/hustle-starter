import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  ChevronRight,
  CreditCard,
  Home,
  Key,
  Mail,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import * as React from "react";

import { ModeToggle } from "@/components/mode-toggle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const getNavigationItems = (orgSlug?: string) => [
  {
    title: "Dashboard",
    url: orgSlug ? `/${orgSlug}` : "/dashboard",
    icon: Home,
  },
  {
    title: "Team",
    url: orgSlug ? `/${orgSlug}/team` : "/team",
    icon: Users,
  },
];

const getSettingsItems = (orgSlug?: string) => [
  {
    title: "General",
    url: orgSlug ? `/${orgSlug}/settings` : "/settings",
    icon: Settings,
  },
  {
    title: "Members",
    url: orgSlug ? `/${orgSlug}/settings/members` : "/settings/members",
    icon: Users,
  },
  {
    title: "Invites",
    url: orgSlug ? `/${orgSlug}/settings/invites` : "/settings/invites",
    icon: Mail,
  },
  {
    title: "Billing",
    url: orgSlug ? `/${orgSlug}/settings/billing` : "/settings/billing",
    icon: CreditCard,
  },
  {
    title: "API Keys",
    url: orgSlug ? `/${orgSlug}/settings/api-keys` : "/settings/api-keys",
    icon: Key,
  },
];

export function AppSidebar({
  currentOrgSlug,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  currentOrgSlug?: string;
}) {
  const { data: session } = authClient.useSession();
  const { data: organizations, isLoading } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
    enabled: !!session,
  });

  // Find current org by slug, or fall back to first org
  const currentOrg = currentOrgSlug
    ? organizations?.find((org: any) => org.slug === currentOrgSlug)
    : organizations?.[0];

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/auth/login";
  };

  const handleCreateOrg = () => {
    // Navigate to dashboard with a query parameter to force showing create form
    window.location.href = "/dashboard?create=true";
  };

  const handleOrgSwitch = (orgSlug: string) => {
    // Navigate to the selected organization's dashboard
    window.location.href = `/${orgSlug}`;
  };

  if (!session) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <Sidebar {...props}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </Sidebar>
    );
  }

  // If no organizations, don't render sidebar (dashboard will handle this case)
  if (!organizations || organizations.length === 0 || !currentOrg) {
    return null;
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Building2 className="size-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none overflow-hidden">
                      <span className="font-medium truncate">
                        {currentOrg.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {currentOrg.planTier} • {currentOrg.role}
                      </span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations?.map((org: any) => (
                  <DropdownMenuItem
                    key={org.id}
                    className="flex items-center gap-2"
                    onClick={() => handleOrgSwitch(org.slug)}
                  >
                    <div className="flex size-6 items-center justify-center rounded bg-muted">
                      <Building2 className="size-3" />
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-sm truncate">{org.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {org.planTier} • {org.role}
                      </span>
                    </div>
                    {currentOrg?.id === org.id && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleCreateOrg}
                  className="flex items-center gap-2"
                >
                  <Plus className="size-4" />
                  Create Organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getNavigationItems(currentOrgSlug).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full">
                      <Settings className="size-4" />
                      <span>Settings</span>
                      <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {getSettingsItems(currentOrgSlug).map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild>
                            <Link to={item.url}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || ""}
                        className="size-6 rounded-full"
                      />
                    ) : (
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                        <span className="text-xs font-medium">
                          {getUserInitials(session.user.name || "U")}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 leading-none overflow-hidden">
                      <span className="text-sm truncate">
                        {session.user.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {session.user.email}
                      </span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-64">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/settings")}
                >
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Theme</span>
                    <ModeToggle />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
