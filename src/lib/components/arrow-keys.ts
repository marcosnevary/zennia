/**
 * The option the arrow keys move to among `count` options in a row or a column, wrapping around; both axes, as a row
 * may turn into a column on another screen width. Null for any other key.
 */
export function arrowIndex(
  event: KeyboardEvent,
  index: number,
  count: number,
): number | null {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
    event.key
  ];
  if (!step) return null;
  event.preventDefault();
  return (index + step + count) % count;
}
