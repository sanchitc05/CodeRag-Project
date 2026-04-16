import client from './client';
import { User } from '../types';

export async function register(
  email: string,
  password: string
): Promise<User> {
  const response = await client.post<User>('/auth/register', {
    email,
    password,
  });
  return response.data;
}

export async function login(
  email: string,
  password: string
): Promise<User> {
  const body = new URLSearchParams({
    username: email,
    password,
  });

  const response = await client.post<User>('/auth/login', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
}
