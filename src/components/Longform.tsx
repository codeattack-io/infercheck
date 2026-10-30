import type { ReactNode } from "react";

export const LONGFORM_LINK_CLASS = "text-link underline underline-offset-[0.15em] hover:text-link-hover";

export function LongformPage({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  return (
    <main className="page-width flex-1">
      <article className="flex max-w-longform flex-col gap-4 text-16 leading-[1.6] text-pretty text-text-secondary">
        <h1 className="m-0 pt-5 md:pt-7 md:pb-1">{heading}</h1>
        {children}
      </article>
    </main>
  );
}

export function LongformSection({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-4 flex flex-col gap-4">
      <h2 className="m-0 text-20 font-semibold text-text-primary">{heading}</h2>
      {children}
    </section>
  );
}
