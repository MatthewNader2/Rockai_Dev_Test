import i18n from "../i18n";

export const customFetch = (url, options = {}) => {
  const lang = i18n.language || "en";

  const headers = {
    ...options.headers,
    "Accept-Language": lang,
  };

  return fetch(url, { ...options, headers });
};
