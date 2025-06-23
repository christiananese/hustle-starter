import { Check, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export interface Plan {
  id: string;
  name: string;
  price: number | null;
  features: readonly string[];
  isCustom: boolean;
}

interface PlanSelectorProps {
  plans: Plan[];
  currentPlan?: string;
  onSelectPlan: (planId: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PlanSelector({
  plans,
  currentPlan,
  onSelectPlan,
  loading = false,
  disabled = false,
}: PlanSelectorProps) {
  const planOrder = ["free", "basic", "pro", "enterprise"];
  const sortedPlans = plans.sort(
    (a, b) => planOrder.indexOf(a.id) - planOrder.indexOf(b.id)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {sortedPlans.map((plan) => {
        const isCurrentPlan = currentPlan === plan.id;
        const isPopular = plan.id === "pro";
        const isFree = plan.id === "free";

        return (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={isCurrentPlan}
            isPopular={isPopular}
            isFree={isFree}
            onSelect={() => onSelectPlan(plan.id)}
            loading={loading}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan: boolean;
  isPopular: boolean;
  isFree: boolean;
  onSelect: () => void;
  loading: boolean;
  disabled: boolean;
}

function PlanCard({
  plan,
  isCurrentPlan,
  isPopular,
  isFree,
  onSelect,
  loading,
  disabled,
}: PlanCardProps) {
  const formatPrice = (priceInCents: number | null) => {
    if (priceInCents === null) return "Custom";
    if (priceInCents === 0) return "Free";
    return `$${(priceInCents / 100).toFixed(0)}`;
  };

  return (
    <Card
      className={`relative transition-all duration-200 hover:shadow-lg ${
        isPopular ? "border-primary ring-2 ring-primary/20" : ""
      } ${isCurrentPlan ? "bg-muted/50" : ""}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <Badge className="bg-primary text-primary-foreground px-3 py-1">
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <div className="mt-2">
          <div className="text-4xl font-bold">
            {formatPrice(plan.price)}
            {plan.price !== null && plan.price > 0 && (
              <span className="text-lg font-normal text-muted-foreground">
                /month
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={isCurrentPlan ? "outline" : "default"}
          onClick={onSelect}
          disabled={isCurrentPlan || disabled || loading}
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isCurrentPlan
            ? "Current Plan"
            : plan.isCustom
              ? "Contact Sales"
              : isFree
                ? "Get Started"
                : "Upgrade"}
        </Button>

        {isCurrentPlan && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            You're currently on this plan
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default PlanSelector;
