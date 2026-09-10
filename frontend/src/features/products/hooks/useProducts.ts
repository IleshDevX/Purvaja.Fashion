import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductReview } from '../../../services/api/contracts.js';
import type { ProductListParams } from '../../../services/api/contracts.js';
import { productService } from '../services/productService.js';

export function useProductsQuery(params: ProductListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function useProductsPaginatedQuery(params: ProductListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['products-paginated', params],
    queryFn: () => productService.listPaginated(params),
    enabled: options?.enabled ?? true,
  });
}

export function useProductQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getBySlugOrId(id!),
    enabled: Boolean(id),
  });
}

export function useProductReviewsQuery(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => productService.getReviews(productId!),
    enabled: Boolean(productId),
  });
}

export function useProductReviewsPaginatedQuery(productId: string | undefined, page = 1, limit = 5) {
  return useQuery({
    queryKey: ['product-reviews-paginated', productId, page, limit],
    queryFn: () => productService.getReviewsPaginated(productId!, page, limit),
    enabled: Boolean(productId),
  });
}

export function useCreateProductReview(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (review: Pick<ProductReview, 'rating' | 'title' | 'comment'>) =>
      productService.createReview(productId!, review),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] }),
  });
}
