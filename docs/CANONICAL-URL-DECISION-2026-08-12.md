# Prompt Defenders canonical URL decision

Decision date: **2026-08-12**

Decision: use <https://prompt-defenders.vercel.app> as the canonical public
origin. Keep the custom-domain history explicit, but do not attach, redirect, or
present `promptdefenders.com` as live.

Related tracker: [GitHub issue #25](https://github.com/RazonIn4K/prompt-defenders/issues/25),
**Decide and verify the canonical Prompt Defenders public URL**.

## Why this is the lowest-change decision

The selected Vercel alias was already the working public destination and was
already used by the README, API documentation, authentication regression tests,
and GitHub repository homepage. Selecting it requires no DNS, registrar, alias,
redirect, environment, credential, or production-deployment mutation.

Prompt Defenders remains David Ortiz's standalone AI-security proof project. It
is not presented as a legal entity, merchant, High Encode Learning product, or
RazonWorks service line.

## Authenticated deployment readback

The following was read from the authenticated Vercel team
`razs-projects-29d4f2e6` on 2026-08-12:

- project: `prompt-defenders`
- project ID: `prj_7XRj1IZ2uSmf7kKBJ0dFW9FQvXa6`
- production deployment ID: `dpl_7Pqox9WE9UFmgzwBkWT9ecT5QrLs`
- deployed source commit: `29583349895f5a5946480e2411ed60b2b049a764`
- immutable deployment URL:
  `https://prompt-defenders-pfhjmm4aw-razs-projects-29d4f2e6.vercel.app`
- target/status: production, Ready, promoted
- production alias: `https://prompt-defenders.vercel.app`
- deployment created: 2026-06-24 at 20:30:05 UTC

GitHub deployment record `5187075059` independently associates that production
deployment with the same source commit and reports a successful terminal state.

## Fresh public readback

Read-only checks on 2026-08-12 observed:

- `/`, `/rules`, `/docs/api`, `/docs/integrations`, and `/docs/security`
  returned HTTP `200` on the selected origin;
- the homepage returned CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  Referrer Policy, and Permissions Policy headers;
- one benign same-origin `POST /api/scan` request returned HTTP `200`, a
  successful low-risk result, rule-pack version `1.0.2`, and no advisories;
- the pre-change production artifact returned `404` for `/robots.txt` and
  `/sitemap.xml`; this source packet adds those routes but does not claim they
  are deployed.

No secret value or raw stored prompt was read. The benign smoke input was
submitted directly to the existing public scanner and was not reused in this
receipt.

## Custom-domain disposition

RDAP reported `promptdefenders.com` as registered through NameCheap, Inc., with
registration on 2025-05-29 and expiration on 2027-05-29. Fresh DNS checks found
no A, AAAA, or CNAME web records for the apex or `www` name. Authenticated Vercel
team domain inventory did not list the custom domain.

RDAP does not identify the account owner, and no authenticated registrar
account was accessed during this decision. Registrar ownership and auto-renew
state therefore remain unverified. They are not prerequisites for using the
existing Vercel alias, and no registrar action is authorized by this packet.

## Source alignment

This source packet:

- defines the canonical origin once in `src/lib/site.ts`;
- adds canonical, Open Graph, and Twitter URL metadata to every public page;
- adds `/robots.txt` and `/sitemap.xml` from the same route inventory;
- keeps API examples on the selected origin;
- records the custom-domain history without advertising a dead destination;
- adds regression coverage for the public route and origin contract.

## Effects and rollback boundary

The local source packet does not deploy, promote, change traffic, alter aliases,
edit DNS, access the registrar account, configure secrets, or change Vercel
project settings. The production deployment and traffic remain on the exact
artifact listed above.

The connected Vercel project automatically creates preview deployments for
pushed branches. For that reason, this candidate must not be pushed or opened as
a pull request until the owner separately approves that automatic preview
effect. Once publication is approved, source rollback is a revert of the
canonical-alignment commit; no provider rollback is needed unless a preview was
created.
