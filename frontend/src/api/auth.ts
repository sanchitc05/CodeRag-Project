import client from './client';
import { AuthResponse } from '../types';

export async function register(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/register', {
    email,
    password,
  });
  return response.data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const body = new URLSearchParams({
    username: email,
    password,
  });

  const response = await client.post<AuthResponse>('/auth/login', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
}

export async function updateProfile(data: {
  fullName?: string;
  username?: string;
}): Promise<any> {
  const response = await client.put('/auth/me', {
    full_name: data.fullName,
    username: data.username,
  });
  return response.data;
}

export async function getMe(): Promise<any> {
  const response = await client.get('/auth/me');
  return response.data;
}
