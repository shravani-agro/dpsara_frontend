"use client";

import { useJodiChart } from "./useJodiChart";
import { Card, Table, TableBody, TableHeader, TableRow, TableCell, Badge, Button } from "@/components/ui";

export function JodiChart() {
  const { jodiData, isLoading, isError } = useJodiChart();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <span className="text-slate-600">Loading jodi chart...</span>
      </div>
    );
  }

  if (isError || !jodiData || jodiData.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-600">
        <span>No jodi data found.</span>
      </div>
    );
  }

  return (
    <Card title={`Jodi Chart (${jodiData.length} results)`} className="p-0">
      <Table className="w-full text-sm text-slate-500">
        <TableHeader>
          <TableRow>
            <TableCell className="py-3 text-left text-xs font-medium text-slate-500">#</TableCell>
            <TableCell className="py-3 text-left">Market</TableCell>
            <TableCell className="py-3 text-left">Jodi</TableCell>
            <TableCell className="py-3 text-left">Result Date</TableCell>
            <TableCell className="py-3 text-right">Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jodiData.map((r, idx) => (
            <TableRow key={r.market_name} className="border-b border-slate-100 hover:bg-slate-50">
              <TableCell className="py-3 text-slate-600 pl-3">{idx + 1}</TableCell>
              <TableCell className="py-3 font-medium text-slate-900">{r.market_name}</TableCell>
              <TableCell className="py-3 text-slate-600">{r.jodi || "—"}</TableCell>
              <TableCell className="py-3 text-center text-xs">{r.result_date || "—"}</TableCell>
              <TableCell className="py-3 text-right">
                <Button size="sm" variant="outline" onClick={() => window.alert(`Jodi ${r.market_name}`)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {jodiData.length === 0 && <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
              No jodi data yet
            </TableCell>
          </TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}