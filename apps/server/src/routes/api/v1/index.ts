import { Hono } from "hono";
import { organizationsApi } from "./organizations";

const v1Api = new Hono();

// Mount all v1 API routes
v1Api.route("/organizations", organizationsApi);

// Future API routes can be added here:
// v1Api.route("/projects", projectsApi);
// v1Api.route("/analytics", analyticsApi);
// v1Api.route("/webhooks", webhooksApi);

export { v1Api };
