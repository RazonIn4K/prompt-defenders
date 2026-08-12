import type { GetServerSideProps } from "next";
import { absoluteUrl, PUBLIC_ROUTES } from "../lib/site";

function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const urls = PUBLIC_ROUTES.map(
    ({ path, changeFrequency, priority }) => `  <url>
    <loc>${absoluteUrl(path)}</loc>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`
  ).join("\n");

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.write(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>\n`);
  res.end();

  return { props: {} };
};

export default Sitemap;
