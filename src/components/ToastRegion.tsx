/**
 * Nothing to do here, and that is the point.
 *
 * In the web client this component reaches into the toast library's container and marks it as a
 * live region, because the library rendered a plain `div` that a screen reader never announced.
 * The native `ToastProvider` sets `accessibilityLiveRegion` on the toast itself, so the gap this
 * component existed to close is not there.
 *
 * It is kept, rendered by `App`, so the entry point of the two clients still reads the same and
 * so the reason is written down somewhere rather than being an unexplained absence.
 */
export default function ToastRegion() {
  return null
}
