// Left / Right (wrapping) and Home / End move between the tabs of a tab list, as in a native one.
const TAB_KEYS: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

/** The tab a key moves to from tab `index` of `count`; undefined for any other key. */
export const tabKeyTarget = (key: string, index: number, count: number): number | undefined =>
  TAB_KEYS[key]?.(index, count);
