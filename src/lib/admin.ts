import AdminJS from "adminjs";
import { Database, Resource, getModelByName } from "@adminjs/prisma";
import { db } from "~/server/db";

AdminJS.registerAdapter({ Database, Resource });

// Dynamic import of the generated Prisma DMMF is required because AdminJS's
// Prisma adapter needs the raw model metadata, not the client instance.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Prisma } = require("@prisma/client");

function resource(modelName: string) {
  return {
    resource: { model: getModelByName(modelName), client: db },
    options: {},
  };
}

export const admin = new AdminJS({
  rootPath: "/admin",
  resources: [
    resource("User"),
    resource("Business"),
    resource("Client"),
    resource("LoyaltyTier"),
    resource("LoyaltyRule"),
    resource("Transaction"),
  ],
  branding: {
    companyName: "loyalty — Super Admin",
  },
});
