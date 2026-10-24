import Link from "next/link";
import { GuideButton } from "@/components/layout/site-experience";
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container flex flex-col justify-between gap-4 py-6 md:flex-row md:items-center">
        <div>
          <p className="text-[13px] font-semibold">SMIU Feedback Platform</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Independent student voices. Karachi, Pakistan.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[12px] text-muted-foreground"
        >
          <GuideButton className="text-[12px]">
            How it works & privacy
          </GuideButton>
          <Link href="/feedback" className="hover:text-primary">
            Website feedback
          </Link>
          <span>© {new Date().getFullYear()} ProfAura</span>
        </nav>
      </div>
    </footer>
  );
}
