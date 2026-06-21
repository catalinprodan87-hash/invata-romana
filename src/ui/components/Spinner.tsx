/** Lightweight loading indicator used as the lazy-route Suspense fallback. */
export default function Spinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <span
        className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
        aria-hidden="true"
      />
    </div>
  )
}
