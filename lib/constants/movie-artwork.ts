/**
 * Target artwork specs (dimensions align with design reference assets).
 * Dimensions are targets — slight variance is OK; export at these sizes for best results.
 */
export type ArtworkRole = "thumbnail-phone" | "thumbnail-laptop" | "cover-phone" | "cover-laptop";

export const MOVIE_ARTWORK_SLOTS: Record<
  ArtworkRole,
  {
    label: string;
    description: string;
    targetPx: string;
    aspectNote: string;
  }
> = {
  "thumbnail-phone": {
    label: "Thumbnail — phone",
    description: "Landscape hero on phones (detail page top strip).",
    targetPx: "1077 × 717 px",
    aspectNote: "Landscape (~3:2). Match the phone reference.",
  },
  "thumbnail-laptop": {
    label: "Thumbnail — laptop",
    description: "Landscape hero on desktop / large screens.",
    targetPx: "1920 × 1080 px",
    aspectNote: "16:9 Full HD.",
  },
  "cover-phone": {
    label: "Movie cover — phone",
    description: "Portrait poster for lists & cards on mobile.",
    targetPx: "1000 × 1500 px",
    aspectNote: "Vertical poster (~2:3).",
  },
  "cover-laptop": {
    label: "Movie cover — laptop",
    description: "Wide artwork for desktop grids / banners (list context).",
    targetPx: "1920 × 788 px",
    aspectNote: "Ultra-wide; match the laptop cover reference.",
  },
};

/** Tailwind aspect classes matching sample image dimensions. */
export const MOVIE_ARTWORK_ASPECT_CLASS: Record<ArtworkRole, string> = {
  "thumbnail-phone": "aspect-[1077/717]",
  "thumbnail-laptop": "aspect-[16/9]",
  "cover-phone": "aspect-[2/3]",
  "cover-laptop": "aspect-[1920/788]",
};

export const ARTWORK_ROLES_ORDER: ArtworkRole[] = [
  "thumbnail-phone",
  "thumbnail-laptop",
  "cover-phone",
  "cover-laptop",
];

/** Max file size per image (matches server MAX_IMAGE_BYTES) */
export const ARTWORK_MAX_FILE_MB = 10 as const;
