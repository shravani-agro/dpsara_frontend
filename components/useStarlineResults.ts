"use client";

import { useState, useEffect } from "react";

function fetcher(url: string) {
  return fetch(url).then((res) => res.json());
}

export function useStarlineResults() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mobile/starline-winners?limit=50");
        const data = await res.json();
        // data is {status, data: [...]} 
        setResults(data?.data || []);
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