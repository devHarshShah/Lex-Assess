# lex-assess monorepo

Turborepo monorepo with:
- `apps/backend`: NestJS API
- `apps/frontend`: React + Vite app
- `packages/eslint-config`: shared ESLint flat configs
- `packages/typescript-config`: shared TypeScript base configs

## Prerequisites

- Node.js `>=18`
- pnpm `9.x`

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

## Shared config usage

- Frontend uses `@repo/eslint-config/react-vite` and `@repo/typescript-config/react-vite`.
- Backend uses `@repo/eslint-config/nestjs` and `@repo/typescript-config/nestjs`.
- Root `.prettierrc` and `.prettierignore` apply repo-wide.
