export type FreeKit = {
  id: string;
  title: string;
  type: string;
  accent: "volt" | "coral" | "cyan" | "plum";
  description: string;
  contents: string[];
  imageUrl?: string;
  downloadUrl?: string;
};
