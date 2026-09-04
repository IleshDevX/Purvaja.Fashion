import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductReview } from '../../../services/api/contracts.js';
import type { ProductListParams } from '../../../services/api/contracts.js';
import { productService } from '../services/productService.js';

export function useProductsQuery(params: ProductListParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.list(params),
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

export function useCreateProductReview(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (review: Pick<ProductReview, 'rating' | 'title' | 'comment'>) =>
      productService.createReview(productId!, review),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] }),
  });
}
