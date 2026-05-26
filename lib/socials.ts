import { Instagram, Send, Star, Youtube, type LucideIcon } from "lucide-react";

export type SocialLink = {
  id: string;
  label: string;
  href: string;
  Icon: LucideIcon;
  tone: string;
};

export const socialLinks: SocialLink[] = [
  {
    id: "instagram",
    label: "Instagram",
    href: "https://instagram.com/prodbrogy",
    Icon: Instagram,
    tone: "bg-coral"
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://youtube.com/@prodbrogy",
    Icon: Youtube,
    tone: "bg-volt"
  },
  {
    id: "beatstars",
    label: "BeatStars",
    href: "https://beatstars.com/prodbrogy",
    Icon: Star,
    tone: "bg-cyan"
  },
  {
    id: "telegram",
    label: "Telegram",
    href: "https://t.me/prodbrogy",
    Icon: Send,
    tone: "bg-white"
  }
];

export const socialBonusLinks = socialLinks.filter((link) => link.id !== "telegram");
