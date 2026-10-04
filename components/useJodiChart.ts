"use client";

import { useState, useEffect } from "react";

function fetcher(url: string) {
  return fetch(url).then((res) => res.json());
}

export function useJodiChart() {
  const [jodiData, setJodiData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mobile/results-history?limit=100");
        const data = await res.json();
        // For regular markets, combined_result has format "open_ank-close_jodi-close_ank"
        // We'll extract the jodi (2-digit) from the combined result
        const regularResults = (data?.data || [])
          .filter(
            (r: any) =>
              r.market_type !== "starline" && r.market_type !== "jackpot"
          );
        const extracted = regularResults.map((r: any) => {
          const combined = r.combined_result || "";
          // Format is typically "XXX-XX-XXX" where the middle XX is the jodi
          const parts = combined.split("-");
          const jodi = parts.length >= 2 ? parts[1]?.substring(0, 2) || "" : "";
          return {
            market_name: r.market_name,
            open_result: r.open_result,
            close_result: r.close_result,
            combined_result: combined,
            jodi: jodi,
            result_date: r.result_date,
          };
        });
        setJodiData(extracted);
        setIsLoading(false);
      } catch (e) {
        setIsError(true);
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { jodiData, isLoading, isError };
}