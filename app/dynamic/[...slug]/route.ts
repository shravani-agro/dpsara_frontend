import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://backend.dpsara777.com/api';

// Format Date to DD/MM/YYYY
function formatDmy(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Check if Jodi is a Red (Double or Cut) number in Matka
function isRedJodi(jodi: string): boolean {
  if (!jodi || jodi.length !== 2 || !/^\d\d$/.test(jodi)) return false;
  const d1 = parseInt(jodi[0], 10);
  const d2 = parseInt(jodi[1], 10);
  // Double digits (00, 11, 22, 33, 44, 55, 66, 77, 88, 99)
  if (d1 === d2) return true;
  // Cut digits (family pair: difference of 5: 05, 50, 16, 61, 27, 72, 38, 83, 49, 94)
  if (Math.abs(d1 - d2) === 5) return true;
  return false;
}

export async function GET(request: Request, { params }: { params: { slug: string[] } }) {
  try {
    let filePath = params.slug ? params.slug.join('/') : '';
    if (filePath === '' || filePath === 'index.html') {
      filePath = 'index.html';
    } else if (!filePath.endsWith('.html')) {
      return new NextResponse('Not found', { status: 404 });
    }

    // User requirement: Remove starline and jackpot charts
    if (filePath.includes('starline') || filePath.includes('jackpot')) {
      return new NextResponse('Not found', { status: 404 });
    }

    const templatesDir = path.join(process.cwd(), 'templates');
    const fullPath = path.join(templatesDir, filePath);

    if (!fs.existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const htmlFile = fs.readFileSync(fullPath, 'utf8');
    let html = htmlFile;

    // 1. Fetch system settings for contact numbers
    try {
      const settingsRes = await fetch(`${API_BASE}/mobile/settings`, { next: { revalidate: 60 } });
      if (settingsRes.ok) {
        const settingsJson = await settingsRes.json();
        const settingsData = settingsJson.data || {};
        const whatsappNumber = settingsData.admin_whatsapp_number || "+91 8377 999 777";
        const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

        html = html.replace(/\+91 8377 999 777/g, whatsappNumber);
        html = html.replace(/918377999777/g, cleanWhatsapp);
      }
    } catch (e) {
      console.error("Failed to fetch settings for templates", e);
    }

    const $ = cheerio.load(html);

    // Strip out Turbopack & Next.js hydration scripts
    $('script').each((i, el) => {
      const src = $(el).attr('src');
      const content = $(el).html() || '';
      if (src && src.includes('turbopack')) {
        $(el).remove();
      }
      if (content.includes('self.__next_f') || content.includes('__next_s')) {
        $(el).remove();
      }
    });

    // Remove starline and jackpot chart links from all pages
    $('a[href*="starline-pana"]').remove();
    $('a[href*="jackpot-jodi"]').remove();
    $('a[href*="jackpot-chart"]').remove();
    $('a[href*="starline_daily"]').remove();
    $('a[href*="jackpot_daily"]').remove();
    $('a:contains("Starline Charts"), a:contains("Jackpot Charts")').closest('li').remove();

    // 2. Dynamic Charts Rendering (from rsboss_db)
    if (filePath.includes('_jodi') || filePath.includes('_pana')) {
      const marketSlug = filePath.replace('.html', '').split('_')[0];
      const isJodi = filePath.includes('_jodi');

      // Fetch historical data from rsboss_db via backend
      let history: { result_date: string; result: string }[] = [];
      try {
        const chartRes = await fetch(
          `${API_BASE}/mobile/chart-data/${encodeURIComponent(marketSlug)}`,
          { next: { revalidate: 60 } }
        );
        if (chartRes.ok) {
          const chartJson = await chartRes.json();
          if (chartJson.status === 'success' && Array.isArray(chartJson.data)) {
            history = chartJson.data;
          }
        }
      } catch (err) {
        console.error(`Failed to fetch chart data for ${marketSlug}:`, err);
      }

      // Map date -> result
      const resultsByDate: Record<string, string> = {};
      history.forEach((item) => {
        if (item.result_date && item.result) {
          resultsByDate[item.result_date] = item.result.trim();
        }
      });

      const dates = Object.keys(resultsByDate).sort();

      let rowsHtml = '';
      if (dates.length > 0) {
        // Detect table header columns (e.g. Date, MON, TUE, WED, THU, FRI, SAT, SUN)
        const thTexts = $('table thead tr th')
          .toArray()
          .map((el) => $(el).text().trim().toUpperCase());
        const hasDateCol = thTexts.some((t) => t.includes('DATE'));

        const dayCols: { name: string; dayIndex: number }[] = [];
        if (thTexts.includes('MON')) dayCols.push({ name: 'MON', dayIndex: 0 });
        if (thTexts.includes('TUE')) dayCols.push({ name: 'TUE', dayIndex: 1 });
        if (thTexts.includes('WED')) dayCols.push({ name: 'WED', dayIndex: 2 });
        if (thTexts.includes('THU')) dayCols.push({ name: 'THU', dayIndex: 3 });
        if (thTexts.includes('FRI')) dayCols.push({ name: 'FRI', dayIndex: 4 });
        if (thTexts.includes('SAT')) dayCols.push({ name: 'SAT', dayIndex: 5 });
        if (thTexts.includes('SUN')) dayCols.push({ name: 'SUN', dayIndex: 6 });

        // If no day headers found, default to Mon-Sat
        if (dayCols.length === 0) {
          dayCols.push(
            { name: 'MON', dayIndex: 0 },
            { name: 'TUE', dayIndex: 1 },
            { name: 'WED', dayIndex: 2 },
            { name: 'THU', dayIndex: 3 },
            { name: 'FRI', dayIndex: 4 },
            { name: 'SAT', dayIndex: 5 }
          );
        }

        // Calculate start Monday
        const [sy, sm, sd] = dates[0].split('-').map(Number);
        const firstDate = new Date(sy, sm - 1, sd);
        const dayOfWeek = firstDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const currentMonday = new Date(firstDate);
        currentMonday.setDate(firstDate.getDate() + mondayOffset);

        // Calculate end date
        const [ey, em, ed] = dates[dates.length - 1].split('-').map(Number);
        const lastDate = new Date(ey, em - 1, ed);

        while (currentMonday <= lastDate) {
          const weekStart = new Date(currentMonday);
          const weekEnd = new Date(currentMonday);
          weekEnd.setDate(currentMonday.getDate() + 6);

          let rowCells = '';

          for (const col of dayCols) {
            const dayDate = new Date(currentMonday);
            dayDate.setDate(currentMonday.getDate() + col.dayIndex);

            const y = dayDate.getFullYear();
            const m = String(dayDate.getMonth() + 1).padStart(2, '0');
            const d = String(dayDate.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${d}`;

            const rawRes = resultsByDate[dateKey] || '';
            let openPana = '***';
            let jodi = '**';
            let closePana = '***';

            if (
              rawRes &&
              !rawRes.toLowerCase().includes('holiday') &&
              !rawRes.toLowerCase().includes('hollyday') &&
              rawRes !== '***-**-***'
            ) {
              const parts = rawRes.split('-');
              if (parts.length === 3) {
                openPana = parts[0].trim() || '***';
                jodi = parts[1].trim() || '**';
                closePana = parts[2].trim() || '***';
              } else if (parts.length === 1 && parts[0].length === 2) {
                jodi = parts[0];
              } else if (parts.length === 1 && parts[0].length >= 8) {
                openPana = parts[0].slice(0, 3);
                jodi = parts[0].slice(3, 5);
                closePana = parts[0].slice(5, 8);
              }
            }

            const isRed = isRedJodi(jodi);
            const textColorClass = isRed
              ? 'text-danger'
              : jodi !== '**'
              ? 'text-black dark:text-white'
              : 'text-dark/40 dark:text-dark/40';

            if (isJodi) {
              rowCells += `<td class="p-2 max-sm:p-1 border-b border-primary/25 border-r border-primary/25 last:border-r-0 text-[18px] max-sm:text-[14px] font-bold align-middle ${textColorClass}">${jodi}</td>`;
            } else {
              if (jodi !== '**' || openPana !== '***' || closePana !== '***') {
                rowCells += `<td class="p-1.5 max-sm:p-1 border-b border-primary/25 border-r border-primary/25 last:border-r-0 align-middle text-center text-black">
                  <div class="flex h-full w-full items-center justify-center">
                    <div class="inline-flex items-center justify-center gap-x-1 max-sm:gap-x-px leading-none">
                      <span class="inline-block align-middle text-center font-bold text-[11px] max-sm:text-[8px] leading-[1.15] max-sm:leading-[1.1] w-[1ch] break-all">${openPana}</span>
                      <span class="font-display font-bold text-[16px] max-sm:text-[11px] leading-none px-0.5 max-sm:px-px ${textColorClass}">${jodi}</span>
                      <span class="inline-block align-middle text-center font-bold text-[11px] max-sm:text-[8px] leading-[1.15] max-sm:leading-[1.1] w-[1ch] break-all">${closePana}</span>
                    </div>
                  </div>
                </td>`;
              } else {
                rowCells += `<td class="p-1.5 max-sm:p-1 border-b border-primary/25 border-r border-primary/25 last:border-r-0 text-dark align-middle text-center text-[12px] max-sm:text-[9px]">**</td>`;
              }
            }
          }

          const dateColHtml = hasDateCol
            ? `<td class="p-2 max-sm:p-1 border-b border-primary/25 border-r border-primary/25 last:border-r-0 align-middle text-[12px] max-sm:text-[9px] font-semibold leading-[1.3] text-dark whitespace-normal tracking-tight">
                 <span class="block">${formatDmy(weekStart)}</span><span class="block">to</span><span class="block">${formatDmy(weekEnd)}</span>
               </td>`
            : '';

          rowsHtml += `<tr>${dateColHtml}${rowCells}</tr>`;
          currentMonday.setDate(currentMonday.getDate() + 7);
        }
      }

      if (rowsHtml) {
        $('table tbody').first().empty().append(rowsHtml);
      } else {
        $('table tbody')
          .first()
          .empty()
          .append(
            `<tr><td colspan="8" class="py-8 text-center text-dark">No records found for ${marketSlug}</td></tr>`
          );
      }
    }

    // 3. Dynamic Homepage (index.html)
    if (filePath === 'index.html') {
      // Fetch dynamic Game Rates and Markets for Server-Side Rendering
      try {
        const [ratesRes, marketsRes] = await Promise.all([
          fetch(`${API_BASE}/markets/global/game-rates`, { next: { revalidate: 30 } }),
          fetch(`${API_BASE}/markets`, { next: { revalidate: 15 } }),
        ]);

        // A. Inject Dynamic Game Rates
        if (ratesRes.ok) {
          const gameRates: { bet_type: string; rate: number }[] = await ratesRes.json();
          const rateMap: Record<string, number> = {};
          gameRates.forEach((r) => {
            const k = r.bet_type.toLowerCase().replace(/[^a-z0-9]/g, '');
            rateMap[k] = r.rate;
          });

          const getRate = (name: string): string | null => {
            const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (clean.includes('singledigit') || clean.includes('singleank')) {
              return String(rateMap['singleank'] ?? rateMap['singledigit'] ?? 9.5);
            }
            if (clean.includes('jodidigit') || clean.includes('jodi')) {
              return String(rateMap['jodi'] ?? rateMap['jodidigit'] ?? 95);
            }
            if (clean.includes('singlepana') || clean.includes('singlepanna')) {
              return String(rateMap['singlepatti'] ?? rateMap['singlepana'] ?? 150);
            }
            if (clean.includes('doublepana') || clean.includes('doublepanna')) {
              return String(rateMap['doublepatti'] ?? rateMap['doublepana'] ?? 300);
            }
            if (clean.includes('triplepana') || clean.includes('triplepanna')) {
              return String(rateMap['triplepatti'] ?? rateMap['triplepana'] ?? 900);
            }
            if (clean.includes('redbracket') || clean.includes('redbracket')) {
              return String(rateMap['redbracket'] ?? 95);
            }
            if (clean.includes('halfsangam')) {
              return String(rateMap['halfsangam'] ?? 1000);
            }
            if (clean.includes('fullsangam')) {
              return String(rateMap['fullsangam'] ?? 10000);
            }
            return null;
          };

          // Update Mobile Game Rates Table
          $('table tbody tr').each((_, tr) => {
            const labelTd = $(tr).find('td').first();
            const label = labelTd.text().trim();
            const rateVal = getRate(label);
            if (rateVal) {
              const valSpan = $(tr).find('td').last().find('span').last();
              if (valSpan.length > 0) {
                valSpan.text(rateVal);
              }
            }
          });

          // Update Desktop Game Rates Cards
          $('h5').each((_, h5) => {
            const label = $(h5).text().trim();
            const rateVal = getRate(label);
            if (rateVal) {
              const cardSpan = $(h5).closest('div').find('span').find('span').last();
              if (cardSpan.length > 0) {
                cardSpan.text(rateVal);
              }
            }
          });
        }

        // B. Inject Live Market Results and Statuses
        if (marketsRes.ok) {
          const markets: any[] = await marketsRes.json();
          markets.forEach((m) => {
            if (!m.name) return;
            const slug = m.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');

            const card = $(`#game-card-jodi-${slug}`);
            if (card.length > 0) {
              // Update Result
              const resultSpan = card.find('span.text-\\[20px\\], span.text-\\[18px\\]').first();
              if (resultSpan.length > 0 && m.result) {
                resultSpan.text(m.result);
              }

              // Update Status
              const statusSpan = card.find('span.text-\\[12px\\], span.text-\\[11px\\]').first();
              if (statusSpan.length > 0 && m.status) {
                statusSpan.text(m.status);
                if (m.status.toLowerCase().includes('close')) {
                  statusSpan.removeClass('text-successGreen').addClass('text-danger');
                } else {
                  statusSpan.removeClass('text-danger').addClass('text-successGreen');
                }
              }
            }
          });
        }
      } catch (err) {
        console.error('SSR Live Data Fetch Error:', err);
      }

      // Inject client-side polling script
      $('body').append('<script src="/dynamic-homepage.js"></script>');
    }

    return new NextResponse($.html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Dynamic Render Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
