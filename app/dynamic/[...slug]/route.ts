import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://backend.dpsara777.com/api';

// Helper to format date "dd MMM"
function formatDateStr(d: Date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]}`;
}

export async function GET(request: Request, { params }: { params: { slug: string[] } }) {
  try {
    let filePath = params.slug ? params.slug.join('/') : '';
    if (filePath === '' || filePath === 'index.html') {
      filePath = 'index.html';
    } else if (!filePath.endsWith('.html')) {
      return new NextResponse('Not found', { status: 404 });
    }

    const templatesDir = path.join(process.cwd(), 'templates');
    const fullPath = path.join(templatesDir, filePath);

    if (!fs.existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const html = fs.readFileSync(fullPath, 'utf8');
    const $ = cheerio.load(html);

    // Strip out Next.js hydration scripts to prevent them from overwriting our injected HTML
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

    // If it's a chart page, generate the chart
    if (filePath.includes('_jodi') || filePath.includes('_pana') || filePath.includes('_starline') || filePath.includes('_jackpot')) {
      // Parse market name from filename, e.g., time-bazar_jodi.html -> Time Bazar
      let marketSlug = filePath.split('_')[0]; 
      
      // Starline and Jackpot have format like 10_00-am_jackpot-jodi.html
      // We will just fetch all results and filter on the frontend for now, or fetch everything.
      const res = await fetch(`${API_BASE}/results?limit=10000`, { next: { revalidate: 60 } });
      let history = [];
      if (res.ok) {
        history = await res.json();
      }

      const isJodi = filePath.includes('_jodi');
      const isPana = filePath.includes('_pana') || filePath.includes('jackpot-chart');
      
      // Match the market name loosely
      const normalizedSlug = marketSlug.toLowerCase().replace(/-/g, ' ');
      
      // Filter results for this market
      // For Starline/Jackpot, the marketName in DB might be "10:00 AM" or "Starline 10:30"
      // We will do a generic match based on time or name
      const marketResults = history.filter((r: any) => {
        const mName = (r.market_name || '').toLowerCase();
        if (filePath.includes('starline')) {
           return mName.includes('starline') && mName.includes(marketSlug.replace('-', ':').split('_')[0]);
        }
        if (filePath.includes('jackpot')) {
           return mName.includes('jackpot') && mName.includes(marketSlug.replace('-', ':').split('_')[0]);
        }
        return mName === normalizedSlug;
      });

      // Group by date
      const resultsByDate: Record<string, any> = {};
      marketResults.forEach((r: any) => {
         const date = new Date(r.result_date);
         date.setHours(0,0,0,0);
         resultsByDate[date.getTime().toString()] = r.result || '***-**-***';
      });

      const dates = Object.keys(resultsByDate).map(Number).sort((a,b) => a-b);
      
      let rowsHtml = '';
      if (dates.length > 0) {
        const firstDate = new Date(dates[0]);
        // Get first Monday
        let currentMonday = new Date(firstDate);
        const day = currentMonday.getDay();
        const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
        currentMonday.setDate(diff);

        const lastDate = new Date(dates[dates.length - 1]);

        while (currentMonday <= lastDate) {
          const currentSunday = new Date(currentMonday);
          currentSunday.setDate(currentMonday.getDate() + 6);

          let rowData = ``;
          
          for (let i = 0; i < 7; i++) {
            const d = new Date(currentMonday);
            d.setDate(currentMonday.getDate() + i);
            const r = resultsByDate[d.getTime().toString()] || '***-**-***';
            
            let displayHtml = '';
            
            if (isJodi) {
               // extract Jodi
               const parts = r.split('-');
               let jodi = '**';
               if (parts.length >= 3) {
                  jodi = parts[1];
               } else if (parts.length == 1 && r !== '***-**-***') {
                  jodi = r; // Some fallback
               }
               
               let textColorClass = 'text-black dark:text-white';
               if (jodi[0] === jodi[1] && jodi[0] !== '*') {
                  textColorClass = 'text-danger'; // red for doubles
               }
               if (jodi === '**') {
                 textColorClass = 'text-dark/40 dark:text-dark/40';
               }

               displayHtml = `<td class="py-2.5 px-2 border-r border-borderColor/40 relative">
                  <span class="font-black text-sm md:text-base ${textColorClass} group-hover:scale-110 inline-block transition-transform">${jodi}</span>
                </td>`;
            } else {
               // Panna Chart
               const parts = r.split('-');
               let openPana = '***';
               let jodi = '**';
               let closePana = '***';
               if (parts.length >= 3) {
                  openPana = parts[0];
                  jodi = parts[1];
                  closePana = parts[2];
               }
               
               let textColorClass = 'text-black dark:text-white';
               if (jodi[0] === jodi[1] && jodi[0] !== '*') {
                  textColorClass = 'text-danger'; // red for doubles
               }
               if (jodi === '**') {
                 textColorClass = 'text-dark/40 dark:text-dark/40';
               }

               displayHtml = `<td class="py-2 px-1 md:px-2 border-r border-borderColor/40">
                  <div class="flex flex-col items-center justify-center h-full min-h-[50px] md:min-h-[60px] relative group cursor-pointer">
                    <div class="text-[9px] md:text-[11px] font-bold text-dark tracking-widest leading-none mb-1 group-hover:text-primary transition-colors">${openPana}</div>
                    <div class="text-[13px] md:text-[16px] font-black ${textColorClass} leading-none my-0.5 group-hover:scale-110 transition-transform">${jodi}</div>
                    <div class="text-[9px] md:text-[11px] font-bold text-dark tracking-widest leading-none mt-1 group-hover:text-primary transition-colors">${closePana}</div>
                  </div>
                </td>`;
            }
            
            rowData += displayHtml;
          }

          rowsHtml += `<tr class="border-b border-borderColor/40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
            <td class="py-2.5 px-2 border-r border-borderColor/40 text-[10px] md:text-xs font-bold text-dark w-24">
              ${formatDateStr(currentMonday)}<br/>To<br/>${formatDateStr(currentSunday)}
            </td>
            ${rowData}
          </tr>`;

          currentMonday.setDate(currentMonday.getDate() + 7);
        }
      }

      if (rowsHtml) {
        $('table tbody').first().empty().append(rowsHtml);
      } else {
        $('table tbody').first().empty().append(`<tr><td colspan="8" class="py-8 text-center text-dark">No records found for ${marketSlug}</td></tr>`);
      }
    } else if (filePath === 'index.html') {
      // Inject client-side script for dynamic homepage
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
