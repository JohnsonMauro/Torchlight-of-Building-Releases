# Tests that can fail

Part of the skill [verify-guide](SKILL.md) (§3–4).

## 3. Bug fix: the regression test comes first

1. Pick the cheapest layer that shows the bug:

   | The bug is in | The test |
   |---|---|
   | a pure view model or engine function | unit test in `tests/unit` (`node --test tests/unit/<file>.test.js`) |
   | a calculation result | the golden master shows it (`engine-guide` §3), plus a unit test that names the rule |
   | an interaction (drag, tooltip, dialog, focus, keyboard) | e2e test in the feature's spec, selectors in its page object |
   | a layout at a width | a `*-responsive.spec.js` (skills and hero panel have one; add one for the feature if not) |

2. Run it and see it fail for the reason of the bug (read the message).
3. Fix, see it pass.

## 4. Prove the test can fail

A green test may pass for the wrong reason (a class regex that matches a utility, a locator that finds the wrong
element, data that never reaches the branch). For a new or changed test, plant the bug and watch it fail:

- `cp <file> <scratchpad>/<file>.bak`, break the line, run the test, restore with `cp` (or `git checkout -- <file>`
  when the file had no other change). Never `git stash -- <file>` + `pop`: with no change to save, the pop applies an
  older stash from another task.
- A mutation that survives means the test is empty for that case: add the data that shows the difference, plant again.
