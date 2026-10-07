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
    let fullPath = path.join(templatesDir, filePath);
    let isVirtualChart = false;

    if (!fs.existsSync(fullPath)) {
      if (filePath.includes('_jodi.html')) {
        fullPath = path.join(templatesDir, 'charts_jodi_time-bazar.html');
        isVirtualChart = true;
      } else if (filePath.includes('_pana.html')) {
        fullPath = path.join(templatesDir, 'charts_pana_kalyan.html');
        isVirtualChart = true;
      } else {
        return new NextResponse('File not found', { status: 404 });
      }
    }

    const htmlFile = fs.readFileSync(fullPath, 'utf8');
    let html = htmlFile;

    // 1. Fetch system settings for contact numbers and regular markets
    let regularMarkets: { id: any; name: string; slug: string; result: string; status: string }[] = [];
    try {
      const [settingsRes, homeRes] = await Promise.all([
        fetch(`${API_BASE}/mobile/settings`, { next: { revalidate: 60 } }),
        fetch(`${API_BASE}/mobile/homepage`, { next: { revalidate: 15 } }),
      ]);

      if (settingsRes.ok) {
        const settingsJson = await settingsRes.json();
        const settingsData = settingsJson.data || {};
        const whatsappNumber = settingsData.admin_whatsapp_number || "+91 8377 999 777";
        const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

        html = html.replace(/\+91 8377 999 777/g, whatsappNumber);
        html = html.replace(/918377999777/g, cleanWhatsapp);
      }

      if (homeRes.ok) {
        const homeJson = await homeRes.json();
        if (homeJson.status === 'success' && Array.isArray(homeJson.data)) {
          regularMarkets = homeJson.data
            .filter((m: any) => {
              const isStarline = m.is_starline === true || m.is_starline === 1 || m.is_starline === '1' || (m.market_type || '').toLowerCase() === 'starline';
              const isJackpot = m.is_jackpot === true || m.is_jackpot === 1 || m.is_jackpot === '1' || (m.market_type || '').toLowerCase() === 'jackpot';
              if (isStarline || isJackpot) return false;
              const mType = (m.market_type || '').toLowerCase();
              return mType === 'regular' || mType === 'main' || mType === '' || !mType;
            })
            .map((m: any) => {
              const name = (m.name || m.market_name || '').trim();
              const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              let statusText = 'Running for open';
              if (m.is_closed === true || m.status?.toLowerCase().includes('close')) {
                statusText = 'Closed';
              }
              return {
                id: m.id,
                name: name,
                slug: slug,
                result: m.result || '***-**-***',
                status: statusText,
              };
            });
        }
      }
    } catch (e) {
      console.error("Failed to fetch initial settings/markets", e);
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
    $('a:contains("Starline Charts"), a:contains("Jackpot Charts"), a:contains("King Starline Charts"), a:contains("King Jackpot Charts")').closest('li').remove();

    // 2. DYNAMIC NAVIGATION DROPDOWNS (Header)
    if (regularMarkets.length > 0) {
      // Update Jodi Charts dropdown
      $('p:contains("Jodi Charts"), p:contains("Jodi charts")').siblings('ul').each((_, ul) => {
        $(ul).empty().append(
          regularMarkets.map(m =>
            `<li class="break-inside-avoid"><a class="block rounded-lg px-2.5 py-1.5 text-[13px] font-semibold uppercase text-black no-underline transition-colors hover:bg-timeBg hover:text-primary" href="/${m.slug}_jodi.html">${m.name.toUpperCase()}</a></li>`
          ).join('')
        );
      });

      // Update Pana Charts dropdown
      $('p:contains("Pana Charts"), p:contains("Pana charts")').siblings('ul').each((_, ul) => {
        $(ul).empty().append(
          regularMarkets.map(m =>
            `<li class="break-inside-avoid"><a class="block rounded-lg px-2.5 py-1.5 text-[13px] font-semibold uppercase text-black no-underline transition-colors hover:bg-timeBg hover:text-primary" href="/${m.slug}_pana.html">${m.name.toUpperCase()}</a></li>`
          ).join('')
        );
      });
    }

    // 3. DYNAMIC FOOTER CHARTS (#footer-charts)
    if (regularMarkets.length > 0) {
      // Footer Jodi Charts
      $('#footer-charts h3:contains("Jodi Charts")').siblings('ul').each((_, ul) => {
        $(ul).empty().append(
          regularMarkets.map(m =>
            `<li class="leading-tight border-b border-[rgba(22,16,14,0.08)]"><a class="block px-3 py-1.5 sm:px-3 sm:py-2 text-center text-[11px] sm:text-[14px] font-semibold text-black transition-colors hover:text-primary scroll-mt-24" href="/${m.slug}_jodi.html" id="footer-chart-jodi-${m.slug}">${m.name.toUpperCase()}</a></li>`
          ).join('')
        );
      });

      // Footer Pana Charts
      $('#footer-charts h3:contains("Pana Charts")').siblings('ul').each((_, ul) => {
        $(ul).empty().append(
          regularMarkets.map(m =>
            `<li class="leading-tight border-b border-[rgba(22,16,14,0.08)]"><a class="block px-3 py-1.5 sm:px-3 sm:py-2 text-center text-[11px] sm:text-[14px] font-semibold text-black transition-colors hover:text-primary scroll-mt-24" href="/${m.slug}_pana.html" id="footer-chart-pana-${m.slug}">${m.name.toUpperCase()}</a></li>`
          ).join('')
        );
      });
    }

    // Remove starline and jackpot sections in footer
    $('#footer-charts h3:contains("Starline Charts"), #footer-charts h3:contains("Jackpot Charts")').closest('div.border').remove();

    // 4. DYNAMIC CHARTS RENDERING (from rsboss_db)
    if (filePath.includes('_jodi') || filePath.includes('_pana')) {
      const marketSlug = filePath.replace('.html', '').split('_')[0];
      const isJodi = filePath.includes('_jodi');

      // Find market display name
      const matchedMarket = regularMarkets.find(m => m.slug === marketSlug);
      const marketDisplayName = matchedMarket ? matchedMarket.name : marketSlug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

      if (isVirtualChart) {
        $('title').text(`${marketDisplayName} ${isJodi ? 'Jodi' : 'Pana'} Chart | DPSara777`);
        $('h1').text(`${marketDisplayName} Chart`);
        $('strong:contains("Chart Records")').text(`${marketDisplayName} ${isJodi ? 'Jodi' : 'Pana'} Chart Records.`);
      }

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

        const [sy, sm, sd] = dates[0].split('-').map(Number);
        const firstDate = new Date(sy, sm - 1, sd);
        const dayOfWeek = firstDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const currentMonday = new Date(firstDate);
        currentMonday.setDate(firstDate.getDate() + mondayOffset);

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
            `<tr><td colspan="8" class="py-8 text-center text-dark font-medium">No historical records available for ${marketDisplayName} yet</td></tr>`
          );
      }
    }

    // 5. DYNAMIC ALL CHARTS PAGE (all-satta-matka-chart.html)
    if (filePath === 'all-satta-matka-chart.html') {
      const chartSection = $('section:has(div[aria-live="polite"])');
      if (chartSection.length > 0) {
        const cardsGrid = `
          <div class="container mx-auto px-4 max-sm:px-3">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
              ${regularMarkets.map(m => `
                <div class="border border-borderColor bg-surfaceBg rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-xl font-extrabold text-black uppercase tracking-tight">${m.name}</h3>
                      <span class="text-xs px-3 py-1 rounded-full font-bold ${m.status && m.status.toLowerCase().includes('close') ? 'bg-danger/10 text-danger' : 'bg-successGreen/10 text-successGreen'}">
                        ${m.status || 'ACTIVE'}
                      </span>
                    </div>
                    <div class="text-center py-4 bg-timeBg rounded-xl mb-6">
                      <span class="text-xs font-semibold text-dark block mb-1 uppercase tracking-wider">Live Result</span>
                      <span class="text-2xl font-black font-display text-primary tracking-widest">${m.result}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <a href="/${m.slug}_jodi.html" class="flex-1 text-center py-3 px-4 bg-gradient-to-b from-gradGoldTop to-gradGoldBottom text-black font-bold text-sm rounded-xl hover:opacity-90 transition-opacity no-underline shadow-sm">
                      Jodi Chart
                    </a>
                    <a href="/${m.slug}_pana.html" class="flex-1 text-center py-3 px-4 border-2 border-primary text-black font-bold text-sm rounded-xl hover:bg-primary/10 transition-colors no-underline">
                      Pana Chart
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        chartSection.html(cardsGrid);
      }

      // Update text in all-satta-matka-chart.html to only mention active added markets
      if (regularMarkets.length > 0) {
        const activeListHtml = `<p class="text-base md:text-lg text-dark leading-relaxed mb-4"><strong>Active Markets:</strong> ${regularMarkets.map(m => `<a href="/${m.slug}_jodi.html" class="text-[#1155cc] underline">${m.name}</a>`).join(', ')}</p>`;
        $('p:contains("Markets Covered in Our All Satta Matka Chart:")').nextUntil('div.mt-8').remove();
        $('p:contains("Markets Covered in Our All Satta Matka Chart:")').replaceWith(activeListHtml);

        $('p:contains("Track Every Jodi Pair Across All Markets")').parent().find('p:contains("Morning Markets:")').remove();
        $('p:contains("Track Every Jodi Pair Across All Markets")').parent().find('p:contains("Day Markets:")').remove();
        $('p:contains("Track Every Jodi Pair Across All Markets")').parent().find('p:contains("Night Markets:")').remove();

        $('p:contains("Complete Three-Digit Panel Records")').parent().find('p:contains("Morning Pana Charts:")').remove();
        $('p:contains("Complete Three-Digit Panel Records")').parent().find('p:contains("Day Pana Charts:")').remove();
        $('p:contains("Complete Three-Digit Panel Records")').parent().find('p:contains("Night Pana Charts:")').remove();
      }
    }

    // 6. DYNAMIC HOMEPAGE (index.html)
    if (filePath === 'index.html') {
      try {
        const ratesRes = await fetch(`${API_BASE}/markets/global/game-rates`, { next: { revalidate: 30 } });

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
            if (clean.includes('redbracket')) {
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

        // B. Replace Static Markets Grid with ONLY Added Markets
        if (regularMarkets.length > 0) {
          const gamesSection = $('section:has(span:contains("Games")) div.grid.grid-cols-1');
          if (gamesSection.length > 0) {
            const dynamicCardsHtml = regularMarkets.map(m => `
              <div class="scroll-mt-24" id="game-card-jodi-${m.slug}">
                <div class="bg-surfaceBg border border-borderColor rounded-2xl p-4 max-sm:p-3.5 md:p-[18px_20px] h-full shadow-[0_10px_30px_rgba(27,19,10,0.04)] transition-all duration-300 hover:border-goldLight hover:shadow-[0_16px_34px_rgba(224,130,10,0.12)]">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1">
                        <h5 class="not-italic uppercase mb-0 font-display font-bold text-black leading-tight text-[18px] max-sm:text-[17px] tracking-wider truncate">
                          ${m.name.toUpperCase()}
                        </h5>
                      </div>
                      <span class="block text-left text-[20px] max-sm:text-[18px] font-bold text-black leading-none mt-1">
                        ${m.result}
                      </span>
                    </div>
                    <div class="shrink-0 flex flex-col items-end justify-start gap-2">
                      <span class="block text-[12px] max-sm:text-[11px] font-semibold leading-none whitespace-nowrap ${m.status.toLowerCase().includes('close') ? 'text-danger' : 'text-successGreen'}">
                        ${m.status}
                      </span>
                      <a aria-label="Play now" class="shrink-0 h-9 max-sm:h-8 px-3.5 max-sm:px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-[13px] max-sm:text-[12px] font-display font-bold transition-all bg-gradient-to-b from-gradGoldTop to-gradGoldBottom text-white shadow-[0_6px_14px_rgba(120,82,13,0.28)] hover:brightness-105 hover:!text-white cursor-pointer" href="https://github.com/shravani-agro/dpsara_frontend/releases/latest/download/dpsara.apk">
                        <svg aria-hidden="true" class="lucide lucide-play w-3.5 h-3.5 fill-current !text-white" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
                        </svg>Play
                      </a>
                    </div>
                  </div>
                  <div class="flex items-center justify-between gap-2.5 mt-3 pt-3 max-sm:mt-2.5 max-sm:pt-2.5 border-t border-borderColor">
                    <a class="inline-flex items-center justify-center min-w-[118px] max-sm:min-w-0 h-[36px] max-sm:h-[32px] px-4 border-[1.5px] border-goldLight rounded-full bg-gradient-to-b from-gradGoldTop to-gradGoldBottom text-white font-display text-[13px] max-sm:text-[12px] font-bold whitespace-nowrap transition-all duration-300 hover:brightness-105 hover:text-white focus-visible:brightness-105 focus-visible:text-white" data-return-card="game-card-jodi-${m.slug}" href="/${m.slug}_jodi.html">
                      Jodi Chart
                    </a>
                    <a class="inline-flex items-center justify-center min-w-[118px] max-sm:min-w-0 h-[36px] max-sm:h-[32px] px-4 border-[1.5px] border-goldLight rounded-full bg-gradient-to-b from-gradGoldTop to-gradGoldBottom text-white font-display text-[13px] max-sm:text-[12px] font-bold whitespace-nowrap transition-all duration-300 hover:brightness-105 hover:text-white focus-visible:brightness-105 focus-visible:text-white" data-return-card="game-card-jodi-${m.slug}" href="/${m.slug}_pana.html">
                      Pana Chart
                    </a>
                  </div>
                </div>
              </div>
            `).join('');
            gamesSection.html(dynamicCardsHtml);
          }
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
