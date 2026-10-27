This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## `/ziskat-prehled` runtime

Development and test runs use the payload-discarding memory adapter by default.
To exercise the real server-to-server intake adapter under `next dev`, opt in
explicitly with:

- `POKORNYDAVID_PHONE_FIRST_RUNTIME=durable`
- `POKORNYDAVID_PHONE_FIRST_INTAKE_ORIGIN=http://127.0.0.1:<lead-api-port>`
- one of `POKORNYDAVID_PHONE_FIRST_RECEIPT_HMAC_SECRET_FILE` (target runtime)
  or `POKORNYDAVID_PHONE_FIRST_RECEIPT_HMAC_SECRET` (bounded hermetic tests)
- optionally `POKORNYDAVID_PHONE_FIRST_TIMEOUT_MS` (`250`–`10000`)

Production always selects `durable`, rejects an attempted `memory` override,
and fails closed when its intake or receipt configuration is incomplete. None
of these variables is public or may use a `NEXT_PUBLIC_` prefix.

## Offering catalog runtime

Development and test runs use `content/axiom/services.v1.json` by default. To
read service names and descriptions from Control API under `next dev`, set:

- `AXIOM_OFFERING_CATALOG_RUNTIME=control-api`
- `AXIOM_OFFERING_CATALOG_ORIGIN=http://127.0.0.1:<control-api-port>`
- `AXIOM_OFFERING_CATALOG_WORKSPACE_ID=<workspace-uuid>`
- optionally `AXIOM_OFFERING_CATALOG_TIMEOUT_MS` (`250`–`10000`)

Production always selects `control-api`, rejects `repository`, and fails closed
for incomplete configuration, invalid responses, or a catalog missing any
configured service key. A failed Control API request never falls back silently
to repository content. These variables are server-only.

## Article source

Local development and tests use the repository article source by default.
Production fails closed unless the complete server-only published contract is
set explicitly:

- `AXIOM_ARTICLE_SOURCE=published`
- `AXIOM_ARTICLE_RUNTIME_ORIGIN=https://<control-api-origin>`
- `AXIOM_ARTICLE_RUNTIME_WORKSPACE_ID=<workspace-uuid>`
- optionally `AXIOM_ARTICLE_RUNTIME_TIMEOUT_MS` (`250`–`10000`, default `3000`)

The production build also emits `.next/standalone/axiom-integration-manifest.json`
through `@axiom/next`. It truthfully declares this website's published articles,
lead forms, first-party measurement, semantic regions, routes, design tokens and
consultation booking. Google Calendar links and Outlook/Apple-compatible `.ics`
downloads use the shared `@axiom/web-core/calendar` runtime.

`AXIOM_ARTICLE_SOURCE=repository` is an explicit local/test equivalent and is
rejected when `NODE_ENV=production`. Repository mode rejects runtime endpoint
variables, and published mode never merges or falls back to repository articles.
These variables must not use a `NEXT_PUBLIC_` prefix.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
