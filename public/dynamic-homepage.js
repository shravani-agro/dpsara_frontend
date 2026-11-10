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
            let ratesRes = await fetch('/api/markets/global/game-rates').catch(() => null);
            if (!ratesRes || !ratesRes.ok) {
                ratesRes = await fetch(`${API_BASE}/markets/global/game-rates`).catch(() => null);
            }
            if (!ratesRes || !ratesRes.ok) return;

            const gameRates = await ratesRes.json();
            const rateMap = {};
            if (Array.isArray(gameRates)) {
                gameRates.forEach(r => {
                    const k = (r.bet_type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    rateMap[k] = r.rate;
                });
            }

            const getRate = (name) => {
                const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (clean.includes('singledigit') || clean.includes('singleank')) return rateMap['singleank'] ?? rateMap['singledigit'] ?? 9.5;
                if (clean.includes('jodidigit') || clean.includes('jodi')) return rateMap['jodi'] ?? rateMap['jodidigit'] ?? 95;
                if (clean.includes('singlepana') || clean.includes('singlepanna')) return rateMap['singlepatti'] ?? rateMap['singlepana'] ?? 150;
                if (clean.includes('doublepana') || clean.includes('doublepanna')) return rateMap['doublepatti'] ?? rateMap['doublepana'] ?? 300;
                if (clean.includes('triplepana') || clean.includes('triplepanna')) return rateMap['triplepatti'] ?? rateMap['triplepana'] ?? 900;
                if (clean.includes('redbracket')) return rateMap['redbracket'] ?? 95;
                if (clean.includes('halfsangam')) return rateMap['halfsangam'] ?? rateMap['halfsangama'] ?? rateMap['halfsangamb'] ?? 1000;
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

    // 3. RealSpinPro Live Master Toggle & Interactive Game Engine
    function initRealSpinPro() {
        const landingSection = document.getElementById('realspinpro-landing-section');
        const floatingPill = document.getElementById('realspinpro-floating-pill');
        const navItem = document.getElementById('nav-item-realspinpro');
        const mobileNavItem = document.getElementById('mobile-nav-item-realspinpro');

        if (!landingSection) return;

        let selectedChip = 10;
        let bets = {};
        let lastBets = {};
        let demoBalance = 5000;
        let isSpinning = false;
        let currentRotation = 0;
        let roundSeconds = 45;
        let currentRoundId = 1088;
        let currentMultiplier = 1;
        let timerInterval = null;
        let isGameEnabled = true;

        const numberColors = {
            0: 'bg-[#1E88E5]',
            1: 'bg-[#F59E0B]',
            2: 'bg-[#10B981]',
            3: 'bg-[#EC4899]',
            4: 'bg-[#8B5CF6]',
            5: 'bg-[#EF4444]',
            6: 'bg-[#F97316]',
            7: 'bg-[#06B6D4]',
            8: 'bg-[#4F46E5]',
            9: 'bg-[#B45309]'
        };

        function updateBetDisplays() {
            let total = 0;
            // Update individual tiles
            for (let i = 0; i <= 9; i++) {
                const bVal = bets[i] || 0;
                total += bVal;
                const btn = document.querySelector(`.rsp-num-btn[data-rsp-num="${i}"]`);
                if (btn) {
                    const valEl = btn.querySelector('.rsp-bet-val');
                    if (valEl) {
                        valEl.innerText = bVal > 0 ? `₹${bVal}` : '-';
                        if (bVal > 0) {
                            valEl.classList.add('text-primary');
                        } else {
                            valEl.classList.remove('text-primary');
                        }
                    }
                }
            }
            const playEl = document.getElementById('rsp-play-amount');
            if (playEl) playEl.innerText = `₹${total.toLocaleString('en-IN')}`;

            const balEl = document.getElementById('rsp-demo-balance');
            if (balEl) balEl.innerText = `₹${demoBalance.toLocaleString('en-IN')}`;
        }

        // Master Toggle Check
        async function syncRealSpinProStatus() {
            try {
                let statusRes = await fetch(`${API_BASE}/mobile/settings`).catch(() => null);
                if (statusRes && statusRes.ok) {
                    const json = await statusRes.json();
                    const enabled = json?.data?.realspinpro_enabled;
                    if (enabled !== undefined) {
                        const isLive = enabled !== false && enabled !== 0 && enabled !== '0';
                        isGameEnabled = isLive;
                        if (isLive) {
                            landingSection.style.display = '';
                            if (floatingPill) floatingPill.style.display = '';
                            if (navItem) navItem.style.display = '';
                            if (mobileNavItem) mobileNavItem.style.display = '';
                        } else {
                            landingSection.style.display = 'none';
                            if (floatingPill) floatingPill.style.display = 'none';
                            if (navItem) navItem.style.display = 'none';
                            if (mobileNavItem) mobileNavItem.style.display = 'none';
                            return;
                        }
                    }
                }

                // Sync Active Round from backend
                const roundRes = await fetch(`${API_BASE}/spinwheel/round/active`).catch(() => null);
                if (roundRes && roundRes.ok) {
                    const rData = await roundRes.json();
                    const roundObj = rData?.data || rData;
                    if (roundObj?.round_id) {
                        currentRoundId = Number(roundObj.round_id);
                        const rIdEl = document.getElementById('rsp-round-id');
                        if (rIdEl) rIdEl.innerText = currentRoundId;
                    }
                    if (roundObj?.time_remaining !== undefined) {
                        roundSeconds = Math.max(0, Math.floor(Number(roundObj.time_remaining)));
                    }
                    if (roundObj?.multiplier) {
                        currentMultiplier = Number(roundObj.multiplier);
                    }
                }

                // Sync History
                const histRes = await fetch(`${API_BASE}/spinwheel/history?limit=10`).catch(() => null);
                if (histRes && histRes.ok) {
                    const hData = await histRes.json();
                    const rounds = Array.isArray(hData?.data) ? hData.data : Array.isArray(hData) ? hData : [];
                    if (rounds.length > 0) {
                        renderHistoryStrip(rounds);
                    }
                }
            } catch (err) {
                // Silently handle offline/network deviations
            }
        }

        function renderHistoryStrip(rounds) {
            const strip = document.getElementById('rsp-history-strip');
            if (!strip) return;
            const html = rounds.slice(0, 10).map(r => {
                const num = r.win_number ?? r.result_number ?? r.number ?? Math.floor(Math.random() * 10);
                const colorCls = numberColors[num] || 'bg-blue-600';
                return `<span class="rsp-hist-slot w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${colorCls} shadow-sm">${num}</span>`;
            }).join('');
            if (html) strip.innerHTML = html;
        }

        // Live Clock Loop
        function startLiveClock() {
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (!isGameEnabled) return;

                roundSeconds -= 1;
                if (roundSeconds < 0) {
                    roundSeconds = 60;
                    currentRoundId += 1;
                    const rIdEl = document.getElementById('rsp-round-id');
                    if (rIdEl) rIdEl.innerText = currentRoundId;
                }

                const timerEl = document.getElementById('rsp-timer');
                if (timerEl) {
                    const mm = String(Math.floor(roundSeconds / 60)).padStart(2, '0');
                    const ss = String(roundSeconds % 60).padStart(2, '0');
                    timerEl.innerText = `${mm}:${ss}`;
                }

                const timerPill = document.getElementById('rsp-timer-pill');
                if (timerPill) {
                    timerPill.innerText = `${roundSeconds}s`;
                }

                const phaseBadge = document.getElementById('rsp-phase-badge');
                const phaseText = document.getElementById('rsp-phase-badge-text');

                if (roundSeconds > 15) {
                    if (phaseBadge) {
                        phaseBadge.className = 'block text-[12px] max-sm:text-[11px] font-semibold leading-none whitespace-nowrap text-successGreen';
                        phaseBadge.innerText = 'Running for bets';
                    }
                    if (phaseText) phaseText.innerText = 'PLACE YOUR BET';
                } else if (roundSeconds > 10) {
                    if (phaseBadge) {
                        phaseBadge.className = 'block text-[12px] max-sm:text-[11px] font-semibold leading-none whitespace-nowrap text-amber-500';
                        phaseBadge.innerText = 'Bets Locked';
                    }
                    if (phaseText) phaseText.innerText = 'BETS LOCKED';
                } else if (roundSeconds > 5) {
                    if (phaseBadge) {
                        phaseBadge.className = 'block text-[12px] max-sm:text-[11px] font-semibold leading-none whitespace-nowrap text-primary animate-pulse';
                        phaseBadge.innerText = 'Wheel Spinning';
                    }
                    if (phaseText) phaseText.innerText = 'WHEEL SPINNING';

                    if (!isSpinning && roundSeconds === 9) {
                        // Background wheel spin for live visitors
                        const luckyWin = Math.floor(Math.random() * 10);
                        spinWheel(luckyWin, false);
                    }
                } else {
                    if (phaseBadge) {
                        phaseBadge.className = 'block text-[12px] max-sm:text-[11px] font-semibold leading-none whitespace-nowrap text-purple-600 dark:text-purple-400';
                        phaseBadge.innerText = 'Winner Announced';
                    }
                    if (phaseText) phaseText.innerText = 'WINNER ANNOUNCED';
                }
            }, 1000);
        }

        // Chip Selector Buttons
        const chipBtns = document.querySelectorAll('.rsp-chip-btn');
        chipBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                chipBtns.forEach(b => {
                    b.classList.remove('ring-2', 'ring-primary', 'scale-110');
                });
                btn.classList.add('ring-2', 'ring-primary', 'scale-110');
                selectedChip = Number(btn.getAttribute('data-rsp-chip') || 10);
            });
        });

        // Number Buttons (1-5, 6-0)
        const numBtns = document.querySelectorAll('.rsp-num-btn');
        numBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (isSpinning) return;
                const num = Number(btn.getAttribute('data-rsp-num'));
                if (demoBalance < selectedChip) {
                    alert('Demo balance insufficient! Reset or clear bets to continue.');
                    return;
                }
                demoBalance -= selectedChip;
                bets[num] = (bets[num] || 0) + selectedChip;
                updateBetDisplays();
            });
        });

        // Quick Action: Double Bets
        const doubleBtn = document.getElementById('rsp-btn-double');
        if (doubleBtn) {
            doubleBtn.addEventListener('click', () => {
                if (isSpinning) return;
                let needed = 0;
                Object.values(bets).forEach(v => needed += v);
                if (needed === 0) return;
                if (demoBalance < needed) {
                    alert('Insufficient demo balance to double bets!');
                    return;
                }
                demoBalance -= needed;
                Object.keys(bets).forEach(k => bets[k] *= 2);
                updateBetDisplays();
            });
        }

        // Quick Action: Repeat Previous Bets
        const repeatBtn = document.getElementById('rsp-btn-repeat');
        if (repeatBtn) {
            repeatBtn.addEventListener('click', () => {
                if (isSpinning) return;
                let needed = 0;
                Object.values(lastBets).forEach(v => needed += v);
                if (needed === 0) return;
                if (demoBalance < needed) {
                    alert('Insufficient demo balance to repeat bets!');
                    return;
                }
                // clear current
                Object.values(bets).forEach(v => demoBalance += v);
                bets = { ...lastBets };
                demoBalance -= needed;
                updateBetDisplays();
            });
        }

        // Quick Action: ODDS (1, 3, 5, 7, 9)
        const oddsBtn = document.getElementById('rsp-btn-odds');
        if (oddsBtn) {
            oddsBtn.addEventListener('click', () => {
                if (isSpinning) return;
                const odds = [1, 3, 5, 7, 9];
                const totalCost = selectedChip * odds.length;
                if (demoBalance < totalCost) {
                    alert('Insufficient demo balance to bet all Odds!');
                    return;
                }
                demoBalance -= totalCost;
                odds.forEach(n => bets[n] = (bets[n] || 0) + selectedChip);
                updateBetDisplays();
            });
        }

        // Quick Action: EVENS (0, 2, 4, 6, 8)
        const evensBtn = document.getElementById('rsp-btn-evens');
        if (evensBtn) {
            evensBtn.addEventListener('click', () => {
                if (isSpinning) return;
                const evens = [0, 2, 4, 6, 8];
                const totalCost = selectedChip * evens.length;
                if (demoBalance < totalCost) {
                    alert('Insufficient demo balance to bet all Evens!');
                    return;
                }
                demoBalance -= totalCost;
                evens.forEach(n => bets[n] = (bets[n] || 0) + selectedChip);
                updateBetDisplays();
            });
        }

        // Clear Bets Button
        const clearBtn = document.getElementById('rsp-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (isSpinning) return;
                let refund = 0;
                Object.values(bets).forEach(v => refund += v);
                demoBalance += refund;
                if (demoBalance < 1000) demoBalance = 5000;
                bets = {};
                updateBetDisplays();

                const outcomeBox = document.getElementById('rsp-outcome-box');
                if (outcomeBox) outcomeBox.classList.add('hidden');
            });
        }

        // Spin Logic
        function spinWheel(targetNumber, isManual = true) {
            if (isSpinning) return;
            isSpinning = true;

            const wheelEl = document.getElementById('rsp-wheel');
            const outcomeBox = document.getElementById('rsp-outcome-box');
            const outcomeMsg = document.getElementById('rsp-outcome-msg');
            const spinBtn = document.getElementById('rsp-spin-btn');

            if (outcomeBox) outcomeBox.classList.add('hidden');
            if (spinBtn) {
                spinBtn.disabled = true;
                spinBtn.classList.add('opacity-60', 'cursor-not-allowed');
            }

            // Save for REPEAT
            if (Object.keys(bets).length > 0) {
                lastBets = { ...bets };
            }

            // Target number: 0 is at 0 deg, 1 at 36 deg, etc.
            // Under pointer (top), to bring segment N to top:
            // segment angle = N * 36 deg. Rotation required is (360 - N * 36) deg.
            const targetSegmentAngle = (10 - (targetNumber % 10)) % 10 * 36;
            const extraRotations = 360 * 5; // 5 full spins
            const normalizedCurrent = currentRotation % 360;
            const delta = extraRotations + targetSegmentAngle - normalizedCurrent;
            currentRotation += delta;

            if (wheelEl) {
                wheelEl.style.transform = `rotate(${currentRotation}deg)`;
            }

            // Dynamic multiplier: 80% 1X, 15% 2X, 5% 3X
            const r = Math.random() * 100;
            let mult = 1;
            if (r > 95) mult = 3;
            else if (r > 80) mult = 2;

            setTimeout(() => {
                isSpinning = false;
                if (spinBtn) {
                    spinBtn.disabled = false;
                    spinBtn.classList.remove('opacity-60', 'cursor-not-allowed');
                }

                // Add to history strip
                const strip = document.getElementById('rsp-history-strip');
                if (strip) {
                    const colorCls = numberColors[targetNumber] || 'bg-blue-600';
                    const pill = document.createElement('span');
                    pill.className = `rsp-hist-slot w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${colorCls} shadow-sm animate-bounce`;
                    pill.innerText = targetNumber;
                    strip.insertBefore(pill, strip.firstChild);
                    if (strip.children.length > 10) {
                        strip.removeChild(strip.lastChild);
                    }
                }

                // Check Bet Outcome
                if (isManual) {
                    const betOnTarget = bets[targetNumber] || 0;
                    const winEl = document.getElementById('rsp-win-amount');
                    if (betOnTarget > 0) {
                        const winPayout = betOnTarget * 9 * mult;
                        demoBalance += winPayout;
                        if (winEl) winEl.innerText = `₹${winPayout.toLocaleString('en-IN')}`;

                        if (outcomeBox && outcomeMsg) {
                            outcomeMsg.innerHTML = `🎉 <span class="text-amber-500 font-black">JACKPOT WIN!</span> Number <strong>${targetNumber}</strong> landed with <strong>${mult}X Multiplier</strong>! You won <strong class="text-emerald-500">₹${winPayout.toLocaleString('en-IN')}</strong>!`;
                            outcomeBox.className = 'mt-3 p-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-center animate-fade-in block';
                        }
                    } else {
                        const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
                        if (winEl) winEl.innerText = '₹0';
                        if (outcomeBox && outcomeMsg) {
                            if (totalBet > 0) {
                                outcomeMsg.innerHTML = `🎡 Number <strong>${targetNumber}</strong> (${mult}X) Landed! Better luck next spin. Download app to win real cash!`;
                            } else {
                                outcomeMsg.innerHTML = `🎡 Wheel landed on Number <strong>${targetNumber}</strong> with <strong>${mult}X Multiplier</strong>! Pick numbers to win!`;
                            }
                            outcomeBox.className = 'mt-3 p-3 rounded-xl border border-primary/40 bg-timeBg text-center animate-fade-in block';
                        }
                    }

                    // Reset bets for next round
                    bets = {};
                    updateBetDisplays();
                }
            }, 4200);
        }

        // Spin Button Click
        const spinBtn = document.getElementById('rsp-spin-btn');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => {
                if (isSpinning) return;
                const randomWin = Math.floor(Math.random() * 10);
                spinWheel(randomWin, true);
            });
        }

        // Initial RealSpinPro sync and start clock
        syncRealSpinProStatus();
        startLiveClock();
        updateBetDisplays();

        // Periodic Status & Clock Sync (every 12 seconds)
        setInterval(syncRealSpinProStatus, 12000);
    }

        // Spin Button Click
        const spinBtn = document.getElementById('rsp-spin-btn');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => {
                if (isSpinning) return;
                const randomWin = Math.floor(Math.random() * 10);
                spinWheel(randomWin, true);
            });
        }

        // Initial RealSpinPro sync and start clock
        syncRealSpinProStatus();
        startLiveClock();

        // Periodic Status & Clock Sync (every 12 seconds)
        setInterval(syncRealSpinProStatus, 12000);
    }

    // Initial Execution
    removeStarlineAndJackpotCharts();
    updateMarkets();
    updateGameRates();
    initRealSpinPro();

    // Auto Refresh every 10 seconds for real-time live results
    setInterval(() => {
        updateMarkets();
        updateGameRates();
        removeStarlineAndJackpotCharts();
    }, 10000);
});
