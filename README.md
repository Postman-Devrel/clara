# Clara

> *"Clara, be my eyes"* - The Doctor

Clara analyzes your REST API to tell you if AI agents can discover it, understand it, and recover from errors without human help.

## Quick Start

### Option A: npm

```bash
npx @sterlingchin/clara analyze ./openapi.yaml
```

### Option B: Clone the repo

```bash
git clone https://github.com/Postman-Devrel/clara.git
cd clara
npm install && npm run build && npm link
```

That's it. Now `clara` works from anywhere:

```bash
clara analyze ./path/to/your/openapi.yaml
```

## Commands

```bash
# Analyze an API spec
clara analyze ./openapi.yaml

# Verbose output with per-endpoint details
clara analyze ./openapi.yaml --verbose

# Save reports (JSON, Markdown, CSV)
clara analyze ./openapi.yaml -o report.json -o report.md

# Scan a whole repo for OpenAPI specs
clara scan .

# Generate AI-ready docs from a spec
clara docs ./openapi.yaml -o ./docs

# Generate a remediation plan with fix prompts
clara remediate ./openapi.yaml
```

## What You Get

```
==================================================================
  Clara - AI Agent API Readiness Analyzer
==================================================================

  API: Fleet Logistics API v1.0.0

  OVERALL SCORE

    [████████████████████░░░░░░░░░] 72%

    AI Agent Ready

  PILLAR SCORES

    ██████████  100%  Discoverability
    █████████░   92%  Metadata
    ████████░░   85%  Predictability
    ███████░░░   70%  Errors

  PRIORITY FIXES

    #1 [CRITICAL] error schema defined
       ERR_002 | 8 endpoints affected
       Fix: Define structured error schema with code and message

    #2 [HIGH] 4xx responses documented
       ERR_001 | 6 endpoints affected
       Fix: Document 400, 401, 403, 404 responses
```

## The 8 Pillars

Clara checks your API across 8 pillars of AI-readiness:

| Pillar | What it means |
|--------|---------------|
| **Metadata** | Does every operation have an ID, summary, and description? |
| **Errors** | Are error responses structured so agents can parse and recover? |
| **Introspection** | Are parameter types, required fields, and enums fully defined? |
| **Naming** | Is casing consistent? Do HTTP methods match their semantics? |
| **Predictability** | Are response schemas defined? Is pagination standardized? |
| **Documentation** | Is auth documented? Are external docs linked? |
| **Performance** | Are rate limits documented? Caching headers present? |
| **Discoverability** | Does the spec have server URLs, contact info, and a version? |

**AI Agent Ready** = Score >= 70% with no critical failures.

## Live Probing

Test your actual API against its spec:

```bash
clara analyze ./openapi.yaml --probe --base-url https://api.example.com

# With auth
clara analyze ./openapi.yaml --probe --base-url https://api.example.com \
  --auth "Authorization: Bearer your-token"
```

## Claude Code Integration

Install the `/clara` slash command so you can invoke Clara from inside Claude Code:

```bash
# Current project only
clara setup

# All projects
clara setup --global
```

Then type `/clara` in Claude Code and ask away.

## CI/CD

```yaml
# .github/workflows/clara.yml
name: API Quality Check
on: [push, pull_request]
jobs:
  clara:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx @sterlingchin/clara analyze ./openapi.yaml --quiet
```

Exit code `0` = AI-ready. Exit code `1` = not ready. Exit code `2` = error.

## License

Apache 2.0

Made with love for [Postman](https://postman.com) by [Sterling Chin](https://sterlingchin.com)
