import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DialogProvider } from "@/components/ui/dialog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visual Notebook",
  description: "Quản lý file HTML/Markdown/PDF học tập với trợ lý AI",
};

const themeInit = `(function(){try{var t=localStorage.getItem('vn-dark');if(t==='1'||(t===null&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
