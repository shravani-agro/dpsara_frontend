document.addEventListener('DOMContentLoaded', async () => {
    try {
        const API_BASE = 'https://backend.dpsara777.com/api';
        
        // Load markets
        fetch(`${API_BASE}/mobile/markets`)
            .then(res => res.json())
            .then(data => {
                if (data && Array.isArray(data)) {
                    console.log('Markets loaded dynamically', data);
                    // DOM manipulation for markets could go here
                }
            })
            .catch(err => console.error('Error loading markets', err));

        // Load rates (example path, adjust if backend adds it)
        fetch(`${API_BASE}/admin/game-rates`)
            .then(res => res.json())
            .then(data => {
                if (data && Array.isArray(data)) {
                    console.log('Game rates loaded dynamically', data);
                    // DOM manipulation for game rates could go here
                }
            })
            .catch(err => console.error('Error loading game rates', err));
            
    } catch (e) {
        console.error('Error in dynamic homepage script', e);
    }
});
