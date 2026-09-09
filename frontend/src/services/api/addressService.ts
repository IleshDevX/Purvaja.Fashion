import { apiClient, unwrapApiData } from './client.js';

export interface UserAddress {
  id: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface AddressInput {
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export const addressService = {
  async list(): Promise<UserAddress[]> {
    const response = await apiClient.get('/addresses');
    const data = unwrapApiData<UserAddress[] | { items: UserAddress[] }>(response.data);
    return Array.isArray(data) ? data : data.items || [];
  },

  async create(input: AddressInput): Promise<UserAddress> {
    const response = await apiClient.post('/addresses', input);
    return unwrapApiData<UserAddress>(response.data);
  },

  async update(addressId: string, input: Partial<AddressInput>): Promise<UserAddress> {
    const response = await apiClient.patch(`/addresses/${encodeURIComponent(addressId)}`, input);
    return unwrapApiData<UserAddress>(response.data);
  },

  async delete(addressId: string): Promise<void> {
    const response = await apiClient.delete(`/addresses/${encodeURIComponent(addressId)}`);
    unwrapApiData(response.data);
  },
};
