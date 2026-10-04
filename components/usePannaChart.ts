"use client";

import { useState, useEffect } from "react";

function fetcher(url: string) {
  return fetch(url).then((res) => res.json());
}

export function usePannaChart() {
  const [pannaData, setPannaData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mobile/results-history?limit=100");
        const data = await res.json();
        // For regular markets, combined_result has format "open_ank-close_ank-open_panna-close_panna"
        // We'll extract the panna (3-digit) from the combined result
        const regularResults = (data?.data || [])
          .filter(
            (r: any) =>
              r.market_type !== "starline" && r.market_type !== "jackpot"
          );
        const extracted = regularResults.map((r: any) => {
          const combined = r.combined_result || "";
          // Format is typically "XXX-XX-XXX" where middle XX is the jodi/ank and outer are pannas
          // We'll extract the first 3-digit group as open panna and last as close panna
          const parts = combined.split("-");
          const openPanna = parts[0]?.substring(0, 3) || "";
          const closePanna = parts[parts.length - 1]?.substring(0, 3) || "";
          return {
            market_name: r.market_name,
            open_result: r.open_result,
            close_result: r.close_result,
            combined_result: combined,
            open_panna: openPanna,
            close_panna: closePanna,
            result_date: r.result_date,
          };
        });
        setPannaData(extracted);
        setIsLoading(false);
      } catch (e) {
        setIsError(true);
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { pannaData, isLoading, isError };
}