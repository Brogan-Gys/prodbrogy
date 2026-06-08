import { defineField, defineType } from "sanity";

const requiredString = (Rule: any) => Rule.required();

export const freeKit = defineType({
  name: "freeKit",
  title: "Free Kit",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: requiredString
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      initialValue: "Sample kit",
      options: {
        list: ["Drum kit", "MIDI kit", "Loop kit", "Sample kit", "Texture pack", "Starter kit", "VST bank"]
      },
      validation: requiredString
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3
    }),
    defineField({
      name: "contents",
      title: "Contents",
      type: "array",
      of: [{ type: "string" }],
      description: "Short labels like one-shots, loops, MIDI, stems."
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: {
        hotspot: true
      }
    }),
    defineField({
      name: "downloadUrl",
      title: "Download URL or R2 Path",
      type: "string",
      description: "Use an R2 path like free-kits/drum-kit.zip, or paste a full download URL.",
      validation: requiredString
    }),
    defineField({
      name: "accent",
      title: "Accent",
      type: "string",
      options: {
        list: ["volt", "coral", "cyan", "plum"]
      },
      initialValue: "volt"
    }),
    defineField({
      name: "published",
      title: "Published",
      type: "boolean",
      initialValue: true
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      initialValue: 0
    })
  ],
  preview: {
    select: {
      title: "title",
      type: "type",
      published: "published"
    },
    prepare({ title, type, published }) {
      return {
        title,
        subtitle: `${type || "Free kit"}${published === false ? " - Draft" : ""}`
      };
    }
  }
});
