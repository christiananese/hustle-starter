import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  role: "owner" | "admin" | "member" | "viewer";
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const roleConfig = {
    owner: {
      label: "Owner",
      variant: "destructive" as const,
      className:
        "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-300",
    },
    admin: {
      label: "Admin",
      variant: "secondary" as const,
      className:
        "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-300",
    },
    member: {
      label: "Member",
      variant: "default" as const,
      className:
        "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
    },
    viewer: {
      label: "Viewer",
      variant: "outline" as const,
      className:
        "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
    },
  };

  const config = roleConfig[role];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
