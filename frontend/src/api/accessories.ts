import { api } from './client';
import { Accessory } from '../types';

export async function getAccessories(): Promise<Accessory[]> {
  const { data } = await api.get<Accessory[]>('/accessories');
  return data;
}

export async function createAccessory(name: string): Promise<Accessory> {
  const { data } = await api.post<Accessory>('/accessories', { name });
  return data;
}

export async function deleteAccessory(id: string): Promise<void> {
  await api.delete(`/accessories/${id}`);
}
