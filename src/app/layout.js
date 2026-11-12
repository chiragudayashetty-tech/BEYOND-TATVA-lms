import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import TopLoader from "@/components/TopLoader";
import { inAppScript } from "@/lib/android-app";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata = {
  title: "Beyond Tatva",
  description: "AI education for Grades 8–10",
  metadataBase: new URL("https://learn.beyondtatva.in"),
  openGraph: {
    type: "website",
    siteName: "Beyond Tatva",
    title: "AI Superheroes · Beyond Tatva",
    description: "A practical AI course for school students, Grades 8–10. Module 0 is free.",
    images: [{ url: "/media/og-image.jpg", width: 1200, height: 630, alt: "AI Superheroes: a practical AI course for Grades 8–10" }],
  },
  twitter: { card: "summary_large_image", images: ["/media/og-image.jpg"] },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Beyond Tatva", statusBarStyle: "default" },
};

export const viewport = { themeColor: "#4f46e5" };

// Applies the saved theme before first paint so dark mode never flashes light.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
// Capture Android's install event before React hydrates the student dashboard.
const installPromptScript = `if(/Android.*Mobile|iPhone|iPod/i.test(navigator.userAgent))window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__btInstallPrompt=e})`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: installPromptScript }} />
        <script dangerouslySetInnerHTML={{ __html: inAppScript }} />
      </head>
      <body className="min-h-full font-sans"><TopLoader />{children}</body>
    </html>
  );
}
