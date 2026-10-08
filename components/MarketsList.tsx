"use client";

import { useMarkets } from "./useMarkets";
import { Card, Table, TableBody, TableHeader, TableRow, TableCell, Badge, Button } from "@/components/ui";

export function MarketsList() {
  const { markets, isLoading, isError } = useMarkets();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <span className="text-slate-600">Loading markets...</span>
      </div>
    );
  }

  if (isError || !markets || markets.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-600">
        <span>No markets found. Please try again.</span>
      </div>
    );
  }

  return (
    <Card title={`${markets.length} Markets`} className="p-0">
      <Table className="w-full text-sm text-slate-500">
        <TableHeader>
          <TableRow>
            <TableCell className="py-3 text-left text-xs font-medium text-slate-500">ID</TableCell>
            <TableCell className="py-3 text-left">Name</TableCell>
            <TableCell className="py-3 text-left">Type</TableCell>
            <TableCell className="py-3 text-right">Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {markets.map((m, idx) => (
            <TableRow key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
              <TableCell className="py-3 text-slate-600 pl-3">{m.id}</TableCell>
              <TableCell className="py-3 font-medium text-slate-900">
                {m.name}{m.holiday_status && <Badge color="amber" className="ml-2">Holiday</Badge>}
              </TableCell>
              <TableCell>
                const marketBadgeColor = m.market_type === "starline" ? "violet" : m.market_type === "jackpot" ? "amber" : "slate";
<Badge color={marketBadgeColor}>
                  {m.market_type}
                </Badge>
              </TableCell>
              <TableCell className="py-3 text-right">
                <Button size="sm" variant="outline" onClick={() => window.alert(`Market ${m.id}`)}>
                  View
                </Button>
                <Button size="sm" variant="danger">Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {markets.length === 0 && <TableRow>
            <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-400">
              No markets yet
            </TableCell>
          </TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}