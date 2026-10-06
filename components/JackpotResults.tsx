"use client";

import { useJackpotResults } from "./useJackpotResults";
import { Card, Badge, Button } from "@/components/ui";

export function JackpotResults() {
  const { results, isLoading, isError } = useJackpotResults();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <span className="text-slate-600">Loading jackpot results...</span>
      </div>
    );
  }

  if (isError || !results || results.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-600">
        <span>No jackpot results found.</span>
      </div>
    );
  }

  return (
    <Card title={`Jackpot Results (${results.length})`} className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-500">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 text-left text-xs font-medium text-slate-500 pl-3">#</th>
              <th className="py-3 text-left">Market</th>
              <th className="py-3 text-left">Result</th>
              <th className="py-3 text-center">Date</th>
              <th className="py-3 text-right pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 text-slate-600 pl-3">{idx + 1}</td>
                <td className="py-3 font-medium text-slate-900">{r.market_name}</td>
                <td className="py-3 text-slate-600">{r.result || "—"}</td>
                <td className="py-3 text-center text-xs">{r.result_date || "—"}</td>
                <td className="py-3 text-right pr-3">
                  <Button size="sm" variant="outline" onClick={() => window.alert(`Jackpot ${r.id}`)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  No jackpot results yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}