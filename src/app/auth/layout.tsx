import Link from "next/link";
import { ProfAuraLogo } from "@/components/brand/profaura-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-shell flex min-h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border">
        <div className="container flex h-16 items-center justify-between gap-3">
          <ProfAuraLogo size="md" />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-medium text-muted-foreground hover:text-primary"
            >
              Back to home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main
        id="main-content"
        className="container flex flex-1 items-center justify-center py-5"
      >
        <div className="auth-form w-full max-w-md">{children}</div>
      </main>
      <footer className="site-footer shrink-0 border-t border-border py-3">
        <p className="container text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} SMIU Feedback Platform
        </p>
      </footer>
    </div>
  );
}
