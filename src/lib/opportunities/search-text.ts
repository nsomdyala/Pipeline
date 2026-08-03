/** Denormalised searchable text — kept separate to avoid circular imports. */
export function buildSearchText(item: {
  title: string;
  description: string;
  buyer: string;
  refNo: string;
  externalId?: string | null;
  province?: string | null;
  category?: string | null;
}): string {
  return [
    item.title,
    item.description,
    item.buyer,
    item.refNo,
    item.externalId ?? "",
    item.province ?? "",
    item.category ?? "",
  ]
    .join("\n")
    .toLowerCase();
}
