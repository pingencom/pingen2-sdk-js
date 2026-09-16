# Contributing

Thanks for your interest in contributing!

## Getting started

The project is developed exclusively inside Docker. There is no supported local-Node workflow — please don't `npm ci` on the host.

```sh
git clone https://github.com/pingencom/pingen2-sdk-js.git
cd pingen2-sdk-js
docker compose build
docker compose up -d
docker compose exec js-sdk npm test
```

When you're done:

```sh
docker compose down
```

## Development workflow

1. Create a branch from `main`
2. Make your changes
3. Run all checks inside the container:
   ```sh
   docker compose exec js-sdk npm run format
   docker compose exec js-sdk npm run lint
   docker compose exec js-sdk npx tsc --noEmit
   docker compose exec js-sdk npm test
   ```
4. Open a pull request

## Code style

- Formatting: Prettier (`docker compose exec js-sdk npm run format`)
- Linting: ESLint (`docker compose exec js-sdk npm run lint`)
- All code must pass `tsc --noEmit` with zero errors
- Test coverage: 100% statements / branches / functions / lines — enforced via vitest thresholds

## Commit messages

Use clear, concise messages describing **what** changed and **why**.

## Reporting bugs

Open an issue using the [bug report template](https://github.com/pingencom/pingen2-sdk-js/issues/new?template=bug_report.md).
