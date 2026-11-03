# Pull request CI

`.github/workflows/ci.yml` runs for every `pull_request`. It deliberately uses
the `pull_request` event, never `pull_request_target`; grants only
`contents: read`; persists no checkout credential; reads no secret; and has no
deploy step.

## Checks

The single Ubuntu job has a 30-minute limit and cancels an older run for the
same pull request. It uses Node.js 24 and the committed `package-lock.json` via
`npm ci`, then runs in this order:

1. `npm exec -- next typegen`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. `npm run test:e2e`
7. `npm run test:content:e2e`

The browser steps install only the project-pinned Playwright Chromium browser.
The normal browser suite starts a loopback-only production server. The content
suite creates named temporary Markdown fixtures, removes them in `finally`, and
does a final clean local build; it does not send form submissions or contact the
deployed domain.

## Why type generation comes first

`tsconfig.json` includes Next route types below `.next`. On a clean Actions
checkout those types do not exist yet. Next.js documents `next typegen && tsc
--noEmit` as the CI pattern for generating route types without a full build;
the workflow follows that pattern before its standalone `typecheck` command.

## Pinned action provenance

- `actions/checkout` is pinned to commit
  `3d3c42e5aac5ba805825da76410c181273ba90b1` (release `v7.0.1`).
- `actions/setup-node` is pinned to commit
  `949feb2413d6458794dcd2491c4babbbce0c15c1` (release `v7.1.0`).

Both current releases use the Node 24 action runtime. The workflow deliberately
disables the package-manager cache: this small project does not need it for
correctness, and omitting it keeps the PR trust boundary simple.

## Boundaries

CI proves the checked-out branch can pass these local checks. It does not grant
Vercel access, deploy the site, apply Supabase migrations, send email, or prove
external provider configuration. Protected-branch rules in GitHub must be set
separately if these checks should be mandatory before merging.

## Primary references

- [GitHub workflow syntax and permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [actions/checkout v7.0.1 release](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [actions/setup-node v7.1.0 release](https://github.com/actions/setup-node/releases/tag/v7.1.0)
- [Next.js CLI: `next typegen`](https://nextjs.org/docs/app/api-reference/cli/next)
