export function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border border-charcoal-300 border-t-charcoal-900 rounded-full animate-spin" />
        <span className="text-overline text-charcoal-400">Loading</span>
      </div>
    </div>
  );
}
