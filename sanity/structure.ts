import type { StructureResolver } from "sanity/structure";
import { soundCategories } from "./soundCategories";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("ProdBrogy Vault")
    .items([
      ...soundCategories.map((category) =>
        S.listItem()
          .id(category.id)
          .title(category.title)
          .schemaType("soundAsset")
          .child(
            S.documentTypeList("soundAsset")
              .id(category.id)
              .title(category.title)
              .filter('_type == "soundAsset" && category == $category')
              .params({ category: category.id })
              .initialValueTemplates([S.initialValueTemplateItem(`soundAsset-${category.id}`)])
              .defaultOrdering([{ field: "_createdAt", direction: "desc" }])
          )
      ),
      S.divider(),
      S.listItem()
        .id("all-sounds")
        .title("All Sounds")
        .schemaType("soundAsset")
        .child(
          S.documentTypeList("soundAsset")
            .id("all-sounds")
            .title("All Sounds")
            .defaultOrdering([{ field: "_createdAt", direction: "desc" }])
        )
    ]);
