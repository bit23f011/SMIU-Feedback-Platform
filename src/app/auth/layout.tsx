import Link from "next/link";
import { ProfAuraLogo } from "@/components/brand/profaura-logo";
import { getActiveHomeImages } from "@/features/home/home-images-data";
export default async function AuthLayout({children}:{children:React.ReactNode}) {
  const images=await getActiveHomeImages();
  return <div className="flex min-h-dvh flex-col bg-background">
    <header className="border-b border-border"><div className="container flex h-16 items-center justify-between gap-4"><ProfAuraLogo size="md"/><Link href="/" className="text-xs font-medium text-muted-foreground hover:text-primary">Back to campus feedback</Link></div></header>
    <main id="main-content" className="container grid flex-1 items-center gap-12 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20">
      <section className="relative hidden min-h-[550px] overflow-hidden rounded-lg bg-surface lg:flex lg:flex-col lg:justify-end">
        {images[0]?<img src={images[0].url} alt="" className="absolute inset-0 size-full object-cover" />:null}
        <div className="absolute inset-0 bg-background/80"/>
        <div className="relative p-10"><p className="eyebrow">Students helping students</p><h1 className="editorial-title mt-5 max-w-[380px] text-[3.2rem] leading-[1.1]">Experience speaks.<br/>Let yours help.</h1><p className="mt-5 max-w-[330px] text-sm leading-7 text-ink-700">Share what you know about teaching and campus life. Your next batch will thank you.</p><p className="mt-10 border-t border-primary/15 pt-5 text-xs text-muted-foreground">Your name and student ID stay off public reviews.</p></div>
      </section>
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
    <footer className="border-t border-border py-5"><div className="container flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground"><span>SMIU Feedback Platform</span><span>Independent student feedback · Karachi</span></div></footer>
  </div>;
}
