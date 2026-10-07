import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://backend.dpsara777.com/api';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/markets/global/game-rates`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch game rates: ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    // Return sensible fallback rates if backend is momentarily unreachable
    return NextResponse.json([
      { bet_type: 'single_ank', rate: 10 },
      { bet_type: 'jodi', rate: 100 },
      { bet_type: 'single_patti', rate: 160 },
      { bet_type: 'double_patti', rate: 320 },
      { bet_type: 'triple_patti', rate: 1000 },
      { bet_type: 'red_bracket', rate: 100 },
      { bet_type: 'half_sangam', rate: 1000 },
      { bet_type: 'full_sangam', rate: 10000 },
    ]);
  }
}
