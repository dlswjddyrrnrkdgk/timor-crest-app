import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quickActionCard = fs.readFileSync(path.join(root, "src/components/admin/QuickActionCard.jsx"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");

test("Admin dashboard keeps KPI balances readable and quick actions discoverable", () => {
  const valueStyles = styles.match(/\.crm-kpi-card__value\s*\{[^}]+\}/)?.[0] || "";

  assert.match(valueStyles, /min-width:\s*0/);
  assert.match(valueStyles, /max-width:\s*100%/);
  assert.match(valueStyles, /overflow-wrap:\s*anywhere/);
  assert.match(valueStyles, /white-space:\s*normal/);
  assert.match(quickActionCard, /aria-label=\{label\}/);
  assert.match(quickActionCard, /title=\{label\}/);
});
