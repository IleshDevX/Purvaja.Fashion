import { Shirt } from '../types/product.js';
import { DEVELOPMENT_SHIRTS } from '../data/shirts.js';
import { ProductFormValues } from '../../admin/schemas/productFormSchema.js';
import { InventoryItem } from '../../admin/types/admin.js';

export const LOW_STOCK_THRESHOLD = 10;

// Shared catalog adapter. Production builds should replace this module with API queries.
const INITIAL_PRODUCTS = JSON.parse(JSON.stringify(DEVELOPMENT_SHIRTS)) as Shirt[];
let productsState: Shirt[] = JSON.parse(JSON.stringify(INITIAL_PRODUCTS)) as Shirt[];

function syncPublicCatalog() {
  // Vitest keeps modules alive across files; avoid mutating imported fixtures there.
  if (import.meta.env.MODE !== 'test' && !import.meta.env.VITEST) {
    DEVELOPMENT_SHIRTS.splice(0, DEVELOPMENT_SHIRTS.length, ...productsState);
  }
}

function calculateInventoryFromProducts(shirts: Shirt[]): InventoryItem[] {
  const items: InventoryItem[] = [];
  shirts.forEach(shirt => {
    shirt.variants.forEach(variant => {
      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      const stock = variant.stockCount ?? 0;
      if (stock <= 0) {
        status = 'out_of_stock';
      } else if (stock <= LOW_STOCK_THRESHOLD) {
        status = 'low_stock';
      }

      items.push({
        id: variant.id,
        shirtId: shirt.id,
        shirtName: shirt.name,
        slug: shirt.slug,
        sku: variant.sku,
        color: variant.color.name,
        size: variant.size,
        stock,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        status,
        lastUpdated: new Date().toISOString().split('T')[0] ?? '2026-08-21',
      });
    });
  });
  return items;
}

