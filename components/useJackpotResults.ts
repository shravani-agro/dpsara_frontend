"use client";

import { useState, useEffect } from "react";

function fetcher(url: string) {
  return fetch(url).then((res) => res.json());
}

export function useJackpotResults() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Use the results-history endpoint and filter for jackpot market type
        const res = await fetch("/api/mobile/results-history?limit=50");
        const data = await res.json();
        const jackpotResults = (data?.data || [])
          .filter((r: any) => r.market_type === "jackpot" || r.name?.toLowerCase().includes("jackpot"));
        setResults(jackpotResults);
        setIsLoading(false);
      } catch (e) {
        setIsError(true);
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { results, isLoading, isError };
}