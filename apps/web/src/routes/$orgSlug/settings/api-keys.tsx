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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Eye, EyeOff, Key, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/$orgSlug/settings/api-keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { orgSlug } = Route.useParams();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [createdKey, setCreatedKey] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const [showFullKey, setShowFullKey] = useState(false);

  const { data: organizations } = useQuery({
    ...trpc.myOrganizations.queryOptions(),
  });

  const { data: apiKeys, isLoading } = useQuery({
    ...trpc.listApiKeys.queryOptions(),
    enabled: !!orgSlug,
  });

  const createApiKeyMutation = useMutation({
    ...trpc.createApiKey.mutationOptions(),
    onSuccess: (data) => {
      setCreatedKey({ key: data.key, name: data.name });
      setShowCreateDialog(false);
      setNewKeyName("");
      setNewKeyDescription("");
      queryClient.invalidateQueries({
        queryKey: trpc.listApiKeys.queryKey(),
      });
      toast.success("API key created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const revokeApiKeyMutation = useMutation({
    ...trpc.revokeApiKey.mutationOptions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trpc.listApiKeys.queryKey(),
      });
      toast.success(`API key "${data.name}" has been revoked`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke API key");
    },
  });

  const currentOrg = organizations?.find((org: any) => org.slug === orgSlug);

  if (!currentOrg) {
    return <div>Organization not found</div>;
  }

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    createApiKeyMutation.mutate({
      name: newKeyName.trim(),
      description: newKeyDescription.trim() || undefined,
    });
  };

  const handleRevokeApiKey = (keyId: string, keyName: string) => {
    if (
      confirm(
        `Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`
      )
    ) {
      revokeApiKeyMutation.mutate({ keyId });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              <BreadcrumbPage>API Keys</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
            <p className="text-muted-foreground">
              Manage API keys for your organization's integrations.
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for your organization. Make sure to copy
                  it somewhere safe as you won't be able to see it again.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Production API"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What will this API key be used for?"
                    value={newKeyDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewKeyDescription(e.target.value)
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateApiKey}
                  disabled={createApiKeyMutation.isPending}
                >
                  {createApiKeyMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Show created key dialog */}
        {createdKey && (
          <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Your API key "{createdKey.name}" has been created. Make sure
                  to copy it now as you won't be able to see it again.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={
                        showFullKey
                          ? createdKey.key
                          : "sk_live_" + "•".repeat(32)
                      }
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowFullKey(!showFullKey)}
                    >
                      {showFullKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(createdKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreatedKey(null)}>
                  I've copied it
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              These API keys allow external applications to access your
              organization's data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">
                  Loading API keys...
                </p>
              </div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No API keys</h3>
                <p className="text-muted-foreground">
                  Create your first API key to get started with integrations.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key: any) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{key.name}</h4>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {key.maskedKey}
                        </code>
                      </div>
                      {key.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {key.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Created {formatDate(key.createdAt)}</span>
                        {key.lastUsedAt && (
                          <span>Last used {formatDate(key.lastUsedAt)}</span>
                        )}
                        {key.expiresAt && (
                          <span>Expires {formatDate(key.expiresAt)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeApiKey(key.id, key.name)}
                      disabled={revokeApiKeyMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revoke
                    </Button>
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
