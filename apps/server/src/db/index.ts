import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "./schema/auth";
import * as organizationSchema from "./schema/organization";

// Combine all schemas
const schema = {
  ...authSchema,
  ...organizationSchema,
};

export const db = drizzle(process.env.DATABASE_URL || "", { schema });

// Export all schemas for use in application
export * from "./schema/auth";
export * from "./schema/organization";
