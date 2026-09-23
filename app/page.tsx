import type { Metadata } from "next";
import { PublicSite } from "@/components/PublicSite";
import { readContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await readContent();
  return {
    title: content.meta.title,
    description: content.meta.description,
    keywords: content.meta.keywords,
    authors: [{ name: content.meta.author }],
  };
}

export default async function HomePage() {
  const content = await readContent();
  return <PublicSite content={content} />;
}
