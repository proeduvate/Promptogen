/**
 * Centralized API client for communicating with PromptGen FastAPI backend.
 * Defaults to relative '/api/v1' for unified Vercel deployment and local Vite proxy.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim())
  ? import.meta.env.VITE_API_BASE_URL.trim()
  : "/api/v1";

export function getAuthToken() {
  try {
    return localStorage.getItem("promptogen_auth_token") || null;
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("promptogen_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  try {
    if (token) localStorage.setItem("promptogen_auth_token", token);
    if (user) localStorage.setItem("promptogen_user", JSON.stringify(user));
  } catch (e) {
    console.warn("Could not save auth session to localStorage:", e);
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem("promptogen_auth_token");
    localStorage.removeItem("promptogen_user");
  } catch (e) {
    console.warn("Could not clear auth session from localStorage:", e);
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorDetail = `Request failed with status ${res.status}`;
      try {
        const errorJson = await res.json();
        if (Array.isArray(errorJson.detail)) {
          errorDetail = errorJson.detail
            .map((item) => {
              if (typeof item === "string") return item;
              const field = item.loc ? item.loc.filter((l) => l !== "body").join(".") : "";
              return field ? `${field}: ${item.msg}` : (item.msg || JSON.stringify(item));
            })
            .join("; ");
        } else if (typeof errorJson.detail === "string") {
          errorDetail = errorJson.detail;
        } else if (errorJson.message) {
          errorDetail = errorJson.message;
        }
      } catch {
        // Fallback to generic status error if body is not JSON
      }
      const err = new Error(errorDetail);
      err.status = res.status;
      throw err;
    }

    if (res.status === 204) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.warn(`[API Error] ${options.method || "GET"} ${path}:`, error.message);
    throw error;
  }
}

// ── Content & Metadata ────────────────────────────────────────────────────────
export async function fetchContentMeta() {
  return request("/content/meta");
}

export async function fetchWizardSchema() {
  return request("/content/wizard-schema");
}

// ── Pipeline & LLM Prompt Generation ──────────────────────────────────────────
export const GEMINI_FREE_TIER_MODELS = [
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    provider: "Google Gemini",
    description: "Ultra lightweight, active free tier, low-latency reasoning",
    recommended: true,
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    provider: "Google Gemini",
    description: "Balanced high performance and reasoning",
  },
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    provider: "Google Gemini",
    description: "Latest architecture with advanced analytical capabilities",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite",
    provider: "Google Gemini",
    description: "High throughput classification model",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
    provider: "Google Gemini",
    description: "State-of-the-art coding and complex architectural analysis",
  },
];

export async function fetchGeminiModels() {
  try {
    const data = await request("/pipeline/models");
    if (data && Array.isArray(data.models) && data.models.length > 0) {
      return data.models;
    }
  } catch (err) {
    console.warn("Could not fetch models from backend, using fallback free tier list:", err.message);
  }
  return GEMINI_FREE_TIER_MODELS;
}

export async function startPipeline(query, options = {}) {
  const payload = {
    query,
    model: options.model || "gemini-3.5-flash-lite",
    provider: options.provider || "gemini",
  };
  if (options.apiKey) {
    payload.api_key = options.apiKey;
  }
  if (options.attachment) {
    payload.attachment = options.attachment;
  }
  return request("/pipeline/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function continuePipeline(threadId, answers, options = {}) {
  const payload = {
    thread_id: threadId,
    answers,
  };
  if (options.model) payload.model = options.model;
  if (options.apiKey) payload.api_key = options.apiKey;

  return request("/pipeline/continue", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function followUpPipeline(threadId, message, options = {}) {
  const payload = {
    thread_id: threadId,
    message,
  };
  if (options.model) payload.model = options.model;
  if (options.apiKey) payload.api_key = options.apiKey;
  if (options.currentPrompt) payload.current_prompt = options.currentPrompt;
  if (options.currentSections) payload.current_sections = options.currentSections;
  if (options.historySummary) payload.history_summary = options.historySummary;

  return request("/pipeline/followup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function assessPrompt(promptText) {
  return request("/assess", {
    method: "POST",
    body: JSON.stringify({ prompt: promptText }),
  });
}

// ── Library & Saved Prompts ───────────────────────────────────────────────────
export async function fetchLibraryFolders() {
  return request("/library/folders");
}

export async function fetchLibraryFilters() {
  return request("/library/filters");
}

export async function fetchLibraryPrompts({
  tab = "all",
  folder = "all",
  model = "all",
  tag = "all",
  createdBy = "all",
  search = "",
  page = 1,
  pageSize = 10,
} = {}) {
  const params = new URLSearchParams();
  if (tab) params.set("tab", tab);
  if (folder) params.set("folder", folder);
  if (model) params.set("model", model);
  if (tag) params.set("tag", tag);
  if (createdBy) params.set("created_by", createdBy);
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("page_size", String(pageSize));

  return request(`/library/prompts?${params.toString()}`);
}

export async function getLibraryPrompt(promptId) {
  return request(`/library/prompts/${promptId}`);
}

export async function saveLibraryPrompt(payload) {
  return request("/library/prompts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function toggleFavoritePrompt(promptId) {
  return request(`/library/prompts/${promptId}/favorite`, {
    method: "PATCH",
  });
}

export async function deleteLibraryPrompt(promptId) {
  return request(`/library/prompts/${promptId}`, {
    method: "DELETE",
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export async function fetchAnalytics(days = 7) {
  return request(`/analytics?days=${days}`);
}

// ── Authentication & Rate Limiting ───────────────────────────────────────────
export async function registerWithEmail(name, email, password) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  if (data?.token && data?.user) {
    setAuthSession(data.token, data.user);
  }
  return data;
}

export async function loginWithEmail(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data?.token && data?.user) {
    setAuthSession(data.token, data.user);
  }
  return data;
}

export async function loginWithGoogle(payload) {
  const data = await request("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (data?.token && data?.user) {
    setAuthSession(data.token, data.user);
  }
  return data;
}

export async function fetchCurrentUser() {
  return request("/auth/me");
}

export async function fetchRateLimitStatus() {
  return request("/auth/rate-limit-status");
}

export async function logoutUser() {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {
    // Ignore backend logout error
  } finally {
    clearAuthSession();
  }
}

export async function resetRateLimit() {
  return request("/auth/reset-rate-limit", { method: "POST" });
}

