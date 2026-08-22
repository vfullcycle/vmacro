// Auto-links plain http(s) URLs in post bodies (FR-FRIEND-2 amendment) — deliberately does
// NOT render markdown/HTML from the text itself (no dangerouslySetInnerHTML anywhere), so
// there's no injection surface. Link preview (fetching OG tags) is a separate, larger
// feature — see BL-19.
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("http://") || part.startsWith("https://") ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
