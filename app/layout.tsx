import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  title: "KOL Tracker - Affiliate Branding",
  description: "Kelola dan tracking KOL Affiliate Branding",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={geist.className}>
        {children}
      </body>
    </html>
  );
}