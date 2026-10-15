# Technology Stack

## Runtime and language

- TypeScript source with TSX React components
- Browser target configured as ES2023 with DOM libraries
- ECMAScript modules and Vite bundler resolution
- React JSX automatic transform
- No server runtime, database driver, ORM, message broker, or API client dependency is present

## Frameworks and tooling

| Concern | Package/configuration |
| --- | --- |
| UI runtime | `react` `^19.2.8`, `react-dom` `^19.2.8` |
| Routing | `react-router` `^7.18.4` |
| Build/dev server | `vite` `^8.3.0` |
| Styling | `tailwindcss` `^4.3.3`, `@tailwindcss/vite` `^4.3.3` |
| Icons | `lucide-react` `^1.48.0` |
| Language compiler | `typescript` `~6.0.2` |
| Linting | `eslint` `^10.10.0`, `typescript-eslint` `^8.69.0` |
| React lint plugins | `eslint-plugin-react-hooks` `^7.1.1`, `eslint-plugin-react-refresh` `^0.5.6` |
| Type packages | `@types/node` `^24.13.3`, `@types/react` `^19.2.18`, `@types/react-dom` `^19.2.7` |

## Build and quality commands

- `npm run dev`: Vite development server
- `npm run build`: `tsc -b` followed by `vite build`
- `npm run typecheck`: TypeScript build/type check
- `npm run lint`: ESLint over the repository
- `npm run preview`: Vite production preview

## Existing architectural constraints

- `src/data/api.ts` is the explicit data-access seam; pages consume it instead of importing `mock.ts` directly.
- `src/data/mock.ts` is the only persistence-like source and exports mutable-in-memory demo collections.
- Authentication, authorization, server validation, and network persistence are not implemented.
- Route state is URL-based; dashboard interaction state is component-local React state.
- Tailwind is CSS-first and uses a custom cyan/green clinical theme in `src/index.css`.
- `tsconfig.app.json` enables `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, and `erasableSyntaxOnly`.
- No deprecated API usage was identified in the inspected source; the application is a prototype with no EOL server or persistence framework to assess.

