// About page — why this directory exists, who built it, and how to contribute.
// React Server Component — no client-side data needed.

import type { Metadata } from "next";
import Link from "next/link";

// ─── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "About — GDPR AI Directory",
  description:
    "Why the GDPR AI Directory exists, who built it, and how to report outdated or missing provider information.",
  openGraph: {
    title: "About — GDPR AI Directory",
    description:
      "Built by a German developer who needed a neutral, sourced reference for GDPR-compliant AI inference providers.",
    type: "website",
  },
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? "#";
const NEW_ISSUE_URL = `${GITHUB_REPO}/issues/new?template=report-change.yml`;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <>
      <main
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "56px 24px 96px",
        }}
      >
        {/* ── Page heading ── */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 2.75rem)",
            fontWeight: 400,
            color: "var(--color-heading)",
            lineHeight: 1.15,
            marginBottom: "12px",
            letterSpacing: "-0.02em",
          }}
        >
          About this directory
        </h1>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "1.0625rem",
            color: "var(--color-text-secondary)",
            lineHeight: 1.65,
            marginBottom: "48px",
            maxWidth: "600px",
          }}
        >
          A neutral, sourced reference for GDPR compliance across AI inference
          providers — built because no such resource existed.
        </p>

        {/* ── Divider ── */}
        <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", marginBottom: "48px" }} />

        {/* ── Why this exists ── */}
        <section style={{ marginBottom: "48px" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 400,
              color: "var(--color-heading)",
              marginBottom: "16px",
              letterSpacing: "-0.01em",
            }}
          >
            Why this exists
          </h2>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-primary)",
              lineHeight: 1.75,
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <p>
              I built this for myself. As a developer building SaaS products in Germany, every time I
              evaluated a new AI inference provider I had to answer the same questions: Where does the
              data go at inference time? Is there a DPA I can actually sign? Does the provider train
              on my users&apos; inputs? Is there an EU-only routing option?
            </p>
            <p>
              Those questions don&apos;t have a single place to look them up. You end up digging through
              privacy policies, data processing addenda, and support docs — for every provider,
              every time. In my corporate job I saw the same friction play out weekly: teams
              defaulting to expensive enterprise contracts (Azure OpenAI, IBM Watsonx) not because
              the models were better but because the compliance paperwork was already done.
            </p>
            <p>
              This directory is the resource I wanted. It presents structured, sourced facts — not
              a provider&apos;s own marketing copy, not a law firm&apos;s generic checklist — so you
              can make a defensible provider selection and move on.
            </p>
          </div>
        </section>

        {/* ── Who built it ── */}
        <section
          style={{
            marginBottom: "48px",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "28px 32px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 400,
              color: "var(--color-heading)",
              marginBottom: "16px",
              letterSpacing: "-0.01em",
            }}
          >
            Who built it
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-primary)",
              lineHeight: 1.75,
              marginBottom: "16px",
            }}
          >
            I&apos;m Carlo, a software developer based in{" "}
            <strong style={{ color: "var(--color-heading)", fontWeight: 600 }}>Germany</strong>.
            I work in enterprise IT and build SaaS products on the side — which means I operate
            under GDPR daily, from both the engineering and compliance sides of the table.
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-primary)",
              lineHeight: 1.75,
            }}
          >
            I don&apos;t have a financial relationship with any of the providers listed here. The
            directory is independent. Compliance metadata reflects publicly verifiable information
            with source links — if something is wrong or has changed, I want to know.
          </p>
        </section>

        {/* ── How data is maintained ── */}
        <section style={{ marginBottom: "48px" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 400,
              color: "var(--color-heading)",
              marginBottom: "16px",
              letterSpacing: "-0.01em",
            }}
          >
            How data is maintained
          </h2>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-primary)",
              lineHeight: 1.75,
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <p>
              Every provider entry is a flat JSON file stored in the public GitHub repository.
              Each field has a source URL. Every entry shows a &ldquo;last verified&rdquo; date so
              you can judge how fresh the information is before acting on it.
            </p>
            <p>
              Provider compliance terms change — sometimes quietly. If you spot something outdated
              or missing, the best thing you can do is open an issue on GitHub. The issue template
              asks for the specific field that changed and a link to the source document. That keeps
              updates auditable and reviewable before they go into the directory.
            </p>
          </div>
        </section>

        {/* ── Report a change CTA ── */}
        <section
          style={{
            marginBottom: "48px",
            backgroundColor: "var(--color-accent-subtle)",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "28px 32px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.375rem",
              fontWeight: 400,
              color: "var(--color-heading)",
              marginBottom: "10px",
              letterSpacing: "-0.01em",
            }}
          >
            Seen something change?
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-primary)",
              lineHeight: 1.7,
              marginBottom: "20px",
            }}
          >
            If a provider has updated their DPA, changed their data residency terms, launched
            EU-only routing, or anything else relevant to GDPR compliance — please file a GitHub
            issue. The structured template takes under two minutes and helps keep this resource
            accurate for everyone.
          </p>
          <a
            href={NEW_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="about-gh-btn"
          >
            {/* GitHub mark icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Open an issue on GitHub
          </a>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary)",
              marginTop: "12px",
              lineHeight: 1.5,
            }}
          >
            A GitHub account is required to submit. You can also browse{" "}
            <a
              href={`${GITHUB_REPO}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-link)" }}
            >
              open issues
            </a>{" "}
            or review the{" "}
            <a
              href={`${GITHUB_REPO}/tree/main/data/providers`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-link)" }}
            >
              provider data files
            </a>{" "}
            directly.
          </p>
        </section>

        {/* ── What this is not ── */}
        <section style={{ marginBottom: "48px" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 400,
              color: "var(--color-heading)",
              marginBottom: "16px",
              letterSpacing: "-0.01em",
            }}
          >
            What this is not
          </h2>
          <ul
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              color: "var(--color-text-primary)",
              lineHeight: 1.75,
              paddingLeft: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <li>
              <strong style={{ fontWeight: 600 }}>Not legal advice.</strong> The directory
              presents facts, not compliance judgments. Always verify with the provider directly
              and consult legal counsel before relying on this for procurement decisions.
            </li>
            <li>
              <strong style={{ fontWeight: 600 }}>Not a paid placement service.</strong> No
              provider has paid to appear here or to influence how their data is presented.
            </li>
            <li>
              <strong style={{ fontWeight: 600 }}>Not guaranteed to be current.</strong> Provider
              terms change. The &ldquo;last verified&rdquo; date on each entry tells you when the
              information was last confirmed against source documents.
            </li>
          </ul>
        </section>

        {/* ── Back link ── */}
        <div style={{ paddingTop: "8px" }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--color-link)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            ← Browse the directory
          </Link>
        </div>
      </main>
    </>
  );
}
