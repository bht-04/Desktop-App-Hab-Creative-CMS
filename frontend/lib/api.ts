// frontend/lib/api.ts
import { getSession } from "next-auth/react";

export async function getAuthHeaders() {
  const session = await getSession();
  const token = session?.user?.email;

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token hết hạn hoặc không hợp lệ
    const session = await getSession();
    if (!session) {
      window.location.href = "/login";
    }
  }

  return response;
}
