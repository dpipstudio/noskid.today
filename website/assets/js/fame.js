// Fame.js | Hall of Fame window

async function showFame() {
    const win = ClassicWindow.createWindow({
        title: 'Hall of Fame',
        content: '<div style="text-align:center;color:white;padding:20px">Loading...</div>',
        width: 500,
        height: 400,
        x: Math.round((window.innerWidth - 500) / 2),
        y: Math.round((window.innerHeight - 400) / 2),
        theme: 'dark',
        icon: 'assets/img/star-fill.svg',
        statusText: 'Hall of Fame'
    });

    try {
        const response = await fetch('api/fame');
        const json = await response.json();

        if (!json.success || !json.data.length) {
            ClassicWindow.updateWindowContent(win, cwStyles('<p style="text-align:center;color:#aaa">No entries yet.</p>'));
            return;
        }

        const rows = json.data.map((cert, i) => `
            <tr>
                <td style="padding:6px 10px;color:#666;font-size:0.85em">${cert.id}</td> 
                <td style="padding:6px 10px">${cert.name}</td>
                <td style="padding:6px 10px;color:#aaa">${cert.percentage}%</td>
                <td style="padding:6px 10px;color:#666;font-size:0.85em">${cert.date}</td>
            </tr>
        `).join('');

        const content = cwStyles(`
            <style>
                table { width: 100%; border-collapse: collapse; }
                tr:hover td { background: rgba(255,255,255,0.05); }
                td, th { border-bottom: 1px solid #222; }
                th { color: #888; font-weight: normal; padding: 6px 10px; text-align: left; }
                td { padding: 6px 10px; }
            </style>
            <p style="padding:4px 10px;margin:0">
                The finest people to have completed the NoSkid challenge.
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Cert</th>
                        <th>Name</th>
                        <th>Score</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `);

        ClassicWindow.updateWindowContent(win, content);
        ClassicWindow.updateStatusText(win, `${json.data.length} entries`);

    } catch (e) {
        log('Failed to load Hall of Fame: ' + e.message, 'error');
        ClassicWindow.updateWindowContent(win, cwStyles('<p style="color:red;text-align:center">Failed to load.</p>'));
    }
}