import { sidecar } from "@/lib/board";

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name");
  if (!name) {
    return Response.json({ error: "name required" }, { status: 400 });
  }
  return Response.json(await sidecar(name));
}
