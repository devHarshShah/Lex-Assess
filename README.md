# lex-assess monorepo

Turborepo monorepo with:
- `apps/backend`: NestJS API
- `apps/frontend`: React + Vite app
- `packages/eslint-config`: shared ESLint flat configs
- `packages/typescript-config`: shared TypeScript base configs

## Prerequisites

- Node.js `>=22.13`
- pnpm `11.x` (pinned via `packageManager`)

## Install

```sh
pnpm install
```

## Run

```sh
pnpm dev
```

## Quality commands

```sh
pnpm lint
pnpm check-types
pnpm test
pnpm build
pnpm format
pnpm format:check
```

## Deployment

Backend deploys to Cloud Run (Mumbai) via GitHub Actions; frontend deploys to Vercel. Backing GCP
infra (Cloud SQL, GCS, Secret Manager, IAM) is provisioned with Terraform in `infra/terraform/`.
See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full setup and rotation procedure.

## Shared config usage

- Frontend uses `@repo/eslint-config/react-vite` and `@repo/typescript-config/react-vite`.
- Backend uses `@repo/eslint-config/nestjs` and `@repo/typescript-config/nestjs`.
- Root `.prettierrc` and `.prettierignore` apply repo-wide.
