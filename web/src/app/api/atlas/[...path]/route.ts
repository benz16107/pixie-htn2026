import { API } from "@/lib/live";

// Same-origin proxy to the desk API: the browser can then stream SSE without CORS,
// and the demo works wherever the laptop serves the web app from.
export const dynamic = "force-dynamic";

const target = (req: Request, path: string[]) => `${API}/${path.join("/")}${new URL(req.url).search}`;

export async function GET(req: Request, ctx: RouteContext<"/api/atlas/[...path]">) {
  const { path } = await ctx.params;
  const res = await fetch(target(req, path), { headers: { accept: req.headers.get("accept") ?? "*/*" }, cache: "no-store" });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store, no-transform",
    },
  });
}

export async function POST(req: Request, ctx: RouteContext<"/api/atlas/[...path]">) {
  const { path } = await ctx.params;
  const res = await fetch(target(req, path), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
  });
  return new Response(res.body, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}
