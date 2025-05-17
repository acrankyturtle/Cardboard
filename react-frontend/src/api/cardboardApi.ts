const apiUrl = "http://localhost:7000/";

export const getApiUrl = (key: string) => {
  return new URL(key, apiUrl).href;
};

export const fetcher = async (key: string) => {
  const url = getApiUrl(key);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
};
