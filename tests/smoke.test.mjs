import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test("bootstrap contracts and shared types exist", () => {
  assert.equal(existsSync("contracts/factory-contract.json"), true);
  assert.equal(existsSync("src/shared/types.ts"), true);
});
