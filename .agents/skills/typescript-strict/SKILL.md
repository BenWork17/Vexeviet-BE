---
name: typescript-strict
description: Sets up TypeScript with strict type safety standards, including tsconfig.json with strict mode, ESLint rules, and type checking scripts. Use when starting a TypeScript project or enforcing type safety.
---

# TypeScript Strict Configuration

Configures TypeScript with strict type safety standards from the beginning.

## Capabilities

- Generate `tsconfig.json` with strict compiler options
- Configure ESLint with TypeScript-specific rules
- Set up type checking scripts
- Define coding standards for type safety

## Workflow

1. Create strict `tsconfig.json` configuration
2. Configure ESLint for TypeScript
3. Add type checking to package.json scripts
4. Document type safety standards

## tsconfig.json Strict Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Recommended ESLint Rules

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

## Package Scripts

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "build": "tsc"
  }
}
```
