import * as React from "react";

import { Lock } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/*
  Admin ke inner pages ka shared frame.

  Har page do cheezein batata hai: (1) abhi kuch nahi hai, aur (2) jab banega to
  kya karega. Yeh jaan boojh kar likha gaya hai - khali "coming soon" page se
  baad me pata hi nahi chalta ke is route ka scope kya tha.
*/

export interface AdminSectionPageProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  /** Is section me aage kya kya hoga. */
  capabilities: readonly { title: string; body: string }[];
}

export function AdminSectionPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
  capabilities,
}: AdminSectionPageProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EmptyState icon={<Lock />} title={emptyTitle} description={emptyDescription} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planned for this section</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-none space-y-4">
              {capabilities.map((capability) => (
                <li key={capability.title}>
                  <p className="text-sm font-medium text-foreground">{capability.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {capability.body}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
