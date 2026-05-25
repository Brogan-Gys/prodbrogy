import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { soundCategories } from "./sanity/soundCategories";
import { schemaTypes } from "./sanity/schemas";
import { structure } from "./sanity/structure";

export default defineConfig({
  name: "prodbrogy",
  title: "ProdBrogy Sound Vault",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "demo-project",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  basePath: "/studio",
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev,
      ...soundCategories.map((category) => ({
        id: `soundAsset-${category.id}`,
        title: category.title,
        schemaType: "soundAsset",
        value: {
          category: category.id,
          credits: 1,
          bpm: 0,
          key: "N/A",
          accent: "volt",
          duration: "0:00"
        }
      }))
    ]
  }
});
