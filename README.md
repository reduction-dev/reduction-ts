# Reduction TypeScript SDK

This is the official TypeScript client for the [Reduction streaming
engine](https://github.com/reduction-dev/reduction).

## Installation

Reduction currently runs best with [bun](https://bun.sh/).

```bash
# Using bun (recommended)
bun add reduction-ts

# Using npm
npm install --save reduction-ts
```

Then take a look at the [Getting Started guide](https://reduction.dev/docs/getting-started).

## Developing the SDK

### Developing against reduction-protocol

This project uses protocol definitions from the sibling `reduction-protocol`
repository to generate TypeScript code.

1. Ensure you have the `reduction-protocol` repository cloned at `../reduction-protocol` (sibling directory to this project)
2. Run code generation: `./scripts/gen`
3. Generated files will be placed in `src/proto/` and contain version information in `src/proto/VERSION`
4. Generated TypeScript files should be committed to the repository.
