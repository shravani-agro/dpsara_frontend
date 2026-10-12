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
  red_bracket: 'Red Brackets',
  half_sangam: 'Half Sangam A',
  half_sangam_a: 'Half Sangam A',
  half_sangam_b: 'Half Sangam B',
  full_sangam: 'Full Sangam Digits',
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
          multiplier: `${item.rate}x`,
          type: item.bet_type,
        }))
      : [];
    return NextResponse.json({ status: 'success', rates });
  } catch (error) {
    const fallback = [
      { name: 'Single Digit', price: 9.5, rate: '₹1 Ka ₹9.5', multiplier: '9.5x', type: 'single_ank' },
      { name: 'Jodi Digit', price: 95, rate: '₹1 Ka ₹95', multiplier: '95x', type: 'jodi' },
      { name: 'Single Pana', price: 150, rate: '₹1 Ka ₹150', multiplier: '150x', type: 'single_patti' },
      { name: 'Double Pana', price: 300, rate: '₹1 Ka ₹300', multiplier: '300x', type: 'double_patti' },
      { name: 'Triple Pana', price: 900, rate: '₹1 Ka ₹900', multiplier: '900x', type: 'triple_patti' },
      { name: 'Red Brackets', price: 95, rate: '₹1 Ka ₹95', multiplier: '95x', type: 'red_bracket' },
      { name: 'Half Sangam A', price: 1000, rate: '₹1 Ka ₹1000', multiplier: '1000x', type: 'half_sangam_a' },
      { name: 'Half Sangam B', price: 1000, rate: '₹1 Ka ₹1000', multiplier: '1000x', type: 'half_sangam_b' },
      { name: 'Full Sangam Digits', price: 10000, rate: '₹1 Ka ₹10000', multiplier: '10000x', type: 'full_sangam' },
    ];
    return NextResponse.json({ status: 'success', rates: fallback });
  }
}
