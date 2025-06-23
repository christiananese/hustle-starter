import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";
import type { AppRouter } from "../../../server/src/routers";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

// Global store for current organization context
let currentOrgContext: { id: string; slug: string } | null = null;

export const setCurrentOrgContext = (
  org: { id: string; slug: string } | null
) => {
  currentOrgContext = org;
};

export const getCurrentOrgContext = () => currentOrgContext;

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_SERVER_URL || "http://localhost:3001"}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
      headers() {
        // Use the current organization context if available
        if (currentOrgContext) {
          return {
            "x-organization-id": currentOrgContext.id,
          };
        }
        return {};
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
