import type { ReactNode } from 'react'
import { EmptyState } from './primitives'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
  primary?: boolean
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  emptyMessage = 'Nothing to show yet.',
}: {
  caption: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyMessage?: string
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  const align = (a?: 'left' | 'right') => (a === 'right' ? 'text-right' : 'text-left')

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-cyan-200 bg-cyan-50/70">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-5 py-3 text-xs font-semibold tracking-wide text-cyan-800 uppercase ${align(col.align)}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-cyan-100 transition-colors duration-200 last:border-0 hover:bg-cyan-50/70"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-5 py-3.5 align-middle text-cyan-900 ${align(col.align)}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-cyan-100 md:hidden">
        {rows.map((row) => {
          const primary = columns.find((c) => c.primary) ?? columns[0]
          const rest = columns.filter((c) => c !== primary)
          return (
            <li key={rowKey(row)} className="p-4">
              <div className="font-semibold text-cyan-950">{primary.render(row)}</div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {rest.map((col) => (
                  <div key={col.key} className={col.align === 'right' ? 'text-right' : ''}>
                    <dt className="text-xs font-medium tracking-wide text-cyan-800 uppercase">
                      {col.header}
                    </dt>
                    <dd className="text-sm text-cyan-900">{col.render(row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          )
        })}
      </ul>
    </>
  )
}
