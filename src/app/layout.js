import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata = {
  title: "Beyond Tatva",
  description: "AI education for Grades 8–10",
  icons: { icon: "/brand/mark-trim.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: {
    capable: true,
    title: "Beyond Tatva",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#4f46e5",
};

// Applies the saved theme before first paint so dark mode never flashes light.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
const installCaptureScript = `window.__btInstallPrompt=window.__btInstallPrompt||null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__btInstallPrompt=e})`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: installCaptureScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
