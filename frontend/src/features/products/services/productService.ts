import { apiClient, unwrapApiData } from '../../../services/api/client.js';
import { PageResult, ProductDetailResult, ProductListParams, ProductReview } from '../../../services/api/contracts.js';
import { toSearchParams } from '../../../services/api/query.js';
import type { Shirt } from '../types/product.js';

export interface ProductListResult {
  items: Shirt[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const productService = {
  async list(params: ProductListParams = {}): Promise<Shirt[]> {
    const res = await this.listPaginated(params);
    return res.items;
  },

  async listPaginated(params: ProductListParams = {}): Promise<ProductListResult> {
    const query = toSearchParams(params);
    const response = await apiClient.get(`/products${query ? `?${query}` : ''}`);
    return unwrapApiData<ProductListResult>(response.data);
  },

  async getBySlugOrId(id: string): Promise<ProductDetailResult> {
    const response = await apiClient.get(`/products/${encodeURIComponent(id)}`);
    return unwrapApiData<ProductDetailResult>(response.data);
  },

  async getReviews(productId: string): Promise<ProductReview[]> {
    const response = await apiClient.get(`/products/${encodeURIComponent(productId)}/reviews`);
    return unwrapApiData<PageResult<ProductReview>>(response.data).items;
  },

  async createReview(productId: string, review: Pick<ProductReview, 'rating' | 'title' | 'comment'>): Promise<ProductReview> {
    const response = await apiClient.post(`/products/${encodeURIComponent(productId)}/reviews`, review);
    return unwrapApiData<ProductReview>(response.data);
  },
};
