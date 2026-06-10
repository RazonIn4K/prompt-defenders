import type { ReactNode } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "./DocsLayout.module.css";

interface DocsLayoutProps {
  title: string;
  metaDescription: string;
  description: string;
  children: ReactNode;
}

const navLinks = [
  { label: "← Scanner", href: "/" },
  { label: "Rules", href: "/rules" },
  { label: "API", href: "/docs/api" },
  { label: "Integrations", href: "/docs/integrations" },
  { label: "Security", href: "/docs/security" },
];

export default function DocsLayout({
  title,
  metaDescription,
  description,
  children,
}: DocsLayoutProps) {
  return (
    <>
      <Head>
        <title>{`${title} | Prompt Defenders`}</title>
        <meta name="description" content={metaDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.page}>
        <div className={styles.heroGlow} />

        <main className={styles.container}>
          <header className={styles.header}>
            <div className={styles.eyebrow}>Documentation</div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>
            <nav className={styles.nav}>
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </header>

          {children}

          <footer className={styles.footer}>
            Built by{" "}
            <a href="https://davidtiz.com" target="_blank" rel="noopener noreferrer">
              David Ortiz
            </a>
            .
          </footer>
        </main>
      </div>
    </>
  );
}
