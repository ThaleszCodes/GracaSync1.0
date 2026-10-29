import fs from "node:fs";
const assets = fs
  .readdirSync("dist/assets")
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => "/assets/" + f);
const p = "dist/sw.js";
let s = fs.readFileSync(p, "utf8");
s = s.replace(/c\.addAll\(\[[\s\S]*?\]\)/, 'c.addAll('+JSON.stringify(['/', '/icon-192.png', '/icon-512.png', ...assets])+')');
s = s.replace(
  "graca-shell-v1",
  "graca-" + assets.join("").replace(/[^a-zA-Z0-9]/g, ""),
);
fs.writeFileSync(p, s);
