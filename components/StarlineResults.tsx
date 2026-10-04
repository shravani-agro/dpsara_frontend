"use client";

import { useStarlineResults } from "./useStarlineResults";
import { Card, Table, TableBody, TableHeader, TableRow, TableCell, Badge } from "@/components/ui";

export function StarlineResults() {
  const { results, isLoading, isError } = useStarlineResults();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <span className="text-slate-600">Loading starline results...</span>
      </div>
    );
  }

  if (isError || !results || results.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-600">
        <span>No starline results found.</span>
      </div>
    );
  }

  return (
    <Card title={`Starline Results (${results.length})`} className="p-0">
      <Table className="w-full text-sm text-slate-500">
        <TableHeader>
          <TableRow>
            <TableCell className="py-3 text-left text-xs font-medium text-slate-500">#</TableCell>
            <TableCell className="py-3 text-left">Market</TableCell>
            <TableCell className="py-3 text-left">Result</TableCell>
            <TableCell className="py-3 text-center">Time</TableCell>
            <TableCell className="py-3 text-right">Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r, idx) => (
            <TableRow key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
              <TableCell className="py-3 text-slate-600 pl-3">{idx + 1}</TableCell>
              <TableCell className="py-3 font-medium text-slate-900">{r.market_name}</TableCell>
              <TableCell className="py-3 text-slate-600">{r.result || "—"}</TableCell>
              <TableCell className="py-3 text-center text-xs">
                {r.market_time || "—"}
              </TableCell>
              <TableCell className="py-3 text-right">
                <Button size="sm" variant="outline" onClick={() => window.alert(`Result ${r.id}`)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {results.length === 0 && <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
              No results yet
            </TableCell>
          </TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}