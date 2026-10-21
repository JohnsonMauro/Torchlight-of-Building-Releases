import { test } from "node:test";
import assert from "node:assert/strict";
import {
  provideViewSource,
  readViewSource,
  subscribeViewSource,
  viewSourceChanged,
} from "../../src/app/bridge/view-sources.ts";

test("a source reads its data once per change, and only after the planner provided it", () => {
  assert.equal(readViewSource("configuration"), null);
  let reads = 0;
  let heard = 0;
  const unsubscribe = subscribeViewSource("configuration", () => heard++);
  provideViewSource("configuration", () => ({ reads: ++reads }));
  // Providing does not announce (or read): the planner is still loading. A view that re-renders for another reason
  // still gets nothing until the first announcement (safe mode never calculates, so reading early would throw).
  assert.deepEqual([heard, reads], [0, 0]);
  assert.equal(readViewSource("configuration"), null);
  assert.equal(reads, 0);
  viewSourceChanged("configuration");
  assert.equal(heard, 1);
  const first = readViewSource("configuration");
  assert.equal(readViewSource("configuration"), first);
  assert.equal(reads, 1);
  viewSourceChanged("configuration");
  assert.equal(heard, 2);
  assert.notEqual(readViewSource("configuration"), first);
  assert.equal(reads, 2);
  unsubscribe();
  viewSourceChanged("configuration");
  assert.equal(heard, 2);
});

test("a failing listener does not stop the others", () => {
  let heard = false;
  const broken = subscribeViewSource("configuration", () => {
    throw new Error("broken listener");
  });
  const working = subscribeViewSource("configuration", () => (heard = true));
  const originalError = console.error;
  console.error = () => {};
  try {
    viewSourceChanged("configuration");
  } finally {
    console.error = originalError;
    broken();
    working();
  }
  assert.equal(heard, true);
});
