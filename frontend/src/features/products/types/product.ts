export type ShirtFit = 'Slim' | 'Regular' | 'Relaxed';

export type ShirtFabric =
  | '100% Egyptian Cotton'
  | 'Pure Linen'
  | 'Oxford Cotton'
  | 'Cotton Poplin'
  | 'Denim'
  | 'Linen Blend';

export type ShirtCollar =
  'Spread Collar' | 'Button-Down Collar' | 'Mandarin Collar' | 'Cuban Collar' | 'Cutaway Collar';

export type ShirtSleeve = 'Full Sleeve' | 'Half Sleeve';

export type ShirtPattern = 'Solid' | 'Striped' | 'Checked' | 'Textured';

export type ShirtSize = '38 (S)' | '39 (M)' | '40 (M)' | '42 (L)' | '44 (XL)' | '46 (XXL)';

export interface ShirtColor {
  name: string;
  hex: string;
}

export interface ShirtVariant {
  id: string;
  color: ShirtColor;
  size: ShirtSize;
  sku: string;
  inStock: boolean;
  stockCount: number;
}

export interface Shirt {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
  images: string[];
  colors: ShirtColor[];
  sizes: ShirtSize[];
  variants: ShirtVariant[];
  fit: ShirtFit;
  fabric: ShirtFabric;
  collar: ShirtCollar;
  sleeve: ShirtSleeve;
  pattern: ShirtPattern;
  careInstructions: string[];
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isDeal?: boolean;
}

export interface ShirtFilterState {
  searchQuery?: string;
  fits: ShirtFit[];
  fabrics: ShirtFabric[];
  sizes: ShirtSize[];
  colors: string[];
  sleeves: ShirtSleeve[];
  patterns: ShirtPattern[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  onlyInStock?: boolean;
  onlyDeals?: boolean;
  onlyNewArrivals?: boolean;
}

export type ShirtSortOption =
  'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'discount';
