document.addEventListener('DOMContentLoaded', async () => {
    try {
        const API_BASE = 'https://backend.dpsara777.com/api';
        
        // 1. Fetch Regular & Jackpot Markets
        const marketsRes = await fetch(`${API_BASE}/markets`);
        let markets = [];
        if (marketsRes.ok) {
            markets = await marketsRes.json();
        }
        
        // 2. Fetch Starline Markets
        const starlineRes = await fetch(`${API_BASE}/starline/markets`);
        let starlineMarkets = [];
        if (starlineRes.ok) {
            starlineMarkets = await starlineRes.json();
        }

        const allMarkets = [...markets, ...starlineMarkets];

        // 3. Update DOM
        allMarkets.forEach(market => {
            if (!market.name) return;
            
            // The HTML IDs are formatted like "game-card-jodi-market-name"
            const slug = market.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            
            // Try to find regular or starline card
            let cardId = `game-card-jodi-${slug}`;
            
            // Starline often uses the format "game-card-[time]"
            if (market.type === 'starline' || market.name.includes(':')) {
                // Formatting time like "10:30 AM" -> "10-30-am"
                const timeSlug = market.name.toLowerCase().replace(':', '-').replace(' ', '-');
                cardId = `game-card-starline-${timeSlug}`;
            }

            // Jackpot
            if (market.type === 'jackpot') {
                const timeSlug = market.name.toLowerCase().replace(':', '-').replace(' ', '-');
                cardId = `game-card-jackpot-${timeSlug}`;
            }

            const card = document.getElementById(cardId) || document.getElementById(`game-card-jodi-${slug}`);
            
            if (card) {
                // Update Result
                const resultSpan = card.querySelector('span.text-\\[20px\\]');
                if (resultSpan) {
                    resultSpan.innerText = market.result || '***-**-***';
                }
                
                // Update Status (Running for open, Closed, etc)
                // The status is typically in a span with text-successGreen or text-danger
                const statusSpan = card.querySelector('span.text-\\[12px\\], span.text-\\[11px\\]');
                if (statusSpan && statusSpan.innerText.toLowerCase().includes('running') || statusSpan.innerText.toLowerCase().includes('close')) {
                    statusSpan.innerText = market.status || 'Running for open';
                    if ((market.status || '').toLowerCase().includes('close')) {
                        statusSpan.className = statusSpan.className.replace('text-successGreen', 'text-danger');
                    } else {
                        statusSpan.className = statusSpan.className.replace('text-danger', 'text-successGreen');
                    }
                }
            }
        });

        // 4. Update Game Rates
        try {
            const ratesRes = await fetch(`${API_BASE}/markets/global/game-rates`);
            if (ratesRes.ok) {
                const gameRates = await ratesRes.json();
                
                // Map API names to HTML display names
                const rateMap = {};
                gameRates.forEach(r => {
                    const typeStr = r.bet_type.toLowerCase().replace(/_/g, ' ');
                    rateMap[typeStr] = r.rate;
                });

                // Find all Game Rate rows
                const rateRows = document.querySelectorAll('td.font-display.text-\\[12px\\], td.font-display.text-\\[11px\\]');
                rateRows.forEach(row => {
                    const gameName = row.innerText.toLowerCase().trim();
                    // Match with our rateMap
                    let matchingRate = null;
                    if (gameName.includes('single digit') || gameName.includes('single ank')) matchingRate = rateMap['single digit'];
                    if (gameName.includes('jodi')) matchingRate = rateMap['jodi digit'];
                    if (gameName.includes('single panna')) matchingRate = rateMap['single pana'];
                    if (gameName.includes('double panna')) matchingRate = rateMap['double pana'];
                    if (gameName.includes('triple panna')) matchingRate = rateMap['triple pana'];
                    if (gameName.includes('half sangam')) matchingRate = rateMap['half sangam'];
                    if (gameName.includes('full sangam')) matchingRate = rateMap['full sangam'];

                    if (matchingRate) {
                        const nextTd = row.nextElementSibling;
                        if (nextTd) {
                            // The rate value is usually inside a span with the number
                            const rateSpan = nextTd.querySelectorAll('span');
                            // Usually the structure is: <span>1</span> <span>KA</span> <span>9.5</span> (or 95, etc)
                            // We find the last span that has a number
                            if (rateSpan.length >= 3) {
                                rateSpan[rateSpan.length - 1].innerText = matchingRate;
                            }
                        }
                    }
                });
            }
        } catch(e) {
            console.error('Error fetching game rates', e);
        }

        console.log('Successfully updated homepage markets and rates with live data from backend.');
            
    } catch (e) {
        console.error('Error in dynamic homepage script', e);
    }
});
