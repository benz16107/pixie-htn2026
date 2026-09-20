import { API } from "@/lib/live";

// Same-origin proxy to the desk API: the browser can then stream SSE without CORS,
// and the demo works wherever the laptop serves the web app from.
export const dynamic = "force-dynamic";

const target = (req: Request, path: string[]) => `${API}/${path.join("/")}${new URL(req.url).search}`;

const down = (e: unknown) =>
  // The desk API restarts during a run; say so plainly instead of throwing a 500 page.
  new Response(JSON.stringify({ error: "desk API unreachable", detail: String(e) }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });

export async function GET(req: Request, ctx: RouteContext<"/api/atlas/[...path]">) {
  const { path } = await ctx.params;
  const range = req.headers.get("range");
  let res: Response;
  try {
    res = await fetch(target(req, path), {
      headers: { accept: req.headers.get("accept") ?? "*/*", ...(range ? { range } : {}) },
      cache: "no-store",
    });
  } catch (e) {
    return down(e);
  }
  const headers = new Headers({
    "content-type": res.headers.get("content-type") ?? "application/json",
    "cache-control": "no-store, no-transform",
  });
  // Without these the briefing MP3 cannot be seeked: the browser refuses to move the playhead in a
  // response it cannot range-request.
  for (const h of ["accept-ranges", "content-range", "content-length"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers });
}

export async function POST(req: Request, ctx: RouteContext<"/api/atlas/[...path]">) {
  const { path } = await ctx.params;
  let res: Response;
  try {
    res = await fetch(target(req, path), { method: "POST", headers: { "content-type": "application/json" }, body: await req.text() });
  } catch (e) {
    return down(e);
  }
  return new Response(res.body, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}
