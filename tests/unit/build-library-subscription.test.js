import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./memory-storage.js";

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  globalThis.sessionStorage = new MemoryStorage();
});

const { createBuild, loadBuildLibrary, subscribeBuildLibrary, updateActiveBuildMetadata } =
  await import("../../src/build-library.ts");

test("subscribers hear every library write and stop after unsubscribing", () => {
  let calls = 0;
  const unsubscribe = subscribeBuildLibrary(() => calls++);
  createBuild({ name: "First" });
  assert.equal(calls, 1);
  updateActiveBuildMetadata({ name: "Renamed" });
  assert.equal(calls, 2);
  assert.equal(loadBuildLibrary().builds.at(-1).name, "Renamed");
  unsubscribe();
  createBuild({ name: "Second" });
  assert.equal(calls, 2);
});

test("a failing subscriber does not stop the others or the write", () => {
  let heard = false;
  const unsubscribeBroken = subscribeBuildLibrary(() => {
    throw new Error("broken listener");
  });
  const unsubscribe = subscribeBuildLibrary(() => {
    heard = true;
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    createBuild({ name: "Kept" });
  } finally {
    console.error = originalError;
    unsubscribeBroken();
    unsubscribe();
  }
  assert.equal(heard, true);
  assert.ok(loadBuildLibrary().builds.some((build) => build.name === "Kept"));
});
