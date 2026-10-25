# make-mcp catalog

Community-maintained recipes for [make-mcp](https://make-mcp.net): which docs, `llms.txt` or OpenAPI spec to use for a
library, product or API, and how the generated MCP server should behave.

**No documentation is stored here.** An entry only holds answers to make-mcp's intake. The server is generated on
your machine, for the exact version in your lockfile, and the license of the docs decides whether they are embedded
or downloaded locally – exactly as if you had run make-mcp yourself.

## Use it

### Claude Code – one plugin per entry

```
/plugin marketplace add make-mcp/catalog
/plugin install daisyui@make-mcp-catalog
```

The plugin starts `npx @make-mcp/cli run catalog:daisyui` in your project: on first start it builds the server for the
version your project uses (cached in `~/.cache/make-mcp/servers`), afterwards it starts instantly. To build ahead of
time, e.g. if your client has a short start-up timeout:

```bash
npx @make-mcp/cli run catalog:daisyui --prepare
```

### Any agent or the CLI

```bash
npx @make-mcp/cli catalog css                 # search
npx @make-mcp/cli create catalog:daisyui      # generate a server you own and can commit
```

`make-mcp create daisyui` and the make-mcp plugin pick up catalog entries automatically, so the intake asks less.

## Entries

| Entry | What you get |
|---|---|
| [daisyui](entries/daisyui.json) | Tailwind CSS component library: components, class names, themes |
| [svelte](entries/svelte.json) | Svelte and SvelteKit docs |
| [hono](entries/hono.json) | Hono web framework |
| [drizzle-orm](entries/drizzle-orm.json) | Drizzle ORM |
| [zod](entries/zod.json) | Zod schema validation |
| [vitest](entries/vitest.json) | Vitest testing framework |
| [next](entries/next.json) | Next.js |
| [react](entries/react.json) | React |
| [vue](entries/vue.json) | Vue 3 |
| [nuxt](entries/nuxt.json) | Nuxt |
| [prisma](entries/prisma.json) | Prisma ORM |
| [pydantic](entries/pydantic.json) | Pydantic (Python) |
| [mantine](entries/mantine.json) | Mantine React components |
| [elysia](entries/elysia.json) | Elysia (Bun) |
| [trpc](entries/trpc.json) | tRPC |
| [bun](entries/bun.json) | Bun runtime |
| [expo](entries/expo.json) | Expo / React Native |
| [swagger-petstore](entries/swagger-petstore.json) | Example REST API from its OpenAPI spec |

## Add an entry

1. Check that make-mcp handles the target: `npx @make-mcp/cli create <package or URL>`.
2. Add `entries/<name>.json`:

   ```json
   {
     "$schema": "../schema/entry.schema.json",
     "name": "hono",
     "title": "Hono",
     "description": "Hono web framework for any JavaScript runtime: routing, middleware, helpers.",
     "target": "hono",
     "tags": ["framework", "http"],
     "maintainers": ["your-github-handle"],
     "answers": { "mode": "docs", "docsSource": "https://hono.dev/llms-full.txt" }
   }
   ```

   `answers` accepts the shareable intake answers only: `mode`, `docsSource`, `codeSource`, `auth`, `scope`,
   `language`, `transport`, `tools`. Personal settings (output folder, registration) stay with each user.
3. Run `node scripts/build.mjs` – it validates the entry and regenerates `index.json`, the plugin and the marketplace.
4. Open a pull request. CI generates and smoke-tests every changed entry; all entries are re-checked weekly.

Rules: public sources only (nothing behind logins or paywalls), respect robots.txt and TDM reservations, and only
add sources whose owners publish them for reading. Maintainers listed in an entry are pinged when it breaks.

## License

Apache-2.0 for the catalog itself. The documentation your servers are built from stays under its own license.
