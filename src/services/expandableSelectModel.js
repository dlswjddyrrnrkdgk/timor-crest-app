export function getVisibleExpandableItems({ expanded, getItemId = (item) => item.id, items = [], selectedId = "" }) {
  if (expanded) return items;

  const selectedItem = items.find((item) => getItemId(item) === selectedId) || null;
  return [selectedItem || items[0]].filter(Boolean);
}
