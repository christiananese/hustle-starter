import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Key, Users } from "lucide-react";

interface SubscriptionUsageDisplayProps {
  className?: string;
}

export function SubscriptionUsageDisplay({
  className,
}: SubscriptionUsageDisplayProps) {
  const { data: usage, isLoading } = useQuery({
    ...trpc.getOrganizationUsage.queryOptions(),
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Usage & Limits</CardTitle>
          <CardDescription>Loading usage information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Usage & Limits</CardTitle>
          <CardDescription>Unable to load usage information</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { limits, usage: currentUsage, planTier } = usage;

  const hasNearLimitWarning =
    isNearLimit(currentUsage.members, limits.members) ||
    isNearLimit(currentUsage.apiKeys, limits.apiKeys);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Usage & Limits
          <Badge variant="outline" className="capitalize">
            {planTier} Plan
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor your organization's resource usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Members Usage */}
        <UsageItem
          icon={<Users className="h-4 w-4" />}
          label="Team Members"
          current={currentUsage.members}
          limit={limits.members}
          description="Active members in your organization"
        />

        {/* API Keys Usage */}
        <UsageItem
          icon={<Key className="h-4 w-4" />}
          label="API Keys"
          current={currentUsage.apiKeys}
          limit={limits.apiKeys}
          description="Active API keys for external access"
        />

        {/* Upgrade Notice */}
        {hasNearLimitWarning && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You're approaching your plan limits. Consider upgrading to avoid
              service interruption.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

interface UsageItemProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
  description?: string;
}

function UsageItem({
  icon,
  label,
  current,
  limit,
  description,
}: UsageItemProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= limit;

  const getUsageColor = () => {
    if (isUnlimited) return "text-green-600";
    if (isAtLimit) return "text-red-600";
    if (isNearLimit) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = () => {
    if (isAtLimit) return "bg-red-500";
    if (isNearLimit) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <div>
            <div className="font-medium text-sm">{label}</div>
            {description && (
              <div className="text-xs text-muted-foreground">{description}</div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold ${getUsageColor()}`}>
            {current} {isUnlimited ? "" : `/ ${limit}`}
          </div>
          {isUnlimited && (
            <div className="text-xs text-muted-foreground">Unlimited</div>
          )}
          {!isUnlimited && isAtLimit && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" />
              Limit reached
            </div>
          )}
          {!isUnlimited && isNearLimit && !isAtLimit && (
            <div className="text-xs text-yellow-600">Near limit</div>
          )}
        </div>
      </div>

      {!isUnlimited && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Helper function to check if usage is near limit
function isNearLimit(current: number, limit: number): boolean {
  if (limit === -1) return false; // Unlimited
  return current / limit >= 0.8; // 80% threshold
}

export default SubscriptionUsageDisplay;
