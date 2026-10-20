export function HeroMemorySelectorDialog() {
  return (
    <dialog id="hero-memory-selector" className="hero-memory-dialog" aria-labelledby="hero-memory-title">
      <header>
        <h2 id="hero-memory-title">Hero Memories</h2>
        <button type="button" data-close-hero-memory="" aria-label="Close hero memories">
          ×
        </button>
      </header>
      <div id="hero-memory-content" />
    </dialog>
  );
}
