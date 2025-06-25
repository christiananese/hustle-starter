import { Link, useParams } from "@tanstack/react-router";
import { ArrowRight, Crown, Sparkles, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface UpgradeCalloutProps {
  planTier: string;
  orgId: string;
}

export function UpgradeCallout({ planTier, orgId }: UpgradeCalloutProps) {
  const { orgSlug } = useParams({ from: "/$orgSlug" });
  const [isUpgradeCalloutMinimized, setIsUpgradeCalloutMinimized] =
    useState(false);
  const [isUpgradeCalloutDismissed, setIsUpgradeCalloutDismissed] =
    useState(false);

  // Check if upgrade callout should be shown
  const shouldShowUpgrade =
    planTier !== "pro" &&
    planTier !== "enterprise" &&
    !isUpgradeCalloutDismissed;

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    const minimizedKey = `upgrade-callout-minimized-${orgId}`;
    const dismissedKey = `upgrade-callout-dismissed-${orgId}`;

    const isMinimized = localStorage.getItem(minimizedKey) === "true";
    const isDismissed = localStorage.getItem(dismissedKey) === "true";

    setIsUpgradeCalloutMinimized(isMinimized);
    setIsUpgradeCalloutDismissed(isDismissed);
  }, [orgId]);

  const handleDismissUpgradeCallout = () => {
    const minimizedKey = `upgrade-callout-minimized-${orgId}`;
    localStorage.setItem(minimizedKey, "true");
    setIsUpgradeCalloutMinimized(true);
  };

  const handleReopenUpgradeCallout = () => {
    const minimizedKey = `upgrade-callout-minimized-${orgId}`;
    localStorage.removeItem(minimizedKey);
    setIsUpgradeCalloutMinimized(false);
  };

  // Don't render anything if upgrade shouldn't be shown
  if (!shouldShowUpgrade) {
    return null;
  }

  return (
    <>
      {/* Upgrade Callout - Full version */}
      {!isUpgradeCalloutMinimized && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="w-80 border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-lg text-gray-900">
                    Upgrade to Pro
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismissUpgradeCallout}
                  className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-gray-700">
                Unlock unlimited features and take your organization to the next
                level
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>Unlimited API keys & team members</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>Priority support & advanced analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>Custom integrations & more</span>
                </div>
                <Link
                  to="/$orgSlug/settings/billing"
                  params={{ orgSlug }}
                  search={{ success: false, canceled: false }}
                >
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-md">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Minimized Upgrade Button with Sparkles */}
      {isUpgradeCalloutMinimized && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="relative">
            <Button
              onClick={handleReopenUpgradeCallout}
              className="h-16 w-16 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-2 border-white shadow-2xl hover:shadow-xl transition-all duration-300 group hover:scale-110"
              title="Upgrade to Pro"
            >
              <div className="relative">
                <Crown className="h-7 w-7" />
              </div>
            </Button>
            {/* Sparkles positioned around the button */}
            <div className="absolute -top-2 -right-2 animate-pulse">
              <Sparkles className="h-4 w-4 text-yellow-300 drop-shadow-lg" />
            </div>
            <div className="absolute -bottom-2 -left-2 animate-pulse delay-700">
              <Sparkles className="h-3 w-3 text-yellow-300 drop-shadow-lg" />
            </div>
            <div className="absolute top-1 -left-3 animate-pulse delay-300">
              <Sparkles className="h-2 w-2 text-yellow-300 drop-shadow-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Debug info - remove this after testing */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-20 left-4 bg-black text-white p-2 text-xs z-50 rounded">
          <div>shouldShowUpgrade: {shouldShowUpgrade?.toString()}</div>
          <div>
            isUpgradeCalloutMinimized: {isUpgradeCalloutMinimized.toString()}
          </div>
          <div>planTier: {planTier}</div>
          <div>orgId: {orgId}</div>
        </div>
      )}
    </>
  );
}
