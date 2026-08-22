import { api } from './api';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  profileImage: string | null;
  role: string;
  createdAt: string;
}

export interface UpdateProfileData {
  fullName?: string;
  phone?: string | null;
  bio?: string | null;
  profileImage?: string | null;
}

interface Envelope {
  success: boolean;
  data?: unknown;
  message?: string;
}

function unwrap<T>(response: Envelope): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Request failed');
  }
  return response.data as T;
}

export async function getUserProfile(): Promise<UserProfile> {
  const { data } = await api.get<Envelope>('/users/profile');
  return unwrap<UserProfile>(data);
}

export async function updateUserProfile(profileData: UpdateProfileData): Promise<UserProfile> {
  const { data } = await api.patch<Envelope>('/users/profile', profileData);
  return unwrap<UserProfile>(data);
}
