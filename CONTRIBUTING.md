# Contributing to Clara

Thanks for your interest in contributing to Clara! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/Postman-Devrel/clara.git
cd clara
npm install
npm run build
```

## Running Tests

```bash
npm test
```

## Code Style

- TypeScript strict mode
- Files: kebab-case (`error-checks.ts`)
- Classes: PascalCase (`CheckEngine`)
- Functions: camelCase (`runChecks`)
- Constants: SCREAMING_SNAKE_CASE (`DEFAULT_TIMEOUT_MS`)

Run linting and formatting before submitting:

```bash
npm run lint
npm run format
```

## Adding a New Check

1. Add the check to the appropriate pillar file in `src/analyzer/checks/`
2. Register it in `src/analyzer/checks/index.ts`
3. Add unit tests in `tests/unit/checks.test.ts`
4. Update the checks reference table in `README.md`

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes with tests
3. Run `npm run lint && npm test`
4. Submit a PR with a clear description of the change

## Reporting Issues

Open an issue at [github.com/Postman-Devrel/clara/issues](https://github.com/Postman-Devrel/clara/issues).

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
