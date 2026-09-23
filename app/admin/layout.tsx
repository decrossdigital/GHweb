import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Site admin — George Hillman",
  description: "Edit the text, images, releases, and songs on georgehillman.com.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
