const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** A figure as the planner prints it: grouped, at most two decimals ("1,623,885,515.97"). */
export const formatNumber = (value: number): string => numberFormat.format(value);
