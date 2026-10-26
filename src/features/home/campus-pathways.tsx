import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { PathwaysHelp } from "@/features/home/pathways-help";
const PATHS = [
  {
    number: "01",
    title: "Teaching & learning",
    body: "Teachers, courses and academic guidance.",
    links: [
      ["Teachers", "/teachers"],
      ["Lab instructors", "/lab-instructors"],
      ["Faculty", "/faculty"],
    ],
  },
  {
    number: "02",
    title: "Life around campus",
    body: "The people who support your university day.",
    links: [
      ["University staff", "/uni-staff"],
      ["HR staff", "/hr-staff"],
      ["Course catalog", "/courses"],
    ],
  },
  {
    number: "03",
    title: "Your next semester",
    body: "Make sense of feedback before your next step.",
    links: [
      ["Student rankings", "/rankings"],
      ["Explore recommendations", "/recommendations"],
    ],
  },
];
export function CampusPathways() {
  return (
    <section
      className="container pt-12 md:pt-16"
      aria-labelledby="pathways-heading"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 id="pathways-heading" className="editorial-title text-3xl">
              What would you like to know?
            </h2>
            <PathwaysHelp />
          </div>
        </div>
      </div>
      <div className="grid gap-0 overflow-hidden rounded-lg border border-border bg-card md:grid-cols-3">
        {PATHS.map((path) => (
          <div
            key={path.number}
            className="pathway-cell border-b border-border p-6 last:border-0 md:border-b-0 md:border-r md:p-7"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-primary">
                EXPLORE / {path.number}
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
            </div>
            <h3 className="mt-5 text-[17px] font-semibold">{path.title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              {path.body}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
              {path.links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  data-tour={href === "/rankings" ? "rankings" : undefined}
                  className="text-[12px] font-medium text-primary underline decoration-primary/25 underline-offset-4 hover:decoration-primary"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
