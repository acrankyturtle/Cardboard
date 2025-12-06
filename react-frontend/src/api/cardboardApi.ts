const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:7000/";

export const getAssetUrl = (key: string) => {
  return new URL(key, apiUrl).href;
};

export const getApiUrl = (key: string) => {
  const normalizedUrl = `${apiUrl.replace(/\/+$/, "")}/api/${key.replace(/^\/+|\/+$/g, "")}`;
  try {
    return new URL(normalizedUrl).href;
  } catch {
    throw new Error("Invalid URL generated");
  }
};

export const fetcher = async (key: string) => {
  const url = getApiUrl(key);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
};
