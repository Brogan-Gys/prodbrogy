import { defineField, defineType } from "sanity";
import { soundCategories } from "../soundCategories";

const requiredString = (Rule: any) => Rule.required();
const positiveNumber = (Rule: any) => Rule.min(0);

export const soundAsset = defineType({
  name: "soundAsset",
  title: "Sound Asset",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: requiredString
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: soundCategories.map((category) => ({ title: category.title, value: category.id })),
        layout: "radio"
      },
      validation: requiredString
    }),
    defineField({
      name: "producerName",
      title: "Producer Name",
      type: "string",
      description: "Optional credit for a collaborator or producer who helped create this sound."
    }),
    defineField({
      name: "previewUrl",
      title: "Preview URL or R2 Path",
      type: "string",
      description: "Use an R2 path like previews/kit-preview.mp3, or paste a full audio/Mega URL."
    }),
    defineField({
      name: "downloadUrl",
      title: "Download URL or R2 Path",
      type: "string",
      description: "Use an R2 path like downloads/kit.zip, or paste a full direct download URL."
    }),
    defineField({
      name: "bpm",
      title: "BPM",
      type: "number",
      description: "Leave blank for starter sounds that can work at any tempo.",
      validation: positiveNumber
    }),
    defineField({ name: "key", title: "Key", type: "string" }),
    defineField({ name: "mood", title: "Mood", type: "string" }),
    defineField({
      name: "credits",
      title: "Credits",
      type: "number",
      initialValue: 1,
      validation: (Rule) => Rule.required().min(1).max(12)
    }),
    defineField({ name: "duration", title: "Duration", type: "string", initialValue: "0:00" }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }]
    }),
    defineField({
      name: "accent",
      title: "Accent",
      type: "string",
      options: {
        list: ["volt", "coral", "cyan", "plum"]
      },
      initialValue: "volt"
    })
  ],
  preview: {
    select: {
      title: "title",
      category: "category"
    },
    prepare({ title, category }) {
      return {
        title,
        subtitle: category ? category.toUpperCase() : "SOUND ASSET"
      };
    }
  }
});
