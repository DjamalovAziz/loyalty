// @ts-nocheck
import AdminJS from "adminjs";
import { Database, Resource, getModelByName } from "@adminjs/prisma";
import { db } from "~/server/db";

AdminJS.registerAdapter({ Database, Resource });

const { Prisma } = require("@prisma/client");

const adminjsPkg = await import("adminjs");

const AppController = adminjsPkg.AppController;
const ApiController = adminjsPkg.ApiController;
const Router = adminjsPkg.Router;

function resource(modelName: string) {
  return {
    resource: { model: getModelByName(modelName), client: db },
    options: {},
  };
}

const admin = new AdminJS({
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

let initPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = admin.initialize();
  }
  return initPromise;
}

const ADMIN_COOKIE = "adminjs.session";
const AUTH_SECRET = process.env.AUTH_SECRET!;

async function authenticate(
  email: string,
  password: string,
): Promise<{ email: string } | null> {
  if (email === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    return { email };
  }
  return null;
}

function getCurrentAdmin(req: Request): Promise<{ email: string } | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  if (!match) return Promise.resolve(null);
  const raw = match.slice(ADMIN_COOKIE.length + 1);
  try {
    const payload = JSON.parse(
      Buffer.from(raw, "base64").toString("utf8"),
    ) as { email?: string; exp?: number };
    if (payload.exp && Date.now() > payload.exp) return Promise.resolve(null);
    if (payload.email) return Promise.resolve({ email: payload.email });
  } catch {
    // ignore invalid cookie
  }
  return Promise.resolve(null);
}

function parseUrl(urlStr: string): { pathname: string; search: string } {
  const [pathname, search] = urlStr.split("?");
  return { pathname, search: search ?? "" };
}

function splitPath(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

type RouteMatch = {
  method: string;
  action: string;
  controller: "app" | "api";
  params: Record<string, string>;
};

function matchRoute(
  pathParts: string[],
  routePath: string,
): Record<string, string> | null {
  const routeParts = routePath.split("/").filter(Boolean);
  if (pathParts.length !== routeParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const pathPart = pathParts[i];
    if (routePart.startsWith("{") && routePart.endsWith("}")) {
      const key = routePart.slice(1, -1);
      params[key] = decodeURIComponent(pathPart);
    } else if (routePart !== pathPart) {
      return null;
    }
  }
  return params;
}

function findMatchingRoute(
  method: string,
  urlPathname: string,
): RouteMatch | null {
  const pathParts = splitPath(urlPathname);
  for (const route of Router.routes) {
    if (route.method !== method) continue;
    const params = matchRoute(pathParts, route.path);
    if (params) {
      const controller =
        route.Controller === AppController ? "app" : "api";
      return {
        method: route.method,
        action: route.action,
        controller,
        params,
      };
    }
  }
  return null;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  await ensureInitialized();

  const currentAdmin = await getCurrentAdmin(request);
  if (!currentAdmin) {
    const adminAny = admin as any;
    return new Response(
      adminAny.renderLogin({ errorMessage: undefined }),
      { status: 401, headers: { "content-type": "text/html" } },
    );
  }

  const { pathname } = parseUrl(request.url);
  const url = new URL(request.url);
  const query: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const match = findMatchingRoute("GET", pathname);
  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  try {
    if (match.controller === "app") {
      const controller = new AppController({ admin }, currentAdmin);
      const result = await (controller as any)[match.action]({
        params: match.params,
        query,
      });
      return new Response(result, {
        headers: { "content-type": "text/html" },
      });
    }

    const controller = new ApiController({ admin }, currentAdmin);
    const actionRequest = {
      params: match.params,
      query,
      payload: undefined,
      method: "get" as const,
    };
    const result = await (controller as any)[match.action](
      actionRequest,
      undefined,
    );
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("AdminJS route error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  await ensureInitialized();

  const currentAdmin = await getCurrentAdmin(request);
  if (!currentAdmin) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const { pathname } = parseUrl(request.url);
  const url = new URL(request.url);
  const query: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let payload: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      payload = await request.json();
    } catch {
      // ignore parse errors, leave payload empty
    }
  }

  const match = findMatchingRoute("POST", pathname);
  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const controller = new ApiController({ admin }, currentAdmin);
    const actionRequest = {
      params: match.params,
      query,
      payload,
      method: "post" as const,
    };
    const result = await (controller as any)[match.action](
      actionRequest,
      undefined,
    );
    if (result?.redirectUrl) {
      return new Response(null, {
        status: 302,
        headers: { Location: result.redirectUrl },
      });
    }
    return new Response(JSON.stringify(result ?? {}), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("AdminJS POST route error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}


