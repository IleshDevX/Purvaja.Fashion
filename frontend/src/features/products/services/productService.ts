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
    const res = await this.getReviewsPaginated(productId, 1, 100);
    return res.items;
  },

  async getReviewsPaginated(productId: string, page = 1, limit = 10): Promise<PageResult<ProductReview>> {
    const response = await apiClient.get(`/products/${encodeURIComponent(productId)}/reviews?page=${page}&limit=${limit}`);
    return unwrapApiData<PageResult<ProductReview>>(response.data);
  },

  async createReview(productId: string, review: Pick<ProductReview, 'rating' | 'title' | 'comment'>): Promise<ProductReview> {
    const response = await apiClient.post(`/products/${encodeURIComponent(productId)}/reviews`, review);
    return unwrapApiData<ProductReview>(response.data);
  },
};
