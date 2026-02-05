# Your API Isn't Ready for AI Agents. Clara Will Tell You Why.

AI agents are eating the API world. Cursor, Claude Code, Windsurf, Copilot, custom agent workflows. They're all making HTTP calls, parsing responses, and trying to recover when things go sideways.

The problem? Most APIs were designed for humans reading documentation, not machines interpreting specs at runtime. An AI agent can't squint at a vague error message and figure out what went wrong. It needs structured error codes, consistent naming, typed parameters, and predictable behavior. Without those things, agents fail silently, retry endlessly, or just hallucinate their way through your API.

We built [Clara](https://github.com/Postman-Devrel/clara) to fix that.

## What is Clara?

Clara is an open-source CLI tool that analyzes your REST APIs (via OpenAPI specs) and tells you exactly how ready they are for AI agent consumption. Named after Clara Oswald from Doctor Who ("Clara, be my eyes"), she acts as your diagnostic lens into what agents actually need from your API.

Install it in about three seconds:

```bash
npm install -g @postman/clara
```

Or skip the global install and run it directly:

```bash
npx @postman/clara analyze ./openapi.yaml
```

Clara evaluates your API across eight pillars:

| Pillar | What It Measures |
|--------|-----------------|
| **Metadata** | Can agents identify and reference your operations? |
| **Errors** | Can agents understand and recover from failures? |
| **Introspection** | Can agents construct valid requests without guessing? |
| **Naming** | Can agents predict your API's patterns? |
| **Predictability** | Can agents reliably parse your responses? |
| **Documentation** | Is there enough context for agents to self-serve? |
| **Performance** | Will agents timeout or get throttled? |
| **Discoverability** | Can agents find and connect to your API? |

Each check maps directly to a self-healing capability. When Clara flags something, it tells you exactly how that gap hurts an AI agent trying to use your API.

## Running Your First Analysis

Point Clara at any OpenAPI spec:

```bash
clara analyze ./openapi.yaml
```

You'll get output like this:

```
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
     Agent receives unstructured error data it cannot interpret

  #2 [HIGH] error details field
     ERR_005 | 12 endpoints affected
     Agent cannot determine which field caused a validation error

  #3 [MEDIUM] retry guidance
     ERR_007 | 15 endpoints affected
     Agent doesn't know when or how to retry failed requests
```

The scoring is weighted by severity. Critical issues carry 4x weight, high issues 2x, medium 1x, and low 0.5x. Your API is considered "AI Agent Ready" when it scores 70% or above with zero critical failures.

Those exit codes are intentional, too. `0` means ready, `1` means not ready, `2` means Clara hit an error. Drop it straight into CI/CD.

## The Full CLI

Clara ships with five commands:

**`clara analyze <spec>`** is the core command. Parses your OpenAPI spec, runs all checks across the eight pillars, and gives you a scored report with prioritized fixes.

**`clara scan <dir>`** finds every OpenAPI spec in a directory. Useful when you've got a monorepo with multiple APIs or you're not sure where all the specs live.

**`clara docs <spec>`** generates AI-optimized documentation from your spec. Think of it as a companion doc that's structured specifically for agent consumption.

**`clara setup`** installs a `/clara` slash command for Claude Code, so you can run analysis directly from your AI coding environment.

**`clara remediate <spec>`** is the one I'm most excited about. More on that in a minute.

## Live Probing

Static analysis catches a lot, but sometimes the spec says one thing and the API does another. Clara can make real HTTP requests to validate that your spec matches reality:

```bash
clara analyze ./openapi.yaml --probe --base-url https://api.example.com
```

The prober sends intentionally malformed requests to test your error handling. It fires off invalid UUIDs, bad email formats, missing required fields, and out-of-range numbers, then checks whether your API returns structured, useful error responses or just a generic 500.

This is safe by design. Clara uses malformed inputs specifically to trigger validation errors without creating, modifying, or deleting any real data.

## Documentation Comparison

If you have external API documentation, Clara can compare your spec against your published docs using Parallel AI:

```bash
clara analyze ./openapi.yaml \
  --docs-url https://docs.example.com \
  --parallel-key $PARALLEL_API_KEY
```

This catches the classic "docs say one thing, spec says another" problem that trips up both humans and agents.

## The Remediate Command: Clara + Agent Mode

This is the feature that ties everything together.

Running `clara remediate` generates a structured remediation plan where every single issue comes with a ready-to-paste prompt for [Postman Agent Mode](https://www.postman.com/). Clara diagnoses. Agent Mode fixes.

```bash
clara remediate ./openapi.yaml -o remediation-plan.md
```

Open the generated markdown file and you'll see each issue broken down like this:

```markdown
### #1: error schema defined

| | |
|---|---|
| **Severity** | CRITICAL |
| **Pillar** | Errors |
| **Endpoints Affected** | 8 |

**Why it matters:** Agent receives unstructured error data it cannot interpret

**Agent Mode Prompt:**
```
In @[Your Collection] for Acme API, create a standard error response
example for each endpoint. The error response should follow this schema:
{ "error": { "code": "string", "message": "string", "details": [] } }.
Add this as a documented response for all 4xx and 5xx status codes:
GET /users, POST /users, GET /orders, ...
```
```

The workflow:

1. Run `clara remediate ./openapi.yaml -o plan.md`
2. Open the plan
3. Open Postman Agent Mode
4. Copy each prompt, replacing `@[Your Collection]` with your actual collection name using the @ menu
5. Agent Mode executes the fixes

For larger APIs, Clara also generates a batch prompt at the bottom of the plan that combines the critical and high-priority fixes into a single Agent Mode request.

Every prompt is tailored to the specific check that failed and the specific endpoints affected. These aren't generic suggestions. They're precise instructions that Agent Mode can act on immediately.

## CI/CD Integration

Clara's exit codes make pipeline integration straightforward:

```yaml
# GitHub Actions example
- name: Check API Agent-Readiness
  run: npx @postman/clara analyze ./openapi.yaml --quiet
```

In quiet mode, Clara outputs just the score and exits with the appropriate code. Your pipeline passes when the API is agent-ready, fails when it isn't. That's it.

You can also export full reports for artifact storage:

```yaml
- name: Clara Analysis
  run: |
    npx @postman/clara analyze ./openapi.yaml \
      --output report.json \
      --output report.md
```

## What's Next

Clara is open source under Apache 2.0, built by the Postman Developer Relations team. We're actively developing it and we want your input.

Some things on the roadmap:

- **Postman Collection input** so you can analyze directly from your Postman workspace
- **More check coverage** across all eight pillars
- **Telemetry on common failure patterns** to help the community understand where APIs typically fall short for agents
- **Web UI** for teams that want a dashboard view

If you build APIs that agents consume (and increasingly, that's all of us), give Clara a spin. File issues, submit PRs, or just tell us what checks you wish existed.

```bash
npm install -g @postman/clara
clara analyze ./your-api.yaml
```

[GitHub: Postman-Devrel/clara](https://github.com/Postman-Devrel/clara)

The APIs you're building today will be consumed by agents tomorrow. Clara helps you make sure they're ready.
