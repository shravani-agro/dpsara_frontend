document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'https://backend.dpsara777.com/api';

    // Remove starline and jackpot charts from DOM
    function removeStarlineAndJackpotCharts() {
        document.querySelectorAll('a[href*="starline-pana"], a[href*="jackpot-jodi"], a[href*="jackpot-chart"], a[href*="starline_daily"], a[href*="jackpot_daily"]').forEach(el => el.remove());
        document.querySelectorAll('a').forEach(a => {
            const text = (a.innerText || '').toLowerCase();
            if (text.includes('starline chart') || text.includes('jackpot chart')) {
                const li = a.closest('li');
                if (li) li.remove();
                else a.remove();
            }
        });
    }

    // 1. Fetch & Update Markets (Live Results)
    async function updateMarkets() {
        try {
            const [marketsRes, starlineRes] = await Promise.all([
                fetch(`${API_BASE}/markets`),
                fetch(`${API_BASE}/starline/markets`)
            ]);

            let markets = [];
            if (marketsRes.ok) markets = await marketsRes.json();
            let starlineMarkets = [];
            if (starlineRes.ok) starlineMarkets = await starlineRes.json();

            const allMarkets = [...markets, ...starlineMarkets];

            allMarkets.forEach(market => {
                if (!market.name) return;

                const slug = market.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                let cardId = `game-card-jodi-${slug}`;

                if (market.type === 'starline' || market.name.includes(':')) {
                    const timeSlug = market.name.toLowerCase().replace(':', '-').replace(' ', '-');
                    cardId = `game-card-starline-${timeSlug}`;
                } else if (market.type === 'jackpot') {
                    const timeSlug = market.name.toLowerCase().replace(':', '-').replace(' ', '-');
                    cardId = `game-card-jackpot-${timeSlug}`;
                }

                const card = document.getElementById(cardId) || document.getElementById(`game-card-jodi-${slug}`);
                if (card) {
                    // Update Result
                    const resultSpan = card.querySelector('span.text-\\[20px\\], span.text-\\[18px\\]');
                    if (resultSpan && market.result) {
                        resultSpan.innerText = market.result;
                    }

                    // Update Status
                    const statusSpan = card.querySelector('span.text-\\[12px\\], span.text-\\[11px\\]');
                    if (statusSpan && market.status) {
                        statusSpan.innerText = market.status;
                        if (market.status.toLowerCase().includes('close')) {
                            statusSpan.className = statusSpan.className.replace('text-successGreen', 'text-danger');
                        } else {
                            statusSpan.className = statusSpan.className.replace('text-danger', 'text-successGreen');
                        }
                    }
                }
            });

            // Update Header dropdowns and Footer chart links dynamically
            updateNavAndFooterCharts(allMarkets);
        } catch (e) {
            console.error('Error fetching live markets:', e);
        }
    }

    function updateNavAndFooterCharts(markets) {
        if (!markets || !markets.length) return;
        const regular = markets.filter(m => {
            const isStarline = m.is_starline === true || m.is_starline === 1 || m.is_starline === '1' || (m.market_type || '').toLowerCase() === 'starline';
            const isJackpot = m.is_jackpot === true || m.is_jackpot === 1 || m.is_jackpot === '1' || (m.market_type || '').toLowerCase() === 'jackpot';
            if (isStarline || isJackpot) return false;
            const mType = (m.market_type || '').toLowerCase();
            return mType === 'regular' || mType === 'main' || mType === '' || !mType;
        });
        if (!regular.length) return;

        const jodiLinks = regular.map(m => {
            const slug = (m.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return `<li class="break-inside-avoid leading-tight border-b border-[rgba(22,16,14,0.08)]"><a class="block rounded-lg px-2.5 py-1.5 text-[13px] font-semibold uppercase text-black no-underline transition-colors hover:bg-timeBg hover:text-primary" href="/${slug}_jodi.html">${m.name.toUpperCase()}</a></li>`;
        }).join('');

        const panaLinks = regular.map(m => {
            const slug = (m.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return `<li class="break-inside-avoid leading-tight border-b border-[rgba(22,16,14,0.08)]"><a class="block rounded-lg px-2.5 py-1.5 text-[13px] font-semibold uppercase text-black no-underline transition-colors hover:bg-timeBg hover:text-primary" href="/${slug}_pana.html">${m.name.toUpperCase()}</a></li>`;
        }).join('');

        document.querySelectorAll('p').forEach(p => {
            const text = (p.innerText || '').toLowerCase().trim();
            if (text === 'jodi charts') {
                const ul = p.parentElement ? p.parentElement.querySelector('ul') : null;
                if (ul) ul.innerHTML = jodiLinks;
            } else if (text === 'pana charts') {
                const ul = p.parentElement ? p.parentElement.querySelector('ul') : null;
                if (ul) ul.innerHTML = panaLinks;
            }
        });

        const footerCharts = document.getElementById('footer-charts');
        if (footerCharts) {
            footerCharts.querySelectorAll('h3').forEach(h3 => {
                const text = (h3.innerText || '').toLowerCase().trim();
                if (text === 'jodi charts') {
                    const ul = h3.parentElement ? h3.parentElement.querySelector('ul') : null;
                    if (ul) ul.innerHTML = jodiLinks;
                } else if (text === 'pana charts') {
                    const ul = h3.parentElement ? h3.parentElement.querySelector('ul') : null;
                    if (ul) ul.innerHTML = panaLinks;
                } else if (text.includes('starline') || text.includes('jackpot')) {
                    const col = h3.closest('div.border');
                    if (col) col.remove();
                }
            });
        }
    }

    // 2. Fetch & Update Game Rates
    async function updateGameRates() {
        try {
            const ratesRes = await fetch(`${API_BASE}/markets/global/game-rates`);
            if (!ratesRes.ok) return;

            const gameRates = await ratesRes.json();
            const rateMap = {};
            gameRates.forEach(r => {
                const k = r.bet_type.toLowerCase().replace(/[^a-z0-9]/g, '');
                rateMap[k] = r.rate;
            });

            const getRate = (name) => {
                const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (clean.includes('singledigit') || clean.includes('singleank')) return rateMap['singleank'] ?? rateMap['singledigit'] ?? 9.5;
                if (clean.includes('jodidigit') || clean.includes('jodi')) return rateMap['jodi'] ?? rateMap['jodidigit'] ?? 95;
                if (clean.includes('singlepana') || clean.includes('singlepanna')) return rateMap['singlepatti'] ?? rateMap['singlepana'] ?? 150;
                if (clean.includes('doublepana') || clean.includes('doublepanna')) return rateMap['doublepatti'] ?? rateMap['doublepana'] ?? 300;
                if (clean.includes('triplepana') || clean.includes('triplepanna')) return rateMap['triplepatti'] ?? rateMap['triplepana'] ?? 900;
                if (clean.includes('redbracket')) return rateMap['redbracket'] ?? 95;
                if (clean.includes('halfsangam')) return rateMap['halfsangam'] ?? 1000;
                if (clean.includes('fullsangam')) return rateMap['fullsangam'] ?? 10000;
                return null;
            };

            // Update Mobile Game Rates Table
            const rateRows = document.querySelectorAll('table tbody tr');
            rateRows.forEach(row => {
                const labelTd = row.querySelector('td');
                if (labelTd) {
                    const rate = getRate(labelTd.innerText.trim());
                    if (rate !== null) {
                        const allSpans = row.querySelectorAll('td:last-child span');
                        if (allSpans.length > 0) {
                            allSpans[allSpans.length - 1].innerText = rate;
                        }
                    }
                }
            });

            // Update Desktop Game Rates Cards
            const rateCards = document.querySelectorAll('h5');
            rateCards.forEach(h5 => {
                const rate = getRate(h5.innerText.trim());
                if (rate !== null) {
                    const cardParent = h5.closest('div');
                    if (cardParent) {
                        const spans = cardParent.querySelectorAll('span span');
                        if (spans.length > 0) {
                            spans[spans.length - 1].innerText = rate;
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Error fetching game rates:', e);
        }
    }

    // Initial Execution
    removeStarlineAndJackpotCharts();
    updateMarkets();
    updateGameRates();

    // Auto Refresh every 10 seconds for real-time live results
    setInterval(() => {
        updateMarkets();
        updateGameRates();
        removeStarlineAndJackpotCharts();
    }, 10000);
});
