"use client";

import { usePannaChart } from "./usePannaChart";
import { Card, Table, TableBody, TableHeader, TableRow, TableCell, Badge } from "@/components/ui";

export function PannaChart() {
  const { pannaData, isLoading, isError } = usePannaChart();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <span className="text-slate-600">Loading panna chart...</span>
      </div>
    );
  }

  if (isError || !pannaData || pannaData.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-600">
        <span>No panna data found.</span>
      </div>
    );
  }

  return (
    <Card title={`Panna Chart (${pannaData.length} results)`} className="p-0">
      <Table className="w-full text-sm text-slate-500">
        <TableHeader>
          <TableRow>
            <TableCell className="py-3 text-left text-xs font-medium text-slate-500">#</TableCell>
            <TableCell className="py-3 text-left">Market</TableCell>
            <TableCell className="py-3 text-left">Open Panna</TableCell>
            <TableCell className="py-3 text-left">Close Panna</TableCell>
            <TableCell className="py-3 text-left">Result Date</TableCell>
            <TableCell className="py-3 text-right">Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pannaData.map((r, idx) => (
            <TableRow key={r.market_name} className="border-b border-slate-100 hover:bg-slate-50">
              <TableCell className="py-3 text-slate-600 pl-3">{idx + 1}</TableCell>
              <TableCell className="py-3 font-medium text-slate-900">{r.market_name}</TableCell>
              <TableCell className="py-3 text-slate-600">{r.open_panna || "—"}</TableCell>
              <TableCell className="py-3 text-slate-600">{r.close_panna || "—"}</TableCell>
              <TableCell className="py-3 text-center text-xs">{r.result_date || "—"}</TableCell>
              <TableCell className="py-3 text-right">
                <Button size="sm" variant="outline" onClick={() => window.alert(`Panna ${r.market_name}`)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {pannaData.length === 0 && <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-400">
              No panna data yet
            </TableCell>
          </TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}