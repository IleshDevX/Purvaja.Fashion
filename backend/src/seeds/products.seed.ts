/**
 * Backend-only catalog seed data recovered from the original prototype.
 * This file must never be imported by the frontend at runtime.
 */
export interface ProductSeed {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
  images: string[];
  colors: Array<{ name: string; hex: string }>;
  sizes: string[];
  variants: Array<{
    id: string;
    color: { name: string; hex: string };
    size: string;
    sku: string;
    inStock: boolean;
    stockCount: number;
  }>;
  fit: string;
  fabric: string;
  collar: string;
  sleeve: string;
  pattern: string;
  careInstructions: string[];
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isDeal?: boolean;
}

export const PRODUCT_SEED: ProductSeed[] = [
  {
    "id": "shirt-001",
    "slug": "egyptian-cotton-formal-shirt-white",
    "name": "Supima Luxury Dress Shirt",
    "tagline": "Premium 100% Egyptian Cotton tailored in Slim fit",
    "description": "Crafted with high-grade 100% Egyptian Cotton, this shirt features a clean Spread Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2499,
    "compareAtPrice": 3299,
    "discountPercent": 24,
    "images": [
      "/images/products/artisan-mandala-brown-1.jpg",
      "/images/products/artisan-mandala-brown-2.jpg",
      "/images/products/artisan-mandala-brown-3.jpg"
    ],
    "colors": [
      {
        "name": "Artisan Brown",
        "hex": "#5C3A21"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-001-38",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "38 (S)",
        "sku": "SHIRT-001-38-ART",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-001-39",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "39 (M)",
        "sku": "SHIRT-001-39-ART",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-001-40",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "40 (M)",
        "sku": "SHIRT-001-40-ART",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-001-42",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "42 (L)",
        "sku": "SHIRT-001-42-ART",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-001-44",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-001-44-ART",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-001-46",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-001-46-ART",
        "inStock": true,
        "stockCount": 10
      }
    ],
    "fit": "Slim",
    "fabric": "100% Egyptian Cotton",
    "collar": "Spread Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.3,
    "reviewCount": 24,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": true
  },
  {
    "id": "shirt-002",
    "slug": "heritage-leaf-brown-resort-shirt",
    "name": "Heritage Leaf Brown Resort Shirt",
    "tagline": "Premium Pure Linen tailored in Regular fit",
    "description": "Crafted with high-grade Pure Linen, this shirt features a clean Button-Down Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2899,
    "compareAtPrice": 3699,
    "discountPercent": 22,
    "images": [
      "/images/products/forest-floral-green-1.jpg",
      "/images/products/forest-floral-green-2.jpg",
      "/images/products/forest-floral-green-3.jpg",
      "/images/products/forest-floral-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Forest Green",
        "hex": "#2D4A3E"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-002-38",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "38 (S)",
        "sku": "SHIRT-002-38-FOR",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-002-39",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "39 (M)",
        "sku": "SHIRT-002-39-FOR",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-002-40",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "40 (M)",
        "sku": "SHIRT-002-40-FOR",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-002-42",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "42 (L)",
        "sku": "SHIRT-002-42-FOR",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-002-44",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-002-44-FOR",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-002-46",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-002-46-FOR",
        "inStock": true,
        "stockCount": 13
      }
    ],
    "fit": "Regular",
    "fabric": "Pure Linen",
    "collar": "Button-Down Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.4,
    "reviewCount": 31,
    "isFeatured": true,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-003",
    "slug": "monochrome-abstract-grey-shirt",
    "name": "Monochrome Abstract Grey Shirt",
    "tagline": "Premium Oxford Cotton tailored in Relaxed fit",
    "description": "Crafted with high-grade Oxford Cotton, this shirt features a clean Mandarin Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3299,
    "compareAtPrice": 4099,
    "discountPercent": 20,
    "images": [
      "/images/products/monochrome-abstract-grey-1.jpg",
      "/images/products/monochrome-abstract-grey-2.jpg",
      "/images/products/monochrome-abstract-grey-3.jpg",
      "/images/products/monochrome-abstract-grey-4.jpg"
    ],
    "colors": [
      {
        "name": "Olive Green",
        "hex": "#3B4D36"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-003-38",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "38 (S)",
        "sku": "SHIRT-003-38-OLI",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-003-39",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "39 (M)",
        "sku": "SHIRT-003-39-OLI",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-003-40",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "40 (M)",
        "sku": "SHIRT-003-40-OLI",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-003-42",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "42 (L)",
        "sku": "SHIRT-003-42-OLI",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-003-44",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-003-44-OLI",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-003-46",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-003-46-OLI",
        "inStock": true,
        "stockCount": 16
      }
    ],
    "fit": "Relaxed",
    "fabric": "Oxford Cotton",
    "collar": "Mandarin Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.5,
    "reviewCount": 38,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-004",
    "slug": "forest-floral-green-cotton-shirt",
    "name": "Forest Floral Green Cotton Shirt",
    "tagline": "Premium Cotton Poplin tailored in Slim fit",
    "description": "Crafted with high-grade Cotton Poplin, this shirt features a clean Cuban Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3699,
    "compareAtPrice": 4499,
    "discountPercent": 18,
    "images": [
      "/images/products/heritage-leaf-brown-1.jpg",
      "/images/products/heritage-leaf-brown-2.jpg",
      "/images/products/heritage-leaf-brown-3.jpg",
      "/images/products/heritage-leaf-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Monochrome Grey",
        "hex": "#4A4E51"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-004-38",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "38 (S)",
        "sku": "SHIRT-004-38-MON",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-004-39",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "39 (M)",
        "sku": "SHIRT-004-39-MON",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-004-40",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "40 (M)",
        "sku": "SHIRT-004-40-MON",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-004-42",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "42 (L)",
        "sku": "SHIRT-004-42-MON",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-004-44",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-004-44-MON",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-004-46",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-004-46-MON",
        "inStock": true,
        "stockCount": 19
      }
    ],
    "fit": "Slim",
    "fabric": "Cotton Poplin",
    "collar": "Cuban Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.6,
    "reviewCount": 45,
    "isFeatured": true,
    "isNewArrival": false,
    "isDeal": true
  },
  {
    "id": "shirt-005",
    "slug": "olive-paisley-green-luxury-shirt",
    "name": "Olive Paisley Green Luxury Shirt",
    "tagline": "Premium Denim tailored in Regular fit",
    "description": "Crafted with high-grade Denim, this shirt features a clean Cutaway Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4099,
    "compareAtPrice": 4899,
    "discountPercent": 16,
    "images": [
      "/images/products/olive-paisley-green-1.jpg",
      "/images/products/olive-paisley-green-2.jpg",
      "/images/products/olive-paisley-green-3.jpg",
      "/images/products/olive-paisley-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Ivory White",
        "hex": "#F7F5EE"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-005-38",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "38 (S)",
        "sku": "SHIRT-005-38-IVO",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-005-39",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "39 (M)",
        "sku": "SHIRT-005-39-IVO",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-005-40",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "40 (M)",
        "sku": "SHIRT-005-40-IVO",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-005-42",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "42 (L)",
        "sku": "SHIRT-005-42-IVO",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-005-44",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-005-44-IVO",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-005-46",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-005-46-IVO",
        "inStock": true,
        "stockCount": 22
      }
    ],
    "fit": "Regular",
    "fabric": "Denim",
    "collar": "Cutaway Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.7,
    "reviewCount": 52,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-006",
    "slug": "terra-striped-heavy-twill-overshirt",
    "name": "Terra Striped Heavy Twill Overshirt",
    "tagline": "Premium Linen Blend tailored in Relaxed fit",
    "description": "Crafted with high-grade Linen Blend, this shirt features a clean Spread Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4499,
    "compareAtPrice": 5299,
    "discountPercent": 15,
    "images": [
      "/images/products/terra-striped-brown-1.jpg",
      "/images/products/terra-striped-brown-2.jpg",
      "/images/products/terra-striped-brown-3.jpg",
      "/images/products/terra-striped-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Natural Cream",
        "hex": "#EBE5D8"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-006-38",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "38 (S)",
        "sku": "SHIRT-006-38-NAT",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-006-39",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "39 (M)",
        "sku": "SHIRT-006-39-NAT",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-006-40",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "40 (M)",
        "sku": "SHIRT-006-40-NAT",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-006-42",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "42 (L)",
        "sku": "SHIRT-006-42-NAT",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-006-44",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-006-44-NAT",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-006-46",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-006-46-NAT",
        "inStock": true,
        "stockCount": 25
      }
    ],
    "fit": "Relaxed",
    "fabric": "Linen Blend",
    "collar": "Spread Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.8,
    "reviewCount": 59,
    "isFeatured": true,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-007",
    "slug": "natural-linen-cream-pocket-shirt",
    "name": "Natural Linen Cream Pocket Shirt",
    "tagline": "Premium 100% Egyptian Cotton tailored in Slim fit",
    "description": "Crafted with high-grade 100% Egyptian Cotton, this shirt features a clean Button-Down Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2499,
    "compareAtPrice": 3299,
    "discountPercent": 24,
    "images": [
      "/images/products/natural-linen-cream-1.jpg",
      "/images/products/natural-linen-cream-2.jpg",
      "/images/products/natural-linen-cream-3.jpg",
      "/images/products/natural-linen-cream-4.jpg"
    ],
    "colors": [
      {
        "name": "Terra Cotta",
        "hex": "#8B4513"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-007-38",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "38 (S)",
        "sku": "SHIRT-007-38-TER",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-007-39",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "39 (M)",
        "sku": "SHIRT-007-39-TER",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-007-40",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "40 (M)",
        "sku": "SHIRT-007-40-TER",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-007-42",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "42 (L)",
        "sku": "SHIRT-007-42-TER",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-007-44",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-007-44-TER",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-007-46",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-007-46-TER",
        "inStock": true,
        "stockCount": 28
      }
    ],
    "fit": "Slim",
    "fabric": "100% Egyptian Cotton",
    "collar": "Button-Down Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.9,
    "reviewCount": 66,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": true
  },
  {
    "id": "shirt-008",
    "slug": "pure-egyptian-linen-ivory-shirt",
    "name": "Pure Egyptian Linen Ivory Shirt",
    "tagline": "Premium Pure Linen tailored in Regular fit",
    "description": "Crafted with high-grade Pure Linen, this shirt features a clean Mandarin Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2899,
    "compareAtPrice": 3699,
    "discountPercent": 22,
    "images": [
      "/images/products/egyptian-linen-ivory-1.jpg",
      "/images/products/egyptian-linen-ivory-2.jpg",
      "/images/products/egyptian-linen-ivory-3.jpg",
      "/images/products/egyptian-linen-ivory-4.jpg"
    ],
    "colors": [
      {
        "name": "Midnight Navy",
        "hex": "#1B263B"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-008-38",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "38 (S)",
        "sku": "SHIRT-008-38-MID",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-008-39",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "39 (M)",
        "sku": "SHIRT-008-39-MID",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-008-40",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "40 (M)",
        "sku": "SHIRT-008-40-MID",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-008-42",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "42 (L)",
        "sku": "SHIRT-008-42-MID",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-008-44",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-008-44-MID",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-008-46",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-008-46-MID",
        "inStock": true,
        "stockCount": 31
      }
    ],
    "fit": "Regular",
    "fabric": "Pure Linen",
    "collar": "Mandarin Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.3,
    "reviewCount": 73,
    "isFeatured": true,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-009",
    "slug": "vintage-paisley-emerald-green-shirt",
    "name": "Vintage Paisley Emerald Green Shirt",
    "tagline": "Premium Oxford Cotton tailored in Relaxed fit",
    "description": "Crafted with high-grade Oxford Cotton, this shirt features a clean Cuban Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3299,
    "compareAtPrice": 4099,
    "discountPercent": 20,
    "images": [
      "/images/products/artisan-mandala-brown-1.jpg",
      "/images/products/artisan-mandala-brown-2.jpg",
      "/images/products/artisan-mandala-brown-3.jpg"
    ],
    "colors": [
      {
        "name": "Artisan Brown",
        "hex": "#5C3A21"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-009-38",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "38 (S)",
        "sku": "SHIRT-009-38-ART",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-009-39",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "39 (M)",
        "sku": "SHIRT-009-39-ART",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-009-40",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "40 (M)",
        "sku": "SHIRT-009-40-ART",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-009-42",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "42 (L)",
        "sku": "SHIRT-009-42-ART",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-009-44",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-009-44-ART",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-009-46",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-009-46-ART",
        "inStock": true,
        "stockCount": 34
      }
    ],
    "fit": "Relaxed",
    "fabric": "Oxford Cotton",
    "collar": "Cuban Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.4,
    "reviewCount": 80,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-010",
    "slug": "rustic-brown-terra-cotta-overshirt",
    "name": "Rustic Brown Terra Cotta Overshirt",
    "tagline": "Premium Cotton Poplin tailored in Slim fit",
    "description": "Crafted with high-grade Cotton Poplin, this shirt features a clean Cutaway Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3699,
    "compareAtPrice": 4499,
    "discountPercent": 18,
    "images": [
      "/images/products/forest-floral-green-1.jpg",
      "/images/products/forest-floral-green-2.jpg",
      "/images/products/forest-floral-green-3.jpg",
      "/images/products/forest-floral-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Forest Green",
        "hex": "#2D4A3E"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-010-38",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "38 (S)",
        "sku": "SHIRT-010-38-FOR",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-010-39",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "39 (M)",
        "sku": "SHIRT-010-39-FOR",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-010-40",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "40 (M)",
        "sku": "SHIRT-010-40-FOR",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-010-42",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "42 (L)",
        "sku": "SHIRT-010-42-FOR",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-010-44",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-010-44-FOR",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-010-46",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-010-46-FOR",
        "inStock": true,
        "stockCount": 12
      }
    ],
    "fit": "Slim",
    "fabric": "Cotton Poplin",
    "collar": "Cutaway Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.5,
    "reviewCount": 87,
    "isFeatured": true,
    "isNewArrival": false,
    "isDeal": true
  },
  {
    "id": "shirt-011",
    "slug": "crisp-ivory-normandy-linen-cuban-shirt",
    "name": "Crisp Ivory Normandy Linen Cuban Shirt",
    "tagline": "Premium Denim tailored in Regular fit",
    "description": "Crafted with high-grade Denim, this shirt features a clean Spread Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4099,
    "compareAtPrice": 4899,
    "discountPercent": 16,
    "images": [
      "/images/products/monochrome-abstract-grey-1.jpg",
      "/images/products/monochrome-abstract-grey-2.jpg",
      "/images/products/monochrome-abstract-grey-3.jpg",
      "/images/products/monochrome-abstract-grey-4.jpg"
    ],
    "colors": [
      {
        "name": "Olive Green",
        "hex": "#3B4D36"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-011-38",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "38 (S)",
        "sku": "SHIRT-011-38-OLI",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-011-39",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "39 (M)",
        "sku": "SHIRT-011-39-OLI",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-011-40",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "40 (M)",
        "sku": "SHIRT-011-40-OLI",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-011-42",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "42 (L)",
        "sku": "SHIRT-011-42-OLI",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-011-44",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-011-44-OLI",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-011-46",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-011-46-OLI",
        "inStock": true,
        "stockCount": 15
      }
    ],
    "fit": "Regular",
    "fabric": "Denim",
    "collar": "Spread Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.6,
    "reviewCount": 94,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-012",
    "slug": "botanical-garden-floral-print-shirt",
    "name": "Botanical Garden Floral Print Shirt",
    "tagline": "Premium Linen Blend tailored in Relaxed fit",
    "description": "Crafted with high-grade Linen Blend, this shirt features a clean Button-Down Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4499,
    "compareAtPrice": 5299,
    "discountPercent": 15,
    "images": [
      "/images/products/heritage-leaf-brown-1.jpg",
      "/images/products/heritage-leaf-brown-2.jpg",
      "/images/products/heritage-leaf-brown-3.jpg",
      "/images/products/heritage-leaf-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Monochrome Grey",
        "hex": "#4A4E51"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-012-38",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "38 (S)",
        "sku": "SHIRT-012-38-MON",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-012-39",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "39 (M)",
        "sku": "SHIRT-012-39-MON",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-012-40",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "40 (M)",
        "sku": "SHIRT-012-40-MON",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-012-42",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "42 (L)",
        "sku": "SHIRT-012-42-MON",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-012-44",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-012-44-MON",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-012-46",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-012-46-MON",
        "inStock": true,
        "stockCount": 18
      }
    ],
    "fit": "Relaxed",
    "fabric": "Linen Blend",
    "collar": "Button-Down Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.7,
    "reviewCount": 101,
    "isFeatured": true,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-013",
    "slug": "urban-camo-monochrome-poplin-shirt",
    "name": "Urban Camo Monochrome Poplin Shirt",
    "tagline": "Premium 100% Egyptian Cotton tailored in Slim fit",
    "description": "Crafted with high-grade 100% Egyptian Cotton, this shirt features a clean Mandarin Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2499,
    "compareAtPrice": 3299,
    "discountPercent": 24,
    "images": [
      "/images/products/olive-paisley-green-1.jpg",
      "/images/products/olive-paisley-green-2.jpg",
      "/images/products/olive-paisley-green-3.jpg",
      "/images/products/olive-paisley-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Ivory White",
        "hex": "#F7F5EE"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-013-38",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "38 (S)",
        "sku": "SHIRT-013-38-IVO",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-013-39",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "39 (M)",
        "sku": "SHIRT-013-39-IVO",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-013-40",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "40 (M)",
        "sku": "SHIRT-013-40-IVO",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-013-42",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "42 (L)",
        "sku": "SHIRT-013-42-IVO",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-013-44",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-013-44-IVO",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-013-46",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-013-46-IVO",
        "inStock": true,
        "stockCount": 21
      }
    ],
    "fit": "Slim",
    "fabric": "100% Egyptian Cotton",
    "collar": "Mandarin Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.8,
    "reviewCount": 108,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": true
  },
  {
    "id": "shirt-014",
    "slug": "sandstone-striped-heavy-twill-overshirt",
    "name": "Sandstone Striped Heavy Twill Overshirt",
    "tagline": "Premium Pure Linen tailored in Regular fit",
    "description": "Crafted with high-grade Pure Linen, this shirt features a clean Cuban Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2899,
    "compareAtPrice": 3699,
    "discountPercent": 22,
    "images": [
      "/images/products/terra-striped-brown-1.jpg",
      "/images/products/terra-striped-brown-2.jpg",
      "/images/products/terra-striped-brown-3.jpg",
      "/images/products/terra-striped-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Natural Cream",
        "hex": "#EBE5D8"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-014-38",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "38 (S)",
        "sku": "SHIRT-014-38-NAT",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-014-39",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "39 (M)",
        "sku": "SHIRT-014-39-NAT",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-014-40",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "40 (M)",
        "sku": "SHIRT-014-40-NAT",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-014-42",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "42 (L)",
        "sku": "SHIRT-014-42-NAT",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-014-44",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-014-44-NAT",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-014-46",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-014-46-NAT",
        "inStock": true,
        "stockCount": 24
      }
    ],
    "fit": "Regular",
    "fabric": "Pure Linen",
    "collar": "Cuban Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.9,
    "reviewCount": 115,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-015",
    "slug": "natural-cream-flax-resort-shirt",
    "name": "Natural Cream Flax Resort Shirt",
    "tagline": "Premium Oxford Cotton tailored in Relaxed fit",
    "description": "Crafted with high-grade Oxford Cotton, this shirt features a clean Cutaway Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3299,
    "compareAtPrice": 4099,
    "discountPercent": 20,
    "images": [
      "/images/products/natural-linen-cream-1.jpg",
      "/images/products/natural-linen-cream-2.jpg",
      "/images/products/natural-linen-cream-3.jpg",
      "/images/products/natural-linen-cream-4.jpg"
    ],
    "colors": [
      {
        "name": "Terra Cotta",
        "hex": "#8B4513"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-015-38",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "38 (S)",
        "sku": "SHIRT-015-38-TER",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-015-39",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "39 (M)",
        "sku": "SHIRT-015-39-TER",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-015-40",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "40 (M)",
        "sku": "SHIRT-015-40-TER",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-015-42",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "42 (L)",
        "sku": "SHIRT-015-42-TER",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-015-44",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-015-44-TER",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-015-46",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-015-46-TER",
        "inStock": true,
        "stockCount": 27
      }
    ],
    "fit": "Relaxed",
    "fabric": "Oxford Cotton",
    "collar": "Cutaway Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.3,
    "reviewCount": 122,
    "isFeatured": false,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-016",
    "slug": "heritage-mandala-espresso-cotton-shirt",
    "name": "Heritage Mandala Espresso Cotton Shirt",
    "tagline": "Premium Cotton Poplin tailored in Slim fit",
    "description": "Crafted with high-grade Cotton Poplin, this shirt features a clean Spread Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3699,
    "compareAtPrice": 4499,
    "discountPercent": 18,
    "images": [
      "/images/products/egyptian-linen-ivory-1.jpg",
      "/images/products/egyptian-linen-ivory-2.jpg",
      "/images/products/egyptian-linen-ivory-3.jpg",
      "/images/products/egyptian-linen-ivory-4.jpg"
    ],
    "colors": [
      {
        "name": "Midnight Navy",
        "hex": "#1B263B"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-016-38",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "38 (S)",
        "sku": "SHIRT-016-38-MID",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-016-39",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "39 (M)",
        "sku": "SHIRT-016-39-MID",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-016-40",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "40 (M)",
        "sku": "SHIRT-016-40-MID",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-016-42",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "42 (L)",
        "sku": "SHIRT-016-42-MID",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-016-44",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-016-44-MID",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-016-46",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-016-46-MID",
        "inStock": true,
        "stockCount": 30
      }
    ],
    "fit": "Slim",
    "fabric": "Cotton Poplin",
    "collar": "Spread Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.4,
    "reviewCount": 129,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": true
  },
  {
    "id": "shirt-017",
    "slug": "forest-green-cuban-collar-resort-shirt",
    "name": "Forest Green Cuban Collar Resort Shirt",
    "tagline": "Premium Denim tailored in Regular fit",
    "description": "Crafted with high-grade Denim, this shirt features a clean Button-Down Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4099,
    "compareAtPrice": 4899,
    "discountPercent": 16,
    "images": [
      "/images/products/artisan-mandala-brown-1.jpg",
      "/images/products/artisan-mandala-brown-2.jpg",
      "/images/products/artisan-mandala-brown-3.jpg"
    ],
    "colors": [
      {
        "name": "Artisan Brown",
        "hex": "#5C3A21"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-017-38",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "38 (S)",
        "sku": "SHIRT-017-38-ART",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-017-39",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "39 (M)",
        "sku": "SHIRT-017-39-ART",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-017-40",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "40 (M)",
        "sku": "SHIRT-017-40-ART",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-017-42",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "42 (L)",
        "sku": "SHIRT-017-42-ART",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-017-44",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-017-44-ART",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-017-46",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-017-46-ART",
        "inStock": true,
        "stockCount": 33
      }
    ],
    "fit": "Regular",
    "fabric": "Denim",
    "collar": "Button-Down Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.5,
    "reviewCount": 136,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-018",
    "slug": "charcoal-grey-abstract-poplin-shirt",
    "name": "Charcoal Grey Abstract Poplin Shirt",
    "tagline": "Premium Linen Blend tailored in Relaxed fit",
    "description": "Crafted with high-grade Linen Blend, this shirt features a clean Mandarin Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4499,
    "compareAtPrice": 5299,
    "discountPercent": 15,
    "images": [
      "/images/products/forest-floral-green-1.jpg",
      "/images/products/forest-floral-green-2.jpg",
      "/images/products/forest-floral-green-3.jpg",
      "/images/products/forest-floral-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Forest Green",
        "hex": "#2D4A3E"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-018-38",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "38 (S)",
        "sku": "SHIRT-018-38-FOR",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-018-39",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "39 (M)",
        "sku": "SHIRT-018-39-FOR",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-018-40",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "40 (M)",
        "sku": "SHIRT-018-40-FOR",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-018-42",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "42 (L)",
        "sku": "SHIRT-018-42-FOR",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-018-44",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-018-44-FOR",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-018-46",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-018-46-FOR",
        "inStock": true,
        "stockCount": 11
      }
    ],
    "fit": "Relaxed",
    "fabric": "Linen Blend",
    "collar": "Mandarin Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.6,
    "reviewCount": 143,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-019",
    "slug": "egyptian-giza-cotton-ivory-classic-shirt",
    "name": "Egyptian Giza Cotton Ivory Classic Shirt",
    "tagline": "Premium 100% Egyptian Cotton tailored in Slim fit",
    "description": "Crafted with high-grade 100% Egyptian Cotton, this shirt features a clean Cuban Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2499,
    "compareAtPrice": 3299,
    "discountPercent": 24,
    "images": [
      "/images/products/monochrome-abstract-grey-1.jpg",
      "/images/products/monochrome-abstract-grey-2.jpg",
      "/images/products/monochrome-abstract-grey-3.jpg",
      "/images/products/monochrome-abstract-grey-4.jpg"
    ],
    "colors": [
      {
        "name": "Olive Green",
        "hex": "#3B4D36"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-019-38",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "38 (S)",
        "sku": "SHIRT-019-38-OLI",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-019-39",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "39 (M)",
        "sku": "SHIRT-019-39-OLI",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-019-40",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "40 (M)",
        "sku": "SHIRT-019-40-OLI",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-019-42",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "42 (L)",
        "sku": "SHIRT-019-42-OLI",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-019-44",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-019-44-OLI",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-019-46",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-019-46-OLI",
        "inStock": true,
        "stockCount": 14
      }
    ],
    "fit": "Slim",
    "fabric": "100% Egyptian Cotton",
    "collar": "Cuban Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.7,
    "reviewCount": 150,
    "isFeatured": false,
    "isNewArrival": true,
    "isDeal": true
  },
  {
    "id": "shirt-020",
    "slug": "terra-cotta-tie-dye-overshirt",
    "name": "Terra Cotta Tie-Dye Overshirt",
    "tagline": "Premium Pure Linen tailored in Regular fit",
    "description": "Crafted with high-grade Pure Linen, this shirt features a clean Cutaway Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2899,
    "compareAtPrice": 3699,
    "discountPercent": 22,
    "images": [
      "/images/products/heritage-leaf-brown-1.jpg",
      "/images/products/heritage-leaf-brown-2.jpg",
      "/images/products/heritage-leaf-brown-3.jpg",
      "/images/products/heritage-leaf-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Monochrome Grey",
        "hex": "#4A4E51"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-020-38",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "38 (S)",
        "sku": "SHIRT-020-38-MON",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-020-39",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "39 (M)",
        "sku": "SHIRT-020-39-MON",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-020-40",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "40 (M)",
        "sku": "SHIRT-020-40-MON",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-020-42",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "42 (L)",
        "sku": "SHIRT-020-42-MON",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-020-44",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-020-44-MON",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-020-46",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-020-46-MON",
        "inStock": true,
        "stockCount": 17
      }
    ],
    "fit": "Regular",
    "fabric": "Pure Linen",
    "collar": "Cutaway Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.8,
    "reviewCount": 157,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-021",
    "slug": "sage-green-olive-paisley-linen-shirt",
    "name": "Sage Green Olive Paisley Linen Shirt",
    "tagline": "Premium Oxford Cotton tailored in Relaxed fit",
    "description": "Crafted with high-grade Oxford Cotton, this shirt features a clean Spread Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3299,
    "compareAtPrice": 4099,
    "discountPercent": 20,
    "images": [
      "/images/products/olive-paisley-green-1.jpg",
      "/images/products/olive-paisley-green-2.jpg",
      "/images/products/olive-paisley-green-3.jpg",
      "/images/products/olive-paisley-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Ivory White",
        "hex": "#F7F5EE"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-021-38",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "38 (S)",
        "sku": "SHIRT-021-38-IVO",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-021-39",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "39 (M)",
        "sku": "SHIRT-021-39-IVO",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-021-40",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "40 (M)",
        "sku": "SHIRT-021-40-IVO",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-021-42",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "42 (L)",
        "sku": "SHIRT-021-42-IVO",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-021-44",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-021-44-IVO",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-021-46",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-021-46-IVO",
        "inStock": true,
        "stockCount": 20
      }
    ],
    "fit": "Relaxed",
    "fabric": "Oxford Cotton",
    "collar": "Spread Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.9,
    "reviewCount": 164,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-022",
    "slug": "raw-flax-natural-linen-pocket-shirt",
    "name": "Raw Flax Natural Linen Pocket Shirt",
    "tagline": "Premium Cotton Poplin tailored in Slim fit",
    "description": "Crafted with high-grade Cotton Poplin, this shirt features a clean Button-Down Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3699,
    "compareAtPrice": 4499,
    "discountPercent": 18,
    "images": [
      "/images/products/terra-striped-brown-1.jpg",
      "/images/products/terra-striped-brown-2.jpg",
      "/images/products/terra-striped-brown-3.jpg",
      "/images/products/terra-striped-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Natural Cream",
        "hex": "#EBE5D8"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-022-38",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "38 (S)",
        "sku": "SHIRT-022-38-NAT",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-022-39",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "39 (M)",
        "sku": "SHIRT-022-39-NAT",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-022-40",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "40 (M)",
        "sku": "SHIRT-022-40-NAT",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-022-42",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "42 (L)",
        "sku": "SHIRT-022-42-NAT",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-022-44",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-022-44-NAT",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-022-46",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-022-46-NAT",
        "inStock": true,
        "stockCount": 23
      }
    ],
    "fit": "Slim",
    "fabric": "Cotton Poplin",
    "collar": "Button-Down Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.3,
    "reviewCount": 171,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": true
  },
  {
    "id": "shirt-023",
    "slug": "warm-mocha-mandala-print-cotton-shirt",
    "name": "Warm Mocha Mandala Print Cotton Shirt",
    "tagline": "Premium Denim tailored in Regular fit",
    "description": "Crafted with high-grade Denim, this shirt features a clean Mandarin Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4099,
    "compareAtPrice": 4899,
    "discountPercent": 16,
    "images": [
      "/images/products/natural-linen-cream-1.jpg",
      "/images/products/natural-linen-cream-2.jpg",
      "/images/products/natural-linen-cream-3.jpg",
      "/images/products/natural-linen-cream-4.jpg"
    ],
    "colors": [
      {
        "name": "Terra Cotta",
        "hex": "#8B4513"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-023-38",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "38 (S)",
        "sku": "SHIRT-023-38-TER",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-023-39",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "39 (M)",
        "sku": "SHIRT-023-39-TER",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-023-40",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "40 (M)",
        "sku": "SHIRT-023-40-TER",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-023-42",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "42 (L)",
        "sku": "SHIRT-023-42-TER",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-023-44",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-023-44-TER",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-023-46",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-023-46-TER",
        "inStock": true,
        "stockCount": 26
      }
    ],
    "fit": "Regular",
    "fabric": "Denim",
    "collar": "Mandarin Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.4,
    "reviewCount": 178,
    "isFeatured": false,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-024",
    "slug": "deep-forest-botanical-green-shirt",
    "name": "Deep Forest Botanical Green Shirt",
    "tagline": "Premium Linen Blend tailored in Relaxed fit",
    "description": "Crafted with high-grade Linen Blend, this shirt features a clean Cuban Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4499,
    "compareAtPrice": 5299,
    "discountPercent": 15,
    "images": [
      "/images/products/egyptian-linen-ivory-1.jpg",
      "/images/products/egyptian-linen-ivory-2.jpg",
      "/images/products/egyptian-linen-ivory-3.jpg",
      "/images/products/egyptian-linen-ivory-4.jpg"
    ],
    "colors": [
      {
        "name": "Midnight Navy",
        "hex": "#1B263B"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-024-38",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "38 (S)",
        "sku": "SHIRT-024-38-MID",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-024-39",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "39 (M)",
        "sku": "SHIRT-024-39-MID",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-024-40",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "40 (M)",
        "sku": "SHIRT-024-40-MID",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-024-42",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "42 (L)",
        "sku": "SHIRT-024-42-MID",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-024-44",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-024-44-MID",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-024-46",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-024-46-MID",
        "inStock": true,
        "stockCount": 29
      }
    ],
    "fit": "Relaxed",
    "fabric": "Linen Blend",
    "collar": "Cuban Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.5,
    "reviewCount": 185,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-025",
    "slug": "slate-grey-abstract-urban-poplin",
    "name": "Slate Grey Abstract Urban Poplin",
    "tagline": "Premium 100% Egyptian Cotton tailored in Slim fit",
    "description": "Crafted with high-grade 100% Egyptian Cotton, this shirt features a clean Cutaway Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2499,
    "compareAtPrice": 3299,
    "discountPercent": 24,
    "images": [
      "/images/products/artisan-mandala-brown-1.jpg",
      "/images/products/artisan-mandala-brown-2.jpg",
      "/images/products/artisan-mandala-brown-3.jpg"
    ],
    "colors": [
      {
        "name": "Artisan Brown",
        "hex": "#5C3A21"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-025-38",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "38 (S)",
        "sku": "SHIRT-025-38-ART",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-025-39",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "39 (M)",
        "sku": "SHIRT-025-39-ART",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-025-40",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "40 (M)",
        "sku": "SHIRT-025-40-ART",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-025-42",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "42 (L)",
        "sku": "SHIRT-025-42-ART",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-025-44",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-025-44-ART",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-025-46",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-025-46-ART",
        "inStock": true,
        "stockCount": 32
      }
    ],
    "fit": "Slim",
    "fabric": "100% Egyptian Cotton",
    "collar": "Cutaway Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.6,
    "reviewCount": 192,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": true
  },
  {
    "id": "shirt-026",
    "slug": "heritage-striped-twill-utility-shirt",
    "name": "Heritage Striped Twill Utility Shirt",
    "tagline": "Premium Pure Linen tailored in Regular fit",
    "description": "Crafted with high-grade Pure Linen, this shirt features a clean Spread Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2899,
    "compareAtPrice": 3699,
    "discountPercent": 22,
    "images": [
      "/images/products/forest-floral-green-1.jpg",
      "/images/products/forest-floral-green-2.jpg",
      "/images/products/forest-floral-green-3.jpg",
      "/images/products/forest-floral-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Forest Green",
        "hex": "#2D4A3E"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-026-38",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "38 (S)",
        "sku": "SHIRT-026-38-FOR",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-026-39",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "39 (M)",
        "sku": "SHIRT-026-39-FOR",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-026-40",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "40 (M)",
        "sku": "SHIRT-026-40-FOR",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-026-42",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "42 (L)",
        "sku": "SHIRT-026-42-FOR",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-026-44",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-026-44-FOR",
        "inStock": true,
        "stockCount": 10
      },
      {
        "id": "var-026-46",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-026-46-FOR",
        "inStock": true,
        "stockCount": 10
      }
    ],
    "fit": "Regular",
    "fabric": "Pure Linen",
    "collar": "Spread Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.7,
    "reviewCount": 199,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-027",
    "slug": "pure-cream-linen-vacation-collar-shirt",
    "name": "Pure Cream Linen Vacation Collar Shirt",
    "tagline": "Premium Oxford Cotton tailored in Relaxed fit",
    "description": "Crafted with high-grade Oxford Cotton, this shirt features a clean Button-Down Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3299,
    "compareAtPrice": 4099,
    "discountPercent": 20,
    "images": [
      "/images/products/monochrome-abstract-grey-1.jpg",
      "/images/products/monochrome-abstract-grey-2.jpg",
      "/images/products/monochrome-abstract-grey-3.jpg",
      "/images/products/monochrome-abstract-grey-4.jpg"
    ],
    "colors": [
      {
        "name": "Olive Green",
        "hex": "#3B4D36"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-027-38",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "38 (S)",
        "sku": "SHIRT-027-38-OLI",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-027-39",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "39 (M)",
        "sku": "SHIRT-027-39-OLI",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-027-40",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "40 (M)",
        "sku": "SHIRT-027-40-OLI",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-027-42",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "42 (L)",
        "sku": "SHIRT-027-42-OLI",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-027-44",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-027-44-OLI",
        "inStock": true,
        "stockCount": 13
      },
      {
        "id": "var-027-46",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-027-46-OLI",
        "inStock": true,
        "stockCount": 13
      }
    ],
    "fit": "Relaxed",
    "fabric": "Oxford Cotton",
    "collar": "Button-Down Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.8,
    "reviewCount": 206,
    "isFeatured": false,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-028",
    "slug": "royal-giza-cotton-ivory-dress-shirt",
    "name": "Royal Giza Cotton Ivory Dress Shirt",
    "tagline": "Premium Cotton Poplin tailored in Slim fit",
    "description": "Crafted with high-grade Cotton Poplin, this shirt features a clean Mandarin Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3699,
    "compareAtPrice": 4499,
    "discountPercent": 18,
    "images": [
      "/images/products/heritage-leaf-brown-1.jpg",
      "/images/products/heritage-leaf-brown-2.jpg",
      "/images/products/heritage-leaf-brown-3.jpg",
      "/images/products/heritage-leaf-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Monochrome Grey",
        "hex": "#4A4E51"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-028-38",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "38 (S)",
        "sku": "SHIRT-028-38-MON",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-028-39",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "39 (M)",
        "sku": "SHIRT-028-39-MON",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-028-40",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "40 (M)",
        "sku": "SHIRT-028-40-MON",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-028-42",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "42 (L)",
        "sku": "SHIRT-028-42-MON",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-028-44",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-028-44-MON",
        "inStock": true,
        "stockCount": 16
      },
      {
        "id": "var-028-46",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-028-46-MON",
        "inStock": true,
        "stockCount": 16
      }
    ],
    "fit": "Slim",
    "fabric": "Cotton Poplin",
    "collar": "Mandarin Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.9,
    "reviewCount": 213,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": true
  },
  {
    "id": "shirt-029",
    "slug": "olive-green-paisley-weave-resort-shirt",
    "name": "Olive Green Paisley Weave Resort Shirt",
    "tagline": "Premium Denim tailored in Regular fit",
    "description": "Crafted with high-grade Denim, this shirt features a clean Cuban Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4099,
    "compareAtPrice": 4899,
    "discountPercent": 16,
    "images": [
      "/images/products/olive-paisley-green-1.jpg",
      "/images/products/olive-paisley-green-2.jpg",
      "/images/products/olive-paisley-green-3.jpg",
      "/images/products/olive-paisley-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Ivory White",
        "hex": "#F7F5EE"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-029-38",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "38 (S)",
        "sku": "SHIRT-029-38-IVO",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-029-39",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "39 (M)",
        "sku": "SHIRT-029-39-IVO",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-029-40",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "40 (M)",
        "sku": "SHIRT-029-40-IVO",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-029-42",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "42 (L)",
        "sku": "SHIRT-029-42-IVO",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-029-44",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-029-44-IVO",
        "inStock": true,
        "stockCount": 19
      },
      {
        "id": "var-029-46",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-029-46-IVO",
        "inStock": true,
        "stockCount": 19
      }
    ],
    "fit": "Regular",
    "fabric": "Denim",
    "collar": "Cuban Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.3,
    "reviewCount": 220,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-030",
    "slug": "warm-clay-striped-heavy-twill-overshirt",
    "name": "Warm Clay Striped Heavy Twill Overshirt",
    "tagline": "Premium Linen Blend tailored in Relaxed fit",
    "description": "Crafted with high-grade Linen Blend, this shirt features a clean Cutaway Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4499,
    "compareAtPrice": 5299,
    "discountPercent": 15,
    "images": [
      "/images/products/terra-striped-brown-1.jpg",
      "/images/products/terra-striped-brown-2.jpg",
      "/images/products/terra-striped-brown-3.jpg",
      "/images/products/terra-striped-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Natural Cream",
        "hex": "#EBE5D8"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-030-38",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "38 (S)",
        "sku": "SHIRT-030-38-NAT",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-030-39",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "39 (M)",
        "sku": "SHIRT-030-39-NAT",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-030-40",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "40 (M)",
        "sku": "SHIRT-030-40-NAT",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-030-42",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "42 (L)",
        "sku": "SHIRT-030-42-NAT",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-030-44",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-030-44-NAT",
        "inStock": true,
        "stockCount": 22
      },
      {
        "id": "var-030-46",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-030-46-NAT",
        "inStock": true,
        "stockCount": 22
      }
    ],
    "fit": "Relaxed",
    "fabric": "Linen Blend",
    "collar": "Cutaway Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.4,
    "reviewCount": 227,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-031",
    "slug": "natural-flax-pocket-linen-shirt",
    "name": "Natural Flax Pocket Linen Shirt",
    "tagline": "Premium 100% Egyptian Cotton tailored in Slim fit",
    "description": "Crafted with high-grade 100% Egyptian Cotton, this shirt features a clean Spread Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2499,
    "compareAtPrice": 3299,
    "discountPercent": 24,
    "images": [
      "/images/products/natural-linen-cream-1.jpg",
      "/images/products/natural-linen-cream-2.jpg",
      "/images/products/natural-linen-cream-3.jpg",
      "/images/products/natural-linen-cream-4.jpg"
    ],
    "colors": [
      {
        "name": "Terra Cotta",
        "hex": "#8B4513"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-031-38",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "38 (S)",
        "sku": "SHIRT-031-38-TER",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-031-39",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "39 (M)",
        "sku": "SHIRT-031-39-TER",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-031-40",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "40 (M)",
        "sku": "SHIRT-031-40-TER",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-031-42",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "42 (L)",
        "sku": "SHIRT-031-42-TER",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-031-44",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-031-44-TER",
        "inStock": true,
        "stockCount": 25
      },
      {
        "id": "var-031-46",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-031-46-TER",
        "inStock": true,
        "stockCount": 25
      }
    ],
    "fit": "Slim",
    "fabric": "100% Egyptian Cotton",
    "collar": "Spread Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.5,
    "reviewCount": 234,
    "isFeatured": false,
    "isNewArrival": true,
    "isDeal": true
  },
  {
    "id": "shirt-032",
    "slug": "earthy-brown-mandala-art-print-shirt",
    "name": "Earthy Brown Mandala Art Print Shirt",
    "tagline": "Premium Pure Linen tailored in Regular fit",
    "description": "Crafted with high-grade Pure Linen, this shirt features a clean Button-Down Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2899,
    "compareAtPrice": 3699,
    "discountPercent": 22,
    "images": [
      "/images/products/egyptian-linen-ivory-1.jpg",
      "/images/products/egyptian-linen-ivory-2.jpg",
      "/images/products/egyptian-linen-ivory-3.jpg",
      "/images/products/egyptian-linen-ivory-4.jpg"
    ],
    "colors": [
      {
        "name": "Midnight Navy",
        "hex": "#1B263B"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-032-38",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "38 (S)",
        "sku": "SHIRT-032-38-MID",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-032-39",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "39 (M)",
        "sku": "SHIRT-032-39-MID",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-032-40",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "40 (M)",
        "sku": "SHIRT-032-40-MID",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-032-42",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "42 (L)",
        "sku": "SHIRT-032-42-MID",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-032-44",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-032-44-MID",
        "inStock": true,
        "stockCount": 28
      },
      {
        "id": "var-032-46",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-032-46-MID",
        "inStock": true,
        "stockCount": 28
      }
    ],
    "fit": "Regular",
    "fabric": "Pure Linen",
    "collar": "Button-Down Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.6,
    "reviewCount": 241,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-033",
    "slug": "emerald-botanical-floral-poplin-shirt",
    "name": "Emerald Botanical Floral Poplin Shirt",
    "tagline": "Premium Oxford Cotton tailored in Relaxed fit",
    "description": "Crafted with high-grade Oxford Cotton, this shirt features a clean Mandarin Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3299,
    "compareAtPrice": 4099,
    "discountPercent": 20,
    "images": [
      "/images/products/artisan-mandala-brown-1.jpg",
      "/images/products/artisan-mandala-brown-2.jpg",
      "/images/products/artisan-mandala-brown-3.jpg"
    ],
    "colors": [
      {
        "name": "Artisan Brown",
        "hex": "#5C3A21"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-033-38",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "38 (S)",
        "sku": "SHIRT-033-38-ART",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-033-39",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "39 (M)",
        "sku": "SHIRT-033-39-ART",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-033-40",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "40 (M)",
        "sku": "SHIRT-033-40-ART",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-033-42",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "42 (L)",
        "sku": "SHIRT-033-42-ART",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-033-44",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-033-44-ART",
        "inStock": true,
        "stockCount": 31
      },
      {
        "id": "var-033-46",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-033-46-ART",
        "inStock": true,
        "stockCount": 31
      }
    ],
    "fit": "Relaxed",
    "fabric": "Oxford Cotton",
    "collar": "Mandarin Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.7,
    "reviewCount": 248,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-034",
    "slug": "dark-charcoal-abstract-print-shirt",
    "name": "Dark Charcoal Abstract Print Shirt",
    "tagline": "Premium Cotton Poplin tailored in Slim fit",
    "description": "Crafted with high-grade Cotton Poplin, this shirt features a clean Cuban Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3699,
    "compareAtPrice": 4499,
    "discountPercent": 18,
    "images": [
      "/images/products/forest-floral-green-1.jpg",
      "/images/products/forest-floral-green-2.jpg",
      "/images/products/forest-floral-green-3.jpg",
      "/images/products/forest-floral-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Forest Green",
        "hex": "#2D4A3E"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-034-38",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "38 (S)",
        "sku": "SHIRT-034-38-FOR",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-034-39",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "39 (M)",
        "sku": "SHIRT-034-39-FOR",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-034-40",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "40 (M)",
        "sku": "SHIRT-034-40-FOR",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-034-42",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "42 (L)",
        "sku": "SHIRT-034-42-FOR",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-034-44",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-034-44-FOR",
        "inStock": true,
        "stockCount": 34
      },
      {
        "id": "var-034-46",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-034-46-FOR",
        "inStock": true,
        "stockCount": 34
      }
    ],
    "fit": "Slim",
    "fabric": "Cotton Poplin",
    "collar": "Cuban Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.8,
    "reviewCount": 255,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": true
  },
  {
    "id": "shirt-035",
    "slug": "ivory-white-normandy-flax-cuban-shirt",
    "name": "Ivory White Normandy Flax Cuban Shirt",
    "tagline": "Premium Denim tailored in Regular fit",
    "description": "Crafted with high-grade Denim, this shirt features a clean Cutaway Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4099,
    "compareAtPrice": 4899,
    "discountPercent": 16,
    "images": [
      "/images/products/monochrome-abstract-grey-1.jpg",
      "/images/products/monochrome-abstract-grey-2.jpg",
      "/images/products/monochrome-abstract-grey-3.jpg",
      "/images/products/monochrome-abstract-grey-4.jpg"
    ],
    "colors": [
      {
        "name": "Olive Green",
        "hex": "#3B4D36"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-035-38",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "38 (S)",
        "sku": "SHIRT-035-38-OLI",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-035-39",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "39 (M)",
        "sku": "SHIRT-035-39-OLI",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-035-40",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "40 (M)",
        "sku": "SHIRT-035-40-OLI",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-035-42",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "42 (L)",
        "sku": "SHIRT-035-42-OLI",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-035-44",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-035-44-OLI",
        "inStock": true,
        "stockCount": 12
      },
      {
        "id": "var-035-46",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-035-46-OLI",
        "inStock": true,
        "stockCount": 12
      }
    ],
    "fit": "Regular",
    "fabric": "Denim",
    "collar": "Cutaway Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.9,
    "reviewCount": 262,
    "isFeatured": false,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-036",
    "slug": "terra-cotta-heritage-striped-overshirt",
    "name": "Terra Cotta Heritage Striped Overshirt",
    "tagline": "Premium Linen Blend tailored in Relaxed fit",
    "description": "Crafted with high-grade Linen Blend, this shirt features a clean Spread Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4499,
    "compareAtPrice": 5299,
    "discountPercent": 15,
    "images": [
      "/images/products/heritage-leaf-brown-1.jpg",
      "/images/products/heritage-leaf-brown-2.jpg",
      "/images/products/heritage-leaf-brown-3.jpg",
      "/images/products/heritage-leaf-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Monochrome Grey",
        "hex": "#4A4E51"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-036-38",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "38 (S)",
        "sku": "SHIRT-036-38-MON",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-036-39",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "39 (M)",
        "sku": "SHIRT-036-39-MON",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-036-40",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "40 (M)",
        "sku": "SHIRT-036-40-MON",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-036-42",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "42 (L)",
        "sku": "SHIRT-036-42-MON",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-036-44",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-036-44-MON",
        "inStock": true,
        "stockCount": 15
      },
      {
        "id": "var-036-46",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-036-46-MON",
        "inStock": true,
        "stockCount": 15
      }
    ],
    "fit": "Relaxed",
    "fabric": "Linen Blend",
    "collar": "Spread Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.3,
    "reviewCount": 269,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-037",
    "slug": "olive-paisley-cuban-collar-linen-shirt",
    "name": "Olive Paisley Cuban Collar Linen Shirt",
    "tagline": "Premium 100% Egyptian Cotton tailored in Slim fit",
    "description": "Crafted with high-grade 100% Egyptian Cotton, this shirt features a clean Button-Down Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2499,
    "compareAtPrice": 3299,
    "discountPercent": 24,
    "images": [
      "/images/products/olive-paisley-green-1.jpg",
      "/images/products/olive-paisley-green-2.jpg",
      "/images/products/olive-paisley-green-3.jpg",
      "/images/products/olive-paisley-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Ivory White",
        "hex": "#F7F5EE"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-037-38",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "38 (S)",
        "sku": "SHIRT-037-38-IVO",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-037-39",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "39 (M)",
        "sku": "SHIRT-037-39-IVO",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-037-40",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "40 (M)",
        "sku": "SHIRT-037-40-IVO",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-037-42",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "42 (L)",
        "sku": "SHIRT-037-42-IVO",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-037-44",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-037-44-IVO",
        "inStock": true,
        "stockCount": 18
      },
      {
        "id": "var-037-46",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-037-46-IVO",
        "inStock": true,
        "stockCount": 18
      }
    ],
    "fit": "Slim",
    "fabric": "100% Egyptian Cotton",
    "collar": "Button-Down Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.4,
    "reviewCount": 276,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": true
  },
  {
    "id": "shirt-038",
    "slug": "natural-cream-linen-button-down",
    "name": "Natural Cream Linen Button-Down",
    "tagline": "Premium Pure Linen tailored in Regular fit",
    "description": "Crafted with high-grade Pure Linen, this shirt features a clean Mandarin Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2899,
    "compareAtPrice": 3699,
    "discountPercent": 22,
    "images": [
      "/images/products/terra-striped-brown-1.jpg",
      "/images/products/terra-striped-brown-2.jpg",
      "/images/products/terra-striped-brown-3.jpg",
      "/images/products/terra-striped-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Natural Cream",
        "hex": "#EBE5D8"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-038-38",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "38 (S)",
        "sku": "SHIRT-038-38-NAT",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-038-39",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "39 (M)",
        "sku": "SHIRT-038-39-NAT",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-038-40",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "40 (M)",
        "sku": "SHIRT-038-40-NAT",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-038-42",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "42 (L)",
        "sku": "SHIRT-038-42-NAT",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-038-44",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-038-44-NAT",
        "inStock": true,
        "stockCount": 21
      },
      {
        "id": "var-038-46",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-038-46-NAT",
        "inStock": true,
        "stockCount": 21
      }
    ],
    "fit": "Regular",
    "fabric": "Pure Linen",
    "collar": "Mandarin Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.5,
    "reviewCount": 283,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-039",
    "slug": "egyptian-giza-cotton-mandarin-collar-shirt",
    "name": "Egyptian Giza Cotton Mandarin Collar Shirt",
    "tagline": "Premium Oxford Cotton tailored in Relaxed fit",
    "description": "Crafted with high-grade Oxford Cotton, this shirt features a clean Cuban Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3299,
    "compareAtPrice": 4099,
    "discountPercent": 20,
    "images": [
      "/images/products/natural-linen-cream-1.jpg",
      "/images/products/natural-linen-cream-2.jpg",
      "/images/products/natural-linen-cream-3.jpg",
      "/images/products/natural-linen-cream-4.jpg"
    ],
    "colors": [
      {
        "name": "Terra Cotta",
        "hex": "#8B4513"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-039-38",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "38 (S)",
        "sku": "SHIRT-039-38-TER",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-039-39",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "39 (M)",
        "sku": "SHIRT-039-39-TER",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-039-40",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "40 (M)",
        "sku": "SHIRT-039-40-TER",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-039-42",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "42 (L)",
        "sku": "SHIRT-039-42-TER",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-039-44",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-039-44-TER",
        "inStock": true,
        "stockCount": 24
      },
      {
        "id": "var-039-46",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-039-46-TER",
        "inStock": true,
        "stockCount": 24
      }
    ],
    "fit": "Relaxed",
    "fabric": "Oxford Cotton",
    "collar": "Cuban Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.6,
    "reviewCount": 290,
    "isFeatured": false,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-040",
    "slug": "warm-bronze-mandala-print-shirt",
    "name": "Warm Bronze Mandala Print Shirt",
    "tagline": "Premium Cotton Poplin tailored in Slim fit",
    "description": "Crafted with high-grade Cotton Poplin, this shirt features a clean Cutaway Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3699,
    "compareAtPrice": 4499,
    "discountPercent": 18,
    "images": [
      "/images/products/egyptian-linen-ivory-1.jpg",
      "/images/products/egyptian-linen-ivory-2.jpg",
      "/images/products/egyptian-linen-ivory-3.jpg",
      "/images/products/egyptian-linen-ivory-4.jpg"
    ],
    "colors": [
      {
        "name": "Midnight Navy",
        "hex": "#1B263B"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-040-38",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "38 (S)",
        "sku": "SHIRT-040-38-MID",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-040-39",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "39 (M)",
        "sku": "SHIRT-040-39-MID",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-040-40",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "40 (M)",
        "sku": "SHIRT-040-40-MID",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-040-42",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "42 (L)",
        "sku": "SHIRT-040-42-MID",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-040-44",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-040-44-MID",
        "inStock": true,
        "stockCount": 27
      },
      {
        "id": "var-040-46",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-040-46-MID",
        "inStock": true,
        "stockCount": 27
      }
    ],
    "fit": "Slim",
    "fabric": "Cotton Poplin",
    "collar": "Cutaway Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.7,
    "reviewCount": 297,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": true
  },
  {
    "id": "shirt-041",
    "slug": "forest-green-floral-cuban-resort-shirt",
    "name": "Forest Green Floral Cuban Resort Shirt",
    "tagline": "Premium Denim tailored in Regular fit",
    "description": "Crafted with high-grade Denim, this shirt features a clean Spread Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4099,
    "compareAtPrice": 4899,
    "discountPercent": 16,
    "images": [
      "/images/products/artisan-mandala-brown-1.jpg",
      "/images/products/artisan-mandala-brown-2.jpg",
      "/images/products/artisan-mandala-brown-3.jpg"
    ],
    "colors": [
      {
        "name": "Artisan Brown",
        "hex": "#5C3A21"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-041-38",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "38 (S)",
        "sku": "SHIRT-041-38-ART",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-041-39",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "39 (M)",
        "sku": "SHIRT-041-39-ART",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-041-40",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "40 (M)",
        "sku": "SHIRT-041-40-ART",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-041-42",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "42 (L)",
        "sku": "SHIRT-041-42-ART",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-041-44",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-041-44-ART",
        "inStock": true,
        "stockCount": 30
      },
      {
        "id": "var-041-46",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-041-46-ART",
        "inStock": true,
        "stockCount": 30
      }
    ],
    "fit": "Regular",
    "fabric": "Denim",
    "collar": "Spread Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.8,
    "reviewCount": 304,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-042",
    "slug": "monochrome-grey-camo-print-shirt",
    "name": "Monochrome Grey Camo Print Shirt",
    "tagline": "Premium Linen Blend tailored in Relaxed fit",
    "description": "Crafted with high-grade Linen Blend, this shirt features a clean Button-Down Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4499,
    "compareAtPrice": 5299,
    "discountPercent": 15,
    "images": [
      "/images/products/forest-floral-green-1.jpg",
      "/images/products/forest-floral-green-2.jpg",
      "/images/products/forest-floral-green-3.jpg",
      "/images/products/forest-floral-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Forest Green",
        "hex": "#2D4A3E"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-042-38",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "38 (S)",
        "sku": "SHIRT-042-38-FOR",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-042-39",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "39 (M)",
        "sku": "SHIRT-042-39-FOR",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-042-40",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "40 (M)",
        "sku": "SHIRT-042-40-FOR",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-042-42",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "42 (L)",
        "sku": "SHIRT-042-42-FOR",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-042-44",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-042-44-FOR",
        "inStock": true,
        "stockCount": 33
      },
      {
        "id": "var-042-46",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-042-46-FOR",
        "inStock": true,
        "stockCount": 33
      }
    ],
    "fit": "Relaxed",
    "fabric": "Linen Blend",
    "collar": "Button-Down Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.9,
    "reviewCount": 311,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-043",
    "slug": "terra-cotta-striped-relaxed-fit-overshirt",
    "name": "Terra Cotta Striped Relaxed Fit Overshirt",
    "tagline": "Premium 100% Egyptian Cotton tailored in Slim fit",
    "description": "Crafted with high-grade 100% Egyptian Cotton, this shirt features a clean Mandarin Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2499,
    "compareAtPrice": 3299,
    "discountPercent": 24,
    "images": [
      "/images/products/monochrome-abstract-grey-1.jpg",
      "/images/products/monochrome-abstract-grey-2.jpg",
      "/images/products/monochrome-abstract-grey-3.jpg",
      "/images/products/monochrome-abstract-grey-4.jpg"
    ],
    "colors": [
      {
        "name": "Olive Green",
        "hex": "#3B4D36"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-043-38",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "38 (S)",
        "sku": "SHIRT-043-38-OLI",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-043-39",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "39 (M)",
        "sku": "SHIRT-043-39-OLI",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-043-40",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "40 (M)",
        "sku": "SHIRT-043-40-OLI",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-043-42",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "42 (L)",
        "sku": "SHIRT-043-42-OLI",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-043-44",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-043-44-OLI",
        "inStock": true,
        "stockCount": 11
      },
      {
        "id": "var-043-46",
        "color": {
          "name": "Olive Green",
          "hex": "#3B4D36"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-043-46-OLI",
        "inStock": true,
        "stockCount": 11
      }
    ],
    "fit": "Slim",
    "fabric": "100% Egyptian Cotton",
    "collar": "Mandarin Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.3,
    "reviewCount": 318,
    "isFeatured": false,
    "isNewArrival": true,
    "isDeal": true
  },
  {
    "id": "shirt-044",
    "slug": "raw-ivory-normandy-linen-shirt",
    "name": "Raw Ivory Normandy Linen Shirt",
    "tagline": "Premium Pure Linen tailored in Regular fit",
    "description": "Crafted with high-grade Pure Linen, this shirt features a clean Cuban Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2899,
    "compareAtPrice": 3699,
    "discountPercent": 22,
    "images": [
      "/images/products/heritage-leaf-brown-1.jpg",
      "/images/products/heritage-leaf-brown-2.jpg",
      "/images/products/heritage-leaf-brown-3.jpg",
      "/images/products/heritage-leaf-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Monochrome Grey",
        "hex": "#4A4E51"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-044-38",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "38 (S)",
        "sku": "SHIRT-044-38-MON",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-044-39",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "39 (M)",
        "sku": "SHIRT-044-39-MON",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-044-40",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "40 (M)",
        "sku": "SHIRT-044-40-MON",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-044-42",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "42 (L)",
        "sku": "SHIRT-044-42-MON",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-044-44",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-044-44-MON",
        "inStock": true,
        "stockCount": 14
      },
      {
        "id": "var-044-46",
        "color": {
          "name": "Monochrome Grey",
          "hex": "#4A4E51"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-044-46-MON",
        "inStock": true,
        "stockCount": 14
      }
    ],
    "fit": "Regular",
    "fabric": "Pure Linen",
    "collar": "Cuban Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.4,
    "reviewCount": 325,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-045",
    "slug": "olive-paisley-luxury-tailored-shirt",
    "name": "Olive Paisley Luxury Tailored Shirt",
    "tagline": "Premium Oxford Cotton tailored in Relaxed fit",
    "description": "Crafted with high-grade Oxford Cotton, this shirt features a clean Cutaway Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3299,
    "compareAtPrice": 4099,
    "discountPercent": 20,
    "images": [
      "/images/products/olive-paisley-green-1.jpg",
      "/images/products/olive-paisley-green-2.jpg",
      "/images/products/olive-paisley-green-3.jpg",
      "/images/products/olive-paisley-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Ivory White",
        "hex": "#F7F5EE"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-045-38",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "38 (S)",
        "sku": "SHIRT-045-38-IVO",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-045-39",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "39 (M)",
        "sku": "SHIRT-045-39-IVO",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-045-40",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "40 (M)",
        "sku": "SHIRT-045-40-IVO",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-045-42",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "42 (L)",
        "sku": "SHIRT-045-42-IVO",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-045-44",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-045-44-IVO",
        "inStock": true,
        "stockCount": 17
      },
      {
        "id": "var-045-46",
        "color": {
          "name": "Ivory White",
          "hex": "#F7F5EE"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-045-46-IVO",
        "inStock": true,
        "stockCount": 17
      }
    ],
    "fit": "Relaxed",
    "fabric": "Oxford Cotton",
    "collar": "Cutaway Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.5,
    "reviewCount": 332,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-046",
    "slug": "vintage-brown-mandala-cotton-shirt",
    "name": "Vintage Brown Mandala Cotton Shirt",
    "tagline": "Premium Cotton Poplin tailored in Slim fit",
    "description": "Crafted with high-grade Cotton Poplin, this shirt features a clean Spread Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 3699,
    "compareAtPrice": 4499,
    "discountPercent": 18,
    "images": [
      "/images/products/terra-striped-brown-1.jpg",
      "/images/products/terra-striped-brown-2.jpg",
      "/images/products/terra-striped-brown-3.jpg",
      "/images/products/terra-striped-brown-4.jpg"
    ],
    "colors": [
      {
        "name": "Natural Cream",
        "hex": "#EBE5D8"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-046-38",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "38 (S)",
        "sku": "SHIRT-046-38-NAT",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-046-39",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "39 (M)",
        "sku": "SHIRT-046-39-NAT",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-046-40",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "40 (M)",
        "sku": "SHIRT-046-40-NAT",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-046-42",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "42 (L)",
        "sku": "SHIRT-046-42-NAT",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-046-44",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-046-44-NAT",
        "inStock": true,
        "stockCount": 20
      },
      {
        "id": "var-046-46",
        "color": {
          "name": "Natural Cream",
          "hex": "#EBE5D8"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-046-46-NAT",
        "inStock": true,
        "stockCount": 20
      }
    ],
    "fit": "Slim",
    "fabric": "Cotton Poplin",
    "collar": "Spread Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.6,
    "reviewCount": 339,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": true
  },
  {
    "id": "shirt-047",
    "slug": "emerald-green-botanical-print-shirt",
    "name": "Emerald Green Botanical Print Shirt",
    "tagline": "Premium Denim tailored in Regular fit",
    "description": "Crafted with high-grade Denim, this shirt features a clean Button-Down Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4099,
    "compareAtPrice": 4899,
    "discountPercent": 16,
    "images": [
      "/images/products/natural-linen-cream-1.jpg",
      "/images/products/natural-linen-cream-2.jpg",
      "/images/products/natural-linen-cream-3.jpg",
      "/images/products/natural-linen-cream-4.jpg"
    ],
    "colors": [
      {
        "name": "Terra Cotta",
        "hex": "#8B4513"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-047-38",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "38 (S)",
        "sku": "SHIRT-047-38-TER",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-047-39",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "39 (M)",
        "sku": "SHIRT-047-39-TER",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-047-40",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "40 (M)",
        "sku": "SHIRT-047-40-TER",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-047-42",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "42 (L)",
        "sku": "SHIRT-047-42-TER",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-047-44",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-047-44-TER",
        "inStock": true,
        "stockCount": 23
      },
      {
        "id": "var-047-46",
        "color": {
          "name": "Terra Cotta",
          "hex": "#8B4513"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-047-46-TER",
        "inStock": true,
        "stockCount": 23
      }
    ],
    "fit": "Regular",
    "fabric": "Denim",
    "collar": "Button-Down Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Checked",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.7,
    "reviewCount": 346,
    "isFeatured": false,
    "isNewArrival": true,
    "isDeal": false
  },
  {
    "id": "shirt-048",
    "slug": "charcoal-poplin-urban-fit-shirt",
    "name": "Charcoal Poplin Urban Fit Shirt",
    "tagline": "Premium Linen Blend tailored in Relaxed fit",
    "description": "Crafted with high-grade Linen Blend, this shirt features a clean Mandarin Collar and effortless relaxed fit. Built for elevated daily styling and unmatched comfort.",
    "price": 4499,
    "compareAtPrice": 5299,
    "discountPercent": 15,
    "images": [
      "/images/products/egyptian-linen-ivory-1.jpg",
      "/images/products/egyptian-linen-ivory-2.jpg",
      "/images/products/egyptian-linen-ivory-3.jpg",
      "/images/products/egyptian-linen-ivory-4.jpg"
    ],
    "colors": [
      {
        "name": "Midnight Navy",
        "hex": "#1B263B"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-048-38",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "38 (S)",
        "sku": "SHIRT-048-38-MID",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-048-39",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "39 (M)",
        "sku": "SHIRT-048-39-MID",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-048-40",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "40 (M)",
        "sku": "SHIRT-048-40-MID",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-048-42",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "42 (L)",
        "sku": "SHIRT-048-42-MID",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-048-44",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-048-44-MID",
        "inStock": true,
        "stockCount": 26
      },
      {
        "id": "var-048-46",
        "color": {
          "name": "Midnight Navy",
          "hex": "#1B263B"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-048-46-MID",
        "inStock": true,
        "stockCount": 26
      }
    ],
    "fit": "Relaxed",
    "fabric": "Linen Blend",
    "collar": "Mandarin Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Textured",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.8,
    "reviewCount": 353,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  },
  {
    "id": "shirt-049",
    "slug": "pure-normandy-cream-linen-shirt",
    "name": "Pure Normandy Cream Linen Shirt",
    "tagline": "Premium 100% Egyptian Cotton tailored in Slim fit",
    "description": "Crafted with high-grade 100% Egyptian Cotton, this shirt features a clean Cuban Collar and effortless slim fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2499,
    "compareAtPrice": 3299,
    "discountPercent": 24,
    "images": [
      "/images/products/artisan-mandala-brown-1.jpg",
      "/images/products/artisan-mandala-brown-2.jpg",
      "/images/products/artisan-mandala-brown-3.jpg"
    ],
    "colors": [
      {
        "name": "Artisan Brown",
        "hex": "#5C3A21"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-049-38",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "38 (S)",
        "sku": "SHIRT-049-38-ART",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-049-39",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "39 (M)",
        "sku": "SHIRT-049-39-ART",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-049-40",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "40 (M)",
        "sku": "SHIRT-049-40-ART",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-049-42",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "42 (L)",
        "sku": "SHIRT-049-42-ART",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-049-44",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-049-44-ART",
        "inStock": true,
        "stockCount": 29
      },
      {
        "id": "var-049-46",
        "color": {
          "name": "Artisan Brown",
          "hex": "#5C3A21"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-049-46-ART",
        "inStock": true,
        "stockCount": 29
      }
    ],
    "fit": "Slim",
    "fabric": "100% Egyptian Cotton",
    "collar": "Cuban Collar",
    "sleeve": "Full Sleeve",
    "pattern": "Solid",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.9,
    "reviewCount": 360,
    "isFeatured": true,
    "isNewArrival": true,
    "isDeal": true
  },
  {
    "id": "shirt-050",
    "slug": "terra-striped-utility-workshirt",
    "name": "Terra Striped Utility Workshirt",
    "tagline": "Premium Pure Linen tailored in Regular fit",
    "description": "Crafted with high-grade Pure Linen, this shirt features a clean Cutaway Collar and effortless regular fit. Built for elevated daily styling and unmatched comfort.",
    "price": 2899,
    "compareAtPrice": 3699,
    "discountPercent": 22,
    "images": [
      "/images/products/forest-floral-green-1.jpg",
      "/images/products/forest-floral-green-2.jpg",
      "/images/products/forest-floral-green-3.jpg",
      "/images/products/forest-floral-green-4.jpg"
    ],
    "colors": [
      {
        "name": "Forest Green",
        "hex": "#2D4A3E"
      }
    ],
    "sizes": [
      "38 (S)",
      "39 (M)",
      "40 (M)",
      "42 (L)",
      "44 (XL)",
      "46 (XXL)"
    ],
    "variants": [
      {
        "id": "var-050-38",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "38 (S)",
        "sku": "SHIRT-050-38-FOR",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-050-39",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "39 (M)",
        "sku": "SHIRT-050-39-FOR",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-050-40",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "40 (M)",
        "sku": "SHIRT-050-40-FOR",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-050-42",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "42 (L)",
        "sku": "SHIRT-050-42-FOR",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-050-44",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "44 (XL)",
        "sku": "SHIRT-050-44-FOR",
        "inStock": true,
        "stockCount": 32
      },
      {
        "id": "var-050-46",
        "color": {
          "name": "Forest Green",
          "hex": "#2D4A3E"
        },
        "size": "46 (XXL)",
        "sku": "SHIRT-050-46-FOR",
        "inStock": true,
        "stockCount": 32
      }
    ],
    "fit": "Regular",
    "fabric": "Pure Linen",
    "collar": "Cutaway Collar",
    "sleeve": "Half Sleeve",
    "pattern": "Striped",
    "careInstructions": [
      "Machine wash cold inside out",
      "Warm iron while damp",
      "Do not bleach"
    ],
    "rating": 4.3,
    "reviewCount": 367,
    "isFeatured": false,
    "isNewArrival": false,
    "isDeal": false
  }
];