export const developmentProductStore = {
  /**
   * Retrieves products with optional filtering and sorting.
   */
  async getProducts(options?: {
    search?: string;
    filter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'new_arrivals' | 'deals';
    sortBy?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'rating_desc' | 'stock_asc';
  }): Promise<Shirt[]> {
    await new Promise(resolve => setTimeout(resolve, 80));
    let list = [...productsState];

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.fabric && p.fabric.toLowerCase().includes(q)) ||
          (p.fit && p.fit.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.variants.some(v => v.sku.toLowerCase().includes(q)),
      );
    }

    if (options?.filter && options.filter !== 'all') {
      if (options.filter === 'in_stock') {
        list = list.filter(p => p.variants.some(v => (v.stockCount ?? 0) > 0));
      } else if (options.filter === 'low_stock') {
        list = list.filter(p =>
          p.variants.some(
            v => (v.stockCount ?? 0) > 0 && (v.stockCount ?? 0) <= LOW_STOCK_THRESHOLD,
          ),
        );
      } else if (options.filter === 'out_of_stock') {
        list = list.filter(p => p.variants.every(v => (v.stockCount ?? 0) <= 0));
      } else if (options.filter === 'new_arrivals') {
        list = list.filter(p => p.isNewArrival);
      } else if (options.filter === 'deals') {
        list = list.filter(p => p.isDeal);
      }
    }

    if (options?.sortBy === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (options?.sortBy === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (options?.sortBy === 'rating_desc') {
      list.sort((a, b) => (b.rating ?? 5) - (a.rating ?? 5));
    } else if (options?.sortBy === 'stock_asc') {
      list.sort(
        (a, b) =>
          a.variants.reduce((acc, v) => acc + (v.stockCount ?? 0), 0) -
          b.variants.reduce((acc, v) => acc + (v.stockCount ?? 0), 0),
      );
    } else if (options?.sortBy === 'oldest') {
      list.sort((a, b) => a.id.localeCompare(b.id));
    }

    return list;
  },

  /**
   * Retrieves single product by ID or slug.
   */
  async getProductById(id: string): Promise<Shirt | null> {
    await new Promise(resolve => setTimeout(resolve, 60));
    const target = id.toLowerCase();
    const product = productsState.find(
      p => p.id.toLowerCase() === target || p.slug.toLowerCase() === target,
    );
    return product ? { ...product } : null;
  },

  /**
   * Synchronous getter for instant renders where needed.
   */
  getShirtSync(id: string): Shirt | undefined {
    const target = id.toLowerCase();
    return productsState.find(
      p => p.id.toLowerCase() === target || p.slug.toLowerCase() === target,
    );
  },

  /**
   * Creates a new shirt in the shared development catalog.
   */
  async createProduct(
    values: ProductFormValues,
  ): Promise<{ success: boolean; product?: Shirt; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 150));

    if (productsState.some(p => p.slug.toLowerCase() === values.slug.toLowerCase())) {
      return { success: false, message: 'A shirt with this URL slug already exists.' };
    }

    const newShirt: Shirt = {
      id: `shirt-${Date.now().toString(36)}`,
      name: values.name,
      slug: values.slug,
      tagline: values.tagline,
      description: values.description,
      price: values.price,
      compareAtPrice: values.compareAtPrice,
      fit: values.fit,
      fabric: values.fabric,
      collar: values.collar,
      sleeve: values.sleeve,
      pattern: values.pattern,
      isNewArrival: values.isNewArrival,
      isFeatured: values.isFeatured,
      isDeal: values.isDeal,
      rating: 5.0,
      reviewCount: 0,
      images: values.images,
      colors: Array.from(new Set(values.variants.map(v => JSON.stringify(v.color)))).map(c =>
        JSON.parse(c),
      ),
      sizes: Array.from(new Set(values.variants.map(v => v.size))),
      variants: values.variants,
      careInstructions: [
        'Machine wash cold with like colors',
        'Gentle cycle with mild detergent',
        'Warm iron while damp',
      ],
    };

    productsState.unshift(newShirt);
    syncPublicCatalog();
    return { success: true, product: newShirt, message: 'Shirt created successfully.' };
  },

  /**
   * Updates an existing shirt in the shared development catalog.
   */
  async updateProduct(
    id: string,
    values: ProductFormValues,
  ): Promise<{ success: boolean; product?: Shirt; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const index = productsState.findIndex(
      p => p.id.toLowerCase() === id.toLowerCase() || p.slug.toLowerCase() === id.toLowerCase(),
    );
    if (index === -1) {
      return { success: false, message: 'Product not found.' };
    }

    const existing = productsState[index]!;
    const updated: Shirt = {
      ...existing,
      name: values.name,
      slug: values.slug,
      tagline: values.tagline,
      description: values.description,
      price: values.price,
      compareAtPrice: values.compareAtPrice,
      fit: values.fit,
      fabric: values.fabric,
      collar: values.collar,
      sleeve: values.sleeve,
      pattern: values.pattern,
      isNewArrival: values.isNewArrival,
      isFeatured: values.isFeatured,
      isDeal: values.isDeal,
      images: values.images,
      colors: Array.from(new Set(values.variants.map(v => JSON.stringify(v.color)))).map(c =>
        JSON.parse(c),
      ),
      sizes: Array.from(new Set(values.variants.map(v => v.size))),
      variants: values.variants,
    };

    productsState[index] = updated;
    syncPublicCatalog();
    return { success: true, product: updated, message: 'Shirt updated successfully.' };
  },

  /**
   * Deletes a shirt from catalog.
   */
  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const index = productsState.findIndex(
      p => p.id.toLowerCase() === id.toLowerCase() || p.slug.toLowerCase() === id.toLowerCase(),
    );
    if (index === -1) {
      return { success: false, message: 'Product not found.' };
    }
    const removed = productsState.splice(index, 1)[0];
    syncPublicCatalog();
    return {
      success: true,
      message: `"${removed?.name}" was removed from the catalog.`,
    };
  },

  /**
   * Retrieves inventory matrix for all variants.
   */
  async getInventory(): Promise<InventoryItem[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return calculateInventoryFromProducts(productsState);
  },

  /**
   * Updates stock level for a specific variant.
   */
  async updateStock(
    variantId: string,
    newStock: number,
  ): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 120));
    let found = false;

    for (const shirt of productsState) {
      for (const variant of shirt.variants) {
        if (variant.id === variantId) {
          variant.stockCount = Math.max(0, newStock);
          variant.inStock = variant.stockCount > 0;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      return { success: false, message: 'Variant not found.' };
    }

    syncPublicCatalog();

    return { success: true, message: `Stock level updated to ${newStock} units.` };
  },

  /**
   * Resets product catalog to initial defaults.
   */
  resetProducts(): void {
    productsState = JSON.parse(JSON.stringify(INITIAL_PRODUCTS)) as Shirt[];
    syncPublicCatalog();
  },
};
