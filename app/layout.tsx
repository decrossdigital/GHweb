import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "George Hillman",
  description:
    "George Hillman is a Christian singer, songwriter, and multi-instrumentalist specializing in worship, CCM, and gospel music.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
