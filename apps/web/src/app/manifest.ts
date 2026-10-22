import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProofBridge OS",
    short_name: "ProofBridge",
    description: "Local-first evidence → opportunity workspace. Your data stays in this browser.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#0f6e6e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
