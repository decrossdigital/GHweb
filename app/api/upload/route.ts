import { promises as fs } from "fs";
import path from "path";
import { adminFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
]);

export async function POST(request: Request) {
  if (!(await adminFromRequest(request))) {
    return Response.json({ error: "Login failed." }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an image file" }, { status: 400 });
  }
  const extension = ALLOWED.get(file.type);
  if (!extension) {
    return Response.json({ error: "Use a JPG, PNG, GIF, or WebP image" }, { status: 400 });
  }

  const original = path.basename(file.name).replace(/[^a-zA-Z0-9._-]+/g, "_");
  const stem = original.replace(/\.[^.]+$/, "") || "image";
  const filename = `${stem}${extension}`;
  const directory = path.join(process.cwd(), "public", "images");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return Response.json({ path: `images/${filename}` });
}
