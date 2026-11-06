export type Condition = "loose" | "carded";

export type FigureImage = {
  kind: "generated-fallback";
  url: null;
  initials: string;
  lineColor: string;
  source: string;
  license: string;
  attribution: string;
  notes: string;
};

export type Figure = {
  id: string;
  name: string;
  character: string;
  line: string;
  scale: string;
  number: string | null;
  wave: string;
  year: number;
  image: FigureImage;
};

export type SourceCredit = {
  name: string;
  url: string;
  usedFor: string;
};

export type ImagePolicy = {
  summary: string;
  permittedRealProductImages: number;
  generatedFallbacks: number;
  userPhotos: string;
};

export type CatalogMeta = {
  scale: string;
  lines: string[];
  sources: SourceCredit[];
  imagePolicy: ImagePolicy;
};

export type CollectionEntry = {
  id: string;
  figureId: string;
  condition: Condition;
  accessoriesComplete: boolean;
  location: string;
  notes: string;
  dateAdded: string;
};

export type WishlistEntry = {
  id: string;
  figureId: string;
  notes: string;
  dateAdded: string;
};

export type ImageRecord = {
  figureId: string;
  blob: Blob;
  mime: string;
  updatedAt: string;
};

export type BackupPhoto = {
  figureId: string;
  dataUrl: string;
  mime: string;
};

export type BackupFile = {
  app: "shelftrack";
  version: 1;
  exportedAt: string;
  scale: string;
  collection: CollectionEntry[];
  wishlist: WishlistEntry[];
  photos: BackupPhoto[];
};

export type SearchFilters = {
  line?: string | null;
  year?: number | null;
  wave?: string | null;
};
