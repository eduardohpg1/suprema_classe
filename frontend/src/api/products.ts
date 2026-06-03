import { api, normalizePaginated, BackendPaginated } from './client';
import { Product, PaginatedResponse, Photo, ProductStatus } from '../types';

export interface ProductFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: ProductStatus | '';
}

export interface ProductPayload {
  name: string;
  code: string;
  categoryId: string;
  size: string;
  color: string;
  rentalPrice: number;
  salePrice?: number;
  notes?: string;
  status: ProductStatus;
}

export async function getProducts(
  filters: ProductFilters = {}
): Promise<PaginatedResponse<Product>> {
  const params: Record<string, unknown> = {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 12,
  };
  if (filters.search) params.search = filters.search;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.status) params.status = filters.status;

  const { data } = await api.get<BackendPaginated<Product>>('/products', {
    params,
  });
  return normalizePaginated(data);
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const { data } = await api.post<Product>('/products', payload);
  return data;
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductPayload>
): Promise<Product> {
  const { data } = await api.put<Product>(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

export async function uploadPhotos(
  productId: string,
  files: File[]
): Promise<Photo[]> {
  const form = new FormData();
  files.forEach((file) => form.append('photos', file));
  const { data } = await api.post<Photo[]>(
    `/products/${productId}/photos`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function deletePhoto(
  productId: string,
  photoId: string
): Promise<void> {
  await api.delete(`/products/${productId}/photos/${photoId}`);
}

export async function getCategories(): Promise<{ id: string; name: string }[]> {
  const { data } = await api.get<{ id: string; name: string }[]>('/categories');
  return data;
}
