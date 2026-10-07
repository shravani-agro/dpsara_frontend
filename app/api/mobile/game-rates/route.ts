import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://backend.dpsara777.com/api';

const LABEL_MAP: Record<string, string> = {
  single_ank: 'Single Digit',
  single_digit: 'Single Digit',
  jodi: 'Jodi Digit',
  single_patti: 'Single Pana',
  single_pana: 'Single Pana',
  double_patti: 'Double Pana',
  double_pana: 'Double Pana',
  triple_patti: 'Triple Pana',
  triple_pana: 'Triple Pana',
  red_bracket: 'Red Bracket',
  half_sangam: 'Half Sangam',
  full_sangam: 'Full Sangam',
};

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/markets/global/game-rates`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch game rates: ${res.status}`);
    }
    const data = await res.json();
    const rates = Array.isArray(data)
      ? data.map((item: any) => ({
          name: LABEL_MAP[item.bet_type] || item.bet_type,
          price: item.rate,
          rate: `₹1 Ka ₹${item.rate}`,
          type: item.bet_type,
        }))
      : [];
    return NextResponse.json({ status: 'success', rates });
  } catch (error) {
    const fallback = [
      { name: 'Single Digit', price: 10, rate: '₹1 Ka ₹10', type: 'single_ank' },
      { name: 'Jodi Digit', price: 100, rate: '₹1 Ka ₹100', type: 'jodi' },
      { name: 'Single Pana', price: 160, rate: '₹1 Ka ₹160', type: 'single_patti' },
      { name: 'Double Pana', price: 320, rate: '₹1 Ka ₹320', type: 'double_patti' },
      { name: 'Triple Pana', price: 1000, rate: '₹1 Ka ₹1000', type: 'triple_patti' },
      { name: 'Half Sangam', price: 1000, rate: '₹1 Ka ₹1000', type: 'half_sangam' },
      { name: 'Full Sangam', price: 10000, rate: '₹1 Ka ₹10000', type: 'full_sangam' },
    ];
    return NextResponse.json({ status: 'success', rates: fallback });
  }
}
