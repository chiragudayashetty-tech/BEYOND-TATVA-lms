// Beyond Tatva's social pages (shown in the profile, help page and login screen).
export const SOCIAL = [
  { name: "Instagram", href: "https://www.instagram.com/beyond.tatva" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/beyondtatva/" },
  { name: "Facebook", href: "https://www.facebook.com/share/1CWgEJfXV1/" },
];

// WhatsApp support link, optionally with a prefilled message. null when no number is configured.
export function supportWhatsApp(text) {
  const n = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "");
  if (n.length < 8) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
