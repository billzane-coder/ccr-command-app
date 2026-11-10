import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CCR Commander — The Ultimate Rebreather Companion",
    short_name: "CCR Commander",
    description:
      "Technical CCR Decompression, Run-Up, Checklists & Emergency Drill Suite",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "portrait",
  };
}