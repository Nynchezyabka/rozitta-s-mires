// After `STATIC_BUILD=1 bun run build`: make dist/client a plain static site (index.html + SPA fallback).
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
if (process.env.STATIC_BUILD) {
  const dir = "dist/client";
  const shell = `${dir}/_shell.html`;
  if (!existsSync(shell)) throw new Error(`${shell} not found`);
  copyFileSync(shell, `${dir}/index.html`);
  copyFileSync(shell, `${dir}/404.html`); // hosts that serve 404.html for unknown paths
  writeFileSync(`${dir}/_redirects`, "/*  /index.html  200\n"); // Netlify/Cloudflare-style SPA fallback
  console.log("static site ready in dist/client (index.html)");
}
