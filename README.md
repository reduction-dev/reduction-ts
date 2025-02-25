# reduction-ts

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Protocol Files & Code Generation

This project uses protocol definitions from the sibling `reduction-protocol` repository to generate TypeScript code.

### Development Workflow

1. Ensure you have the `reduction-protocol` repository cloned at `../reduction-protocol` (sibling directory to this project)
2. Run code generation: `./scripts/gen`
3. Generated files will be placed in `src/proto/` and contain version information in `src/proto/VERSION`
4. Generated TypeScript files should be committed to the repository.
