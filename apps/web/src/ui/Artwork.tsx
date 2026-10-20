interface ArtworkProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

/** Game art in its frame (the planner's `artwork` markup): the image, or the frame's ◆ alone when there is none. */
export function Artwork({ src, alt, className = "game-art" }: ArtworkProps) {
  return src ? (
    <span className={`art-frame ${className}`}>
      <img src={src} alt={alt} />
      <span aria-hidden="true">◆</span>
    </span>
  ) : (
    <span className={`art-frame ${className}`} aria-label={alt}>
      <span aria-hidden="true">◆</span>
    </span>
  );
}
