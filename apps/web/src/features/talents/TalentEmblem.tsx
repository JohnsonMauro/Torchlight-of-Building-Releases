interface TalentEmblemProps {
  src: string | null | undefined;
  alt: string;
  className: string;
}

/**
 * A talent tree's emblem in its frame (the planner's `art-frame` markup): the art as a silhouette in the family colour
 * (`--talent-emblem`, see familyTint), drawn through the art as a mask so it follows the theme; the transparent image
 * keeps the alt text. The frame's ◆ alone when there is no art.
 */
export function TalentEmblem({ src, alt, className }: TalentEmblemProps) {
  if (!src)
    return (
      <span className={`art-frame relative grid place-items-center ${className}`} aria-label={alt}>
        <span aria-hidden="true">◆</span>
      </span>
    );
  return (
    <span className={`art-frame relative grid place-items-center ${className}`}>
      <img src={src} alt={alt} className="absolute inset-0 size-full object-contain opacity-0" />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-(--talent-emblem) mask-contain mask-center mask-no-repeat"
        style={{ maskImage: `url("${src}")` }}
      />
    </span>
  );
}
