# Clara

> *"Clara, be my eyes"* - The Doctor

**AI Agent API Readiness Analyzer**

Clara analyzes REST APIs to ensure AI agents can:
- **Discover** what the API does
- **Understand** how to use it correctly
- **Self-heal** from errors without human intervention

[![npm version](https://badge.fury.io/js/%40postman%2Fclara.svg)](https://badge.fury.io/js/%40postman%2Fclara)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Installation

```bash
npm install -g @postman/clara
```

Or use with npx:

```bash
npx @postman/clara analyze ./openapi.json
```

## Commands

Clara provides two main commands:

| Command | Description |
|---------|-------------|
| `clara analyze` | Analyze an OpenAPI spec for AI-readiness |
| `clara docs` | Generate AI-ready documentation from an OpenAPI spec |

---

## Analyze Command

Analyze an OpenAPI spec to check if it's ready for AI agent consumption.

```bash
clara analyze <spec> [options]
```

### Basic Usage

```bash
# Analyze a local file
clara analyze ./openapi.yaml

# Analyze from a URL
clara analyze https://api.example.com/openapi.json

# Verbose output with endpoint details
clara analyze ./openapi.yaml --verbose

# JSON output to stdout
clara analyze ./openapi.yaml --json

# Save reports to files
clara analyze ./openapi.yaml -o report.json -o report.md -o report.csv
```

### Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Show detailed endpoint results |
| `-q, --quiet` | Only output score (for CI/CD) |
| `--json` | Output raw JSON to stdout |
| `-o, --output <file>` | Save report to file (.json, .csv, .md) - can be repeated |

### Live Probing

Test your API with real HTTP requests to validate spec accuracy:

```bash
# Enable live probing
clara analyze ./openapi.yaml --probe --base-url https://api.example.com

# Probe a sandbox environment (allows write operations)
clara analyze ./openapi.yaml --probe --sandbox --base-url https://sandbox.api.example.com

# Probe with authentication
clara analyze ./openapi.yaml --probe --base-url https://api.example.com \
  --auth "Authorization: Bearer your-token"

# Route write operations to a mock server
clara analyze ./openapi.yaml --probe --base-url https://api.example.com \
  --mock-url https://mock.api.example.com
```

| Option | Description |
|--------|-------------|
| `-p, --probe` | Enable live probing (requires `--base-url`) |
| `-s, --sandbox` | Mark as sandbox environment (allows write operation probing) |
| `-b, --base-url <url>` | Base URL for live probing |
| `-m, --mock-url <url>` | Mock server URL for write operations |
| `-a, --auth <header>` | Authorization header (e.g., `"Authorization: Bearer token"`) |

### Documentation Comparison (Parallel AI)

Compare your OpenAPI spec against external documentation:

```bash
# Compare spec vs documentation
clara analyze ./openapi.yaml \
  --parallel-key $PARALLEL_API_KEY \
  --docs-url https://docs.example.com

# Three-way comparison: Spec vs Docs vs Live Reality
clara analyze ./openapi.yaml \
  --probe --base-url https://api.example.com \
  --parallel-key $PARALLEL_API_KEY \
  --docs-url https://docs.example.com
```

| Option | Description |
|--------|-------------|
| `--parallel-key <key>` | Parallel AI API key (or set `PARALLEL_API_KEY` env var) |
| `-d, --docs-url <url>` | Documentation URL for comparison |

### Example Output

```
==================================================================
  Clara - AI Agent API Readiness Analyzer
==================================================================

  API: Fleet Logistics API v1.0.0
  Source: ./openapi.yaml

  OVERALL SCORE

    [████████████████████░░░░░░░░░] 72%

    AI Agent Ready

    Endpoints: 55 | Passed: 89 | Failed: 15 | Warnings: 8

  ------------------------------------------------------------------

  PILLAR SCORES

    ██████████  100%  Discoverability           (4/4 checks)
    █████████░   92%  Metadata                  (11/12 checks)
    ████████░░   85%  Predictability            (7/8 checks)
    ███████░░░   70%  Errors                    (14/20 checks)

  ------------------------------------------------------------------

  PRIORITY FIXES
  (Ranked by impact: severity x endpoints affected)

    #1 [CRITICAL] error schema defined
       ERR_002 | 8 endpoints affected | Priority: 32
       Agent receives unstructured error data it cannot interpret
       Fix: Define structured error schema with code and message

    #2 [HIGH] 4xx responses documented
       ERR_001 | 6 endpoints affected | Priority: 12
       Agent cannot anticipate or prepare for error conditions
       Fix: Document 400, 401, 403, 404 responses
```

---

## Docs Command

Generate AI-ready markdown documentation from an OpenAPI spec.

```bash
clara docs <spec> [options]
```

### Basic Usage

```bash
# Generate multi-file documentation
clara docs ./openapi.yaml -o ./docs

# Generate a single combined markdown file
clara docs ./openapi.yaml --single-file -o api-docs.md

# Generate from a URL
clara docs https://api.example.com/openapi.json -o ./docs

# Verbose output
clara docs ./openapi.yaml -o ./docs --verbose
```

### Options

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Output file or directory (default: `./docs`) |
| `--single-file` | Generate a single combined markdown file |
| `--no-examples` | Skip generating examples |
| `--no-errors` | Skip generating error handling guide |
| `-v, --verbose` | Verbose output |

### Generated Files

**Multi-file output (default):**

```
docs/
├── README.md              # API overview
├── authentication.md      # Authentication guide
├── quickstart.md          # Getting started guide
├── errors.md              # Error handling guide
└── endpoints/
    ├── users.md           # User endpoints
    ├── orders.md          # Order endpoints
    └── ...                # One file per resource tag
```

**Single-file output (`--single-file`):**

A single markdown file containing all documentation sections with a table of contents.

### What's Included

- **Overview**: API description, version, base URLs, contact info
- **Authentication**: Security schemes and how to authenticate
- **Quickstart**: Step-by-step guide to make your first request
- **Endpoints**: Full documentation for each endpoint including:
  - HTTP method and path
  - Description
  - Parameters (path, query, header) with types
  - Request body schema with examples
  - Response schemas with examples
  - curl examples
- **Error Handling**: Common error codes and how to handle them

---

## What Clara Checks

Clara evaluates your API across **8 pillars** of AI-readiness:

| Pillar | Description | Example Checks |
|--------|-------------|----------------|
| **Metadata** | Machine-consumable operation info | operationId present, descriptive naming |
| **Errors** | Rich error semantics | 4xx responses documented, error schema defined |
| **Introspection** | Complete parameter info | Types defined, required marked, enums listed |
| **Naming** | Consistent conventions | Consistent casing, HTTP method semantics |
| **Predictability** | Consistent behavior | Response schemas defined, idempotency documented |
| **Documentation** | Comprehensive docs | Auth documented, external docs linked |
| **Performance** | Speed & reliability | Response times, rate limit headers |
| **Discoverability** | API findability | Server URLs, contact info |

## Scoring

Clara calculates a weighted score based on check severity:

| Severity | Weight | Meaning |
|----------|--------|---------|
| Critical | 4x | Agent cannot function without this |
| High | 2x | Agent will struggle significantly |
| Medium | 1x | Agent experience degraded |
| Low | 0.5x | Nice to have for agents |

**AI Agent Ready**: Score >= 70% AND no critical failures

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | API is AI-ready (score >= 70%, no critical failures) |
| 1 | API is not AI-ready |
| 2 | Error occurred during analysis |

---

## CI/CD Integration

### GitHub Actions

```yaml
name: API Quality Check

on: [push, pull_request]

jobs:
  clara:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Clara
        run: npm install -g @postman/clara

      - name: Analyze API
        run: clara analyze ./openapi.yaml --quiet
```

### With Live Probing

```yaml
- name: Analyze API with probing
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}
  run: |
    clara analyze ./openapi.yaml \
      --probe \
      --base-url https://staging-api.example.com \
      --auth "Authorization: Bearer $API_TOKEN"
```

---

## Programmatic Usage

```typescript
import { analyze } from '@postman/clara';

const report = await analyze('./openapi.yaml', {
  probe: true,
  baseUrl: 'https://api.example.com',
  auth: 'Authorization: Bearer token',
});

console.log(`Score: ${report.summary.overallScore}%`);
console.log(`AI Ready: ${report.summary.agentReady}`);

// Access detailed results
for (const endpoint of report.endpoints) {
  console.log(`${endpoint.method} ${endpoint.path}: ${endpoint.score}%`);
}

// Get priority fixes
for (const fix of report.priorityFixes.slice(0, 5)) {
  console.log(`${fix.checkId}: ${fix.summary}`);
}
```

---

## Checks Reference

### Metadata Checks

| ID | Name | Severity |
|----|------|----------|
| META_001 | operationId present | Critical |
| META_002 | operationId descriptive | High |
| META_003 | summary present | High |
| META_004 | description present | Medium |
| META_005 | tags assigned | Medium |
| META_006 | deprecated marked | Low |

### Error Checks

| ID | Name | Severity |
|----|------|----------|
| ERR_001 | 4xx responses documented | Critical |
| ERR_002 | error schema defined | Critical |
| ERR_003 | error codes enumerated | High |
| ERR_004 | error messages descriptive | Medium |
| ERR_005 | 5xx responses documented | Medium |
| ERR_006 | retry guidance provided | Medium |
| ERR_007 | rate limit responses documented | Medium |
| ERR_008 | validation errors detailed | High |

### Introspection Checks

| ID | Name | Severity |
|----|------|----------|
| INTRO_001 | parameter types defined | Critical |
| INTRO_002 | parameter formats specified | High |
| INTRO_003 | required parameters marked | Critical |
| INTRO_004 | default values provided | Medium |
| INTRO_005 | parameter descriptions present | Medium |
| INTRO_006 | enum values listed | Critical |
| INTRO_007 | array item types defined | High |
| INTRO_008 | nullable explicitly marked | Medium |

### Naming Checks

| ID | Name | Severity |
|----|------|----------|
| NAME_001 | consistent casing | High |
| NAME_002 | resource naming conventions | Medium |
| NAME_003 | HTTP method semantics | Critical |
| NAME_004 | plural resource names | Low |
| NAME_005 | no version in path | Low |
| NAME_006 | consistent property naming | Medium |

### Predictability Checks

| ID | Name | Severity |
|----|------|----------|
| PRED_001 | response schema defined | Critical |
| PRED_002 | response matches schema | Critical |
| PRED_003 | pagination standardized | High |
| PRED_004 | date format consistent | Medium |
| PRED_005 | null handling consistent | Medium |
| PRED_006 | idempotency documented | High |

### Documentation Checks

| ID | Name | Severity |
|----|------|----------|
| DOC_001 | API description present | High |
| DOC_002 | external docs linked | Medium |
| DOC_003 | authentication documented | Critical |
| DOC_004 | spec matches documentation | High |
| DOC_005 | terms of service linked | Low |
| DOC_006 | license specified | Low |

### Performance Checks

| ID | Name | Severity |
|----|------|----------|
| PERF_001 | response time acceptable | High |
| PERF_002 | rate limits documented | Medium |
| PERF_003 | caching headers present | Medium |
| PERF_004 | compression supported | Low |

### Discoverability Checks

| ID | Name | Severity |
|----|------|----------|
| DISC_001 | API title present | High |
| DISC_002 | server URL in spec | High |
| DISC_003 | contact info present | Low |
| DISC_004 | API version specified | Medium |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PARALLEL_API_KEY` | Parallel AI API key for documentation comparison |
| `POSTMAN_API_KEY` | Postman API key for Postman integration |

---

## Development

### Setup

```bash
git clone https://github.com/postmanlabs/clara.git
cd clara
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Run Locally

```bash
npm run build

# Analyze
node dist/cli/index.js analyze ./tests/fixtures/petstore-minimal.json

# Generate docs
node dist/cli/index.js docs ./tests/fixtures/petstore-minimal.json -o ./test-docs
```

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

Apache 2.0 - see [LICENSE](LICENSE) for details.

---

Made with love by [Postman](https://postman.com)
