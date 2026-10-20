// Compare captured state, including in-place edits, rather than object identity.
export function createPlannerCache(calculate) {
  let previousKey, previousResult;
  return (state) => {
    const key = JSON.stringify(state);
    if (key !== previousKey) {
      const result = calculate(state);
      previousKey = key;
      previousResult = result;
    }
    return previousResult;
  };
}
