<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- No user accounts: each household has a secret token (stored in localStorage, shared via /join/<token> link/QR); the browser calls SECURITY DEFINER database functions (k_*) that check the token (src/lib/store.ts); tables have RLS with no policies. Why: sign-in without email, and the app must run as a static site on the owner's own Supabase. Keep supabase-setup.sql in sync with drizzle/migrations.
- Sticker PDFs render each sticker on a canvas and embed it as an image. Why: jsPDF's built-in fonts lack Cyrillic.
- Static build: `STATIC_BUILD=1 bun run build` → scripts/static-finish.mjs copies `_shell.html` to `dist/client/index.html` (+404.html, _redirects). Why: Layero serves one folder with index.html as SPA fallback.
- AI models per service live in `MODELS` in src/lib/ai-key.ts (first = default, user choice in localStorage). Why: proxies like Claude n Codex reject unknown model names with 400.
- The AI service is chosen explicitly in settings (the key prefix only gives a hint); "Вставить список" (src/lib/paste-list.ts) works with no AI and no server. Why: the app must stay usable without any key, including on someone else's Supabase.
