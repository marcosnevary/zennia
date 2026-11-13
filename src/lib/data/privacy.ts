/** The privacy notice is a static page in English and in Portuguese, the language of most of its readers. */
export function privacyNoticeUrl(
  language = navigator.language,
): "privacy.html" | "privacidade.html" {
  return language.toLowerCase().startsWith("pt")
    ? "privacidade.html"
    : "privacy.html";
}
