import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { absoluteUrl, PUBLIC_ROUTES, SITE_URL } from "../src/lib/site";
import { getServerSideProps as getRobots } from "../src/pages/robots.txt";
import { getServerSideProps as getSitemap } from "../src/pages/sitemap.xml";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFileSync(`${repoRoot}/${path}`, "utf8");

async function renderTextRoute(handler: unknown) {
  const headers = new Map<string, string>();
  let body = "";
  let ended = false;
  const res = {
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    write(chunk: string) {
      body += chunk;
    },
    end() {
      ended = true;
    },
  };

  await (handler as (context: { res: typeof res }) => Promise<unknown>)({ res });
  return { headers, body, ended };
}

describe("canonical public surface", () => {
  test("keeps one HTTPS origin without a trailing slash", () => {
    expect(SITE_URL).toBe("https://prompt-defenders.vercel.app");
    expect(new URL(SITE_URL).protocol).toBe("https:");
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  test("lists every public page once in the sitemap contract", () => {
    expect(PUBLIC_ROUTES.map(({ path }) => path)).toEqual([
      "/",
      "/rules",
      "/docs/api",
      "/docs/integrations",
      "/docs/security",
    ]);
    expect(new Set(PUBLIC_ROUTES.map(({ path }) => path)).size).toBe(PUBLIC_ROUTES.length);
    expect(PUBLIC_ROUTES.map(({ path }) => absoluteUrl(path))).toEqual([
      "https://prompt-defenders.vercel.app/",
      "https://prompt-defenders.vercel.app/rules",
      "https://prompt-defenders.vercel.app/docs/api",
      "https://prompt-defenders.vercel.app/docs/integrations",
      "https://prompt-defenders.vercel.app/docs/security",
    ]);
  });

  test("renders robots.txt with the canonical sitemap", async () => {
    const output = await renderTextRoute(getRobots);

    expect(output.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(output.body).toBe(
      "User-agent: *\nAllow: /\nSitemap: https://prompt-defenders.vercel.app/sitemap.xml\n"
    );
    expect(output.ended).toBe(true);
  });

  test("renders one canonical sitemap entry per public route", async () => {
    const output = await renderTextRoute(getSitemap);

    expect(output.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    for (const { path } of PUBLIC_ROUTES) {
      expect(output.body).toContain(`<loc>${absoluteUrl(path)}</loc>`);
    }
    expect(output.body.match(/<url>/g)).toHaveLength(PUBLIC_ROUTES.length);
    expect(output.ended).toBe(true);
  });

  test("keeps metadata, sitemap, robots, docs, and receipt on the selected origin", () => {
    const home = read("src/pages/index.tsx");
    const rules = read("src/pages/rules.tsx");
    const docsLayout = read("src/components/DocsLayout.tsx");

    for (const source of [home, rules, docsLayout]) {
      expect(source).toContain('rel="canonical"');
      expect(source).toContain('property="og:url"');
    }
    expect(home).toContain('absoluteUrl("/")');
    expect(rules).toContain('absoluteUrl("/rules")');
    expect(read("src/pages/docs/api.tsx")).toContain('canonicalPath="/docs/api"');
    expect(read("src/pages/docs/integrations.tsx")).toContain(
      'canonicalPath="/docs/integrations"'
    );
    expect(read("src/pages/docs/security.tsx")).toContain(
      'canonicalPath="/docs/security"'
    );
    expect(read("src/pages/robots.txt.ts")).toContain("Sitemap:");
    expect(read("src/pages/sitemap.xml.ts")).toContain("PUBLIC_ROUTES");
    expect(read("README.md")).toContain(SITE_URL);
    expect(read("docs/CANONICAL-URL-DECISION-2026-08-12.md")).toContain(
      "https://github.com/RazonIn4K/prompt-defenders/issues/25"
    );
  });

  test("does not promote the unresolved custom domain as an active URL", () => {
    const publicSource = [
      read("src/pages/index.tsx"),
      read("src/pages/rules.tsx"),
      read("src/components/DocsLayout.tsx"),
      read("src/pages/docs/api.tsx"),
      read("src/pages/docs/integrations.tsx"),
      read("src/pages/docs/security.tsx"),
      read("src/pages/robots.txt.ts"),
      read("src/pages/sitemap.xml.ts"),
      read("README.md"),
    ].join("\n");

    expect(publicSource).not.toMatch(/https?:\/\/(?:www\.)?promptdefenders\.com/i);
  });
});
