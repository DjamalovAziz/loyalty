import "~/styles/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { ThemeToggle } from "~/components/ThemeToggle";

export const metadata = {
  title: "LoyaltySphere",
  description: "Telegram-native loyalty platform for Central Asian businesses",
};

// Runs before React hydrates — reads the stored choice (or system preference) and
// sets the .dark class immediately, so there's no flash of the wrong theme on load.
const noFlashScript = `
(function () {
  try {
    var stored = localStorage.getItem("loyaltysphere-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <TRPCReactProvider>
          <div className="fixed right-4 top-4 z-50 flex gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}