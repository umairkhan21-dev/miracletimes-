type PaginationProps = {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
};

export function Pagination({ page, pageCount, onPage }: PaginationProps) {
  if (pageCount <= 1) return null;

  const items: Array<number | "gap"> = [];
  for (let number = 1; number <= pageCount; number += 1) {
    const edge = number === 1 || number === pageCount;
    const near = Math.abs(number - page) <= 1;
    if (edge || near) {
      items.push(number);
    } else if (items[items.length - 1] !== "gap") {
      items.push("gap");
    }
  }

  return (
    <nav className="pagination" aria-label="पृष्ठ">
      <button
        type="button"
        className="page-btn"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        पिछला
      </button>
      <ol>
        {items.map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} className="page-gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className="page-btn"
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPage(item)}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ol>
      <button
        type="button"
        className="page-btn"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
      >
        अगला
      </button>
    </nav>
  );
}
