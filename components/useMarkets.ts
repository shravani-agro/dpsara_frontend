"use client";

import { useState, useEffect } from "react";

function fetcher(url: string) {
  return fetch(url).then((res) => res.json());
}

export function useMarkets() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mobile/homepage");
        const data = await res.json();
        // Normalize: data could be {status, data} or just the list
        const markets = (data?.data || data || []).filter(
          (m: any) => m.is_active !== false
        );
        setMarkets(
          markets.sort((a: any, b: any) => (a.sequence_number || 0) - (b.sequence_number || 0))
        );
        setIsLoading(false);
      } catch (e) {
        setIsError(true);
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { markets, isLoading, isError };
}