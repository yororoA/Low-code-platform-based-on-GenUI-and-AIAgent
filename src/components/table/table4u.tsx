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
import * as z from "zod"

const tableHeader = z.object({
  description: z.string(),
  className: z.string().optional(),
});

interface Table4uProps {
  captionTitle: string,
  headers: z.infer<typeof tableHeader>[],
}

export function Table4u(props: Table4uProps) {
  return (
    <Table>
      <TableCaption>{props.captionTitle}</TableCaption>
      <TableHeader>
        <TableRow>
          {props.headers.map((header, index) => (
            <TableHead key={index} className={header.className}>{header.description}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
    </Table>


    // <Table>
    //   <TableBody>
    //     <TableRow>
    //       <TableCell className="font-medium">INV001</TableCell>
    //       <TableCell>Paid</TableCell>
    //       <TableCell>Credit Card</TableCell>
    //       <TableCell className="text-right">$250.00</TableCell>
    //     </TableRow>
    //   </TableBody>
    // </Table>
  );
}