import { GuideButton } from "@/components/layout/site-experience";
export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-border">
      <div className="container flex flex-col justify-between gap-4 py-6 md:flex-row md:items-center">
        <div>
          <p className="text-[13px] font-semibold">SMIU Feedback Platform</p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[12px] text-muted-foreground"
        >
          <GuideButton className="text-[12px]">
            How it works & privacy
          </GuideButton>
          <span>© {new Date().getFullYear()} SMIU Feedback Platform</span>
        </nav>
      </div>
    </footer>
  );
}
