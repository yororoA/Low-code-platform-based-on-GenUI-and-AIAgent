import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import * as React from "react"

/** 表头列配置。 */
interface Table4uHeader {
  description: React.ReactNode
  className?: string
}

/** 单元格配置。 */
interface Table4uCell {
  content: React.ReactNode
  className?: string
}

/** 行配置。 */
interface Table4uRow {
  key?: string
  cells: Table4uCell[]
  className?: string
}

/** Table4u 组件参数。 */
interface Table4uProps {
  captionTitle?: React.ReactNode
  headers: Table4uHeader[]
  rows?: Table4uRow[]
  footer?: Table4uRow
  tableProps?: React.ComponentProps<typeof Table>
}

export function Table4u(props: Table4uProps) {
  return (
    <Table {...props.tableProps}>
      {props.captionTitle && <TableCaption>{props.captionTitle}</TableCaption>}
      <TableHeader>
        <TableRow>
          {props.headers.map((header, index) => (
            <TableHead key={`${String(header.description)}-${index}`} className={header.className}>
              {header.description}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      {props.rows && props.rows.length > 0 && (
        <TableBody>
          {props.rows.map((row, rowIndex) => (
            <TableRow key={row.key ?? `row-${rowIndex}`} className={row.className}>
              {row.cells.map((cell, cellIndex) => (
                <TableCell key={`cell-${rowIndex}-${cellIndex}`} className={cell.className}>
                  {cell.content}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      )}
      {props.footer && (
        <TableFooter>
          <TableRow className={props.footer.className}>
            {props.footer.cells.map((cell, cellIndex) => (
              <TableCell key={`footer-cell-${cellIndex}`} className={cell.className}>
                {cell.content}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}