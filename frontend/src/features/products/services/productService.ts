import { apiClient, unwrapApiData } from '../../../services/api/client.js';
import { ProductDetailResult, ProductListParams, ProductReview } from '../../../services/api/contracts.js';
import { toSearchParams } from '../../../services/api/query.js';
import type { Shirt } from '../types/product.js';

export const productService = {
  async list(params: ProductListParams = {}): Promise<Shirt[]> {
    const query = toSearchParams(params);
    const response = await apiClient.get(`/products${query ? `?${query}` : ''}`);
    const data = unwrapApiData<Shirt[] | { items: Shirt[] }>(response.data);
    return Array.isArray(data) ? data : data.items;
  },

  async getBySlugOrId(id: string): Promise<ProductDetailResult> {
    const response = await apiClient.get(`/products/${encodeURIComponent(id)}`);
    const data = unwrapApiData<Shirt | ProductDetailResult>(response.data);
    return 'product' in data ? data : { product: data, relatedProducts: [] };
  },

  async getReviews(productId: string): Promise<ProductReview[]> {
    const response = await apiClient.get(`/products/${encodeURIComponent(productId)}/reviews`);
    const data = unwrapApiData<ProductReview[] | { items: ProductReview[] }>(response.data);
    return Array.isArray(data) ? data : data.items;
  },

  async createReview(productId: string, review: Pick<ProductReview, 'rating' | 'title' | 'comment'>): Promise<ProductReview> {
    const response = await apiClient.post(`/products/${encodeURIComponent(productId)}/reviews`, review);
    return unwrapApiData<ProductReview>(response.data);
  },
};
