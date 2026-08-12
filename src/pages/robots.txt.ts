import type { GetServerSideProps } from "next";
import { SITE_URL } from "../lib/site";

function Robots() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.write(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  res.end();

  return { props: {} };
};

export default Robots;
