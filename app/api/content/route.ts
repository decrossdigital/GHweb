import { revalidatePath } from "next/cache";
import { readContent, writeContent } from "@/lib/content";
import { adminFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

function denied() {
  return Response.json({ error: "Login failed." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await adminFromRequest(request))) return denied();
  try {
    const content = await readContent();
    return Response.json(content, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read content";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await adminFromRequest(request))) return denied();
  try {
    const body: unknown = await request.json();
    const content = await writeContent(body);
    revalidatePath("/");
    return Response.json(content, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save content";
    return Response.json({ error: message }, { status: 400 });
  }
}
