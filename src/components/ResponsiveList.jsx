import { EmptyState } from './Feedback'

export function ResponsiveList({ items, render, empty }) {
  if (!items.length) return <EmptyState title={empty} description="New records will appear here when they become available." />
  return <div className="grid gap-3">{items.map((item) => <div key={item.id}>{render(item)}</div>)}</div>
}
