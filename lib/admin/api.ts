import { getApiBaseUrl, resolveMediaUrl, ApiError, type ApiMeta } from "@/lib/api";
import type {
  AdminArticle,
  AdminArticleListItem,
  AdminCategory,
  AdminMedia,
  AdminUser,
  ArticleStatus,
  ArticleWritePayload,
} from "@/lib/admin/types";

type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: ApiMeta;
};

type ApiFailure = {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
};

/** In-memory only — never written to localStorage/sessionStorage. */
let memoryBearerToken: string | null = null;

export function setAdminBearerToken(token: string | null) {
  memoryBearerToken = token;
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as ApiSuccess<unknown> | ApiFailure;
  } catch {
    return null;
  }
}

async function adminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; meta?: ApiMeta }> {
  const url = `${getApiBaseUrl()}/api${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  if (memoryBearerToken) {
    headers.Authorization = `Bearer ${memoryBearerToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "include",
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Unable to reach the news service. Please try again later.",
      0,
      "NETWORK",
    );
  }

  const body = await parseJson(response);
  if (!response.ok || !body || body.success !== true) {
    const failure = body && "error" in body ? body.error : undefined;
    throw new ApiError(
      failure?.message || "Request failed.",
      response.status,
      failure?.code,
    );
  }

  return { data: body.data as T, meta: body.meta };
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function adminLogin(email: string, password: string) {
  const { data } = await adminRequest<{ token: string; user: AdminUser }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  // Cookie is primary; keep bearer in memory only for same-tab resilience.
  setAdminBearerToken(data.token || null);
  return data;
}

export async function adminLogout() {
  try {
    await adminRequest<{ loggedOut: boolean }>("/auth/logout", {
      method: "POST",
    });
  } finally {
    setAdminBearerToken(null);
  }
}

export async function adminMe() {
  const { data } = await adminRequest<{ user: AdminUser }>("/auth/me");
  return data.user;
}

export async function fetchAdminArticles(params: {
  page?: number;
  limit?: number;
  status?: ArticleStatus | "";
  language?: "hi" | "en";
  q?: string;
} = {}) {
  const { data, meta } = await adminRequest<AdminArticleListItem[]>(
    `/articles/admin${buildQuery({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      status: params.status || undefined,
      language: params.language ?? "hi",
      q: params.q,
    })}`,
  );
  return {
    articles: Array.isArray(data) ? data : [],
    meta,
  };
}

export async function fetchAdminArticle(id: number) {
  const { data } = await adminRequest<AdminArticle>(`/articles/admin/${id}`);
  return data;
}

export async function createAdminArticle(payload: ArticleWritePayload) {
  const { data } = await adminRequest<AdminArticle>("/articles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updateAdminArticle(
  id: number,
  payload: Partial<ArticleWritePayload>,
) {
  const { data } = await adminRequest<AdminArticle>(`/articles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function deleteAdminArticle(id: number) {
  await adminRequest<{ deleted: boolean }>(`/articles/${id}`, {
    method: "DELETE",
  });
}

export async function publishAdminArticle(id: number, publishedAt?: string) {
  const { data } = await adminRequest<AdminArticle>(`/articles/${id}/publish`, {
    method: "POST",
    body: JSON.stringify(publishedAt ? { publishedAt } : {}),
  });
  return data;
}

export async function scheduleAdminArticle(id: number, scheduledAt: string) {
  const { data } = await adminRequest<AdminArticle>(`/articles/${id}/schedule`, {
    method: "POST",
    body: JSON.stringify({ scheduledAt }),
  });
  return data;
}

export async function archiveAdminArticle(id: number) {
  const { data } = await adminRequest<AdminArticle>(`/articles/${id}/archive`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return data;
}

export async function fetchAdminCategories() {
  const { data } = await adminRequest<AdminCategory[]>("/categories/admin");
  return Array.isArray(data) ? data : [];
}

export async function createAdminCategory(payload: {
  slug: string;
  isActive?: boolean;
  displayOrder?: number;
  translations: Array<{
    languageCode: "hi" | "en";
    name: string;
    description: string;
  }>;
}) {
  const { data } = await adminRequest<AdminCategory>("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updateAdminCategory(
  id: number,
  payload: Partial<{
    slug: string;
    isActive: boolean;
    displayOrder: number;
    translations: Array<{
      languageCode: "hi" | "en";
      name: string;
      description: string;
    }>;
  }>,
) {
  const { data } = await adminRequest<AdminCategory>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function fetchAdminMedia(params: { page?: number; limit?: number } = {}) {
  const { data, meta } = await adminRequest<AdminMedia[]>(
    `/media${buildQuery({
      page: params.page ?? 1,
      limit: params.limit ?? 24,
    })}`,
  );
  return {
    media: (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      fileUrl: resolveMediaUrl(item.fileUrl),
    })),
    meta,
  };
}

export async function uploadAdminMedia(file: File) {
  const body = new FormData();
  body.append("file", file);
  const { data } = await adminRequest<AdminMedia>("/media/upload", {
    method: "POST",
    body,
  });
  return {
    ...data,
    fileUrl: resolveMediaUrl(data.fileUrl),
  };
}

export async function registerAdminMediaFromUrl(url: string) {
  const { data } = await adminRequest<AdminMedia>("/media/from-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return {
    ...data,
    fileUrl: resolveMediaUrl(data.fileUrl),
  };
}

export async function deleteAdminMedia(id: number) {
  await adminRequest<{ deleted: boolean }>(`/media/${id}`, {
    method: "DELETE",
  });
}

export async function fetchArticleStatusCounts() {
  const statuses: Array<ArticleStatus | ""> = [
    "",
    "published",
    "draft",
    "scheduled",
    "archived",
  ];
  const results = await Promise.all(
    statuses.map(async (status) => {
      const { meta } = await fetchAdminArticles({
        page: 1,
        limit: 1,
        status,
        language: "hi",
      });
      return [status || "total", meta?.total ?? 0] as const;
    }),
  );
  return Object.fromEntries(results) as Record<string, number>;
}
