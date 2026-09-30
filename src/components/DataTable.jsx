import { isValidElement, useMemo, useState } from 'react'
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { EmptyState } from './Feedback'

function cellText(cell) {
  if (cell == null) return ''
  if (typeof cell === 'string' || typeof cell === 'number') return String(cell)
  if (Array.isArray(cell)) return cell.map(cellText).join(' ')
  if (isValidElement(cell)) return cellText(cell.props.children)
  return ''
}

export function DataTable({ title, columns, rows }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const isNumeric = (column) => /amount|balance|paid|total|available|unavailable|quantity|released|returned|missing|damaged|charges|rate|income/i.test(column)

  const processedRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = normalizedQuery ? rows.filter((row) => row.some((cell) => cellText(cell).toLowerCase().includes(normalizedQuery))) : rows
    if (!sort) return filtered
    return [...filtered].sort((a, b) => cellText(a[sort.index]).localeCompare(cellText(b[sort.index]), undefined, { numeric: true }) * sort.direction)
  }, [query, rows, sort])

  const pageCount = Math.max(1, Math.ceil(processedRows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleRows = processedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function toggleSort(index) {
    setSort((current) => current?.index === index ? { index, direction: current.direction * -1 } : { index, direction: 1 })
    setPage(1)
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
      {(title || rows.length > 5) && <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">{title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}{rows.length > 5 && <label className="relative block w-full sm:max-w-60"><span className="sr-only">Search table</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" /><input className="min-h-9 w-full rounded-lg border bg-card py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-subtle-foreground focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary-border/45" placeholder="Search records…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label>}</div>}
      {visibleRows.length ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-170 border-collapse text-sm">
              <thead><tr className="bg-secondary">{columns.map((column, index) => <th className={`border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${isNumeric(column) ? 'text-right' : 'text-left'}`} key={column}><button className={`inline-flex items-center gap-1.5 hover:text-foreground ${isNumeric(column) ? 'ml-auto' : ''}`} type="button" onClick={() => toggleSort(index)}>{column}<ArrowUpDown className="size-3.5" aria-hidden="true" /></button></th>)}</tr></thead>
              <tbody>{visibleRows.map((row, index) => <tr className="transition-colors hover:bg-muted" key={index}>{row.map((cell, cellIndex) => <td className={`border-b px-4 py-3 text-foreground ${isNumeric(columns[cellIndex]) ? 'text-right tabular-nums' : 'text-left'}`} key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">{visibleRows.map((row, rowIndex) => <dl className="grid gap-2 p-4" key={rowIndex}>{row.map((cell, cellIndex) => <div className="grid grid-cols-[minmax(7rem,0.75fr)_minmax(0,1.25fr)] items-start gap-3" key={cellIndex}><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{columns[cellIndex]}</dt><dd className={`min-w-0 text-sm text-foreground ${isNumeric(columns[cellIndex]) ? 'text-right tabular-nums' : 'text-left'}`}>{cell}</dd></div>)}</dl>)}</div>
          {processedRows.length > 10 && <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, processedRows.length)} of {processedRows.length}</span><div className="flex items-center gap-2"><label className="flex items-center gap-2">Rows<select className="rounded-md border bg-card px-2 py-1.5" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option>10</option><option>25</option><option>50</option></select></label><button className="grid size-8 place-items-center rounded-md border hover:bg-muted disabled:opacity-40" disabled={currentPage === 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></button><span className="tabular-nums">{currentPage} / {pageCount}</span><button className="grid size-8 place-items-center rounded-md border hover:bg-muted disabled:opacity-40" disabled={currentPage === pageCount} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><ChevronRight className="size-4" /></button></div></div>}
        </>
      ) : <div className="p-5"><EmptyState title={query ? 'No matching records' : 'No records found'} description={query ? 'Try a different search term.' : 'Records will appear here once they are added.'} /></div>}
    </section>
  )
}
