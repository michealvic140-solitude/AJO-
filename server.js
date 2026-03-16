const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// --- DATABASE HELPERS ---
const DB_PATH = './database.json';
const db = () => JSON.parse(fs.readFileSync(DB_PATH));
const save = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- LUXURY FINTECH UI (Obsidian & Gold) ---
const UI_CSS = `
<style>
    :root { --obsidian: #0A0A0A; --gold: #EAB308; --glass: rgba(255, 255, 255, 0.05); }
    body { background: var(--obsidian); color: white; font-family: 'Inter', sans-serif; margin: 0; }
    .glass-card { background: var(--glass); backdrop-filter: blur(10px); border: 1px solid rgba(234, 179, 8, 0.2); border-radius: 15px; padding: 20px; }
    .gold-text { color: var(--gold); }
    .btn-gold { background: var(--gold); color: black; padding: 10px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; }
    .btn-gold:hover { transform: scale(1.05); box-shadow: 0 0 15px var(--gold); }
    .slot-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 5px; }
    .slot { padding: 10px; border: 1px solid #333; text-align: center; cursor: pointer; font-size: 10px; }
    .slot.taken { background: #333; color: #666; cursor: not-allowed; }
    .slot.available:hover { border-color: var(--gold); color: var(--gold); }
    nav { height: 70px; border-bottom: 1px solid #222; display: flex; align-items: center; justify-content: space-between; padding: 0 5%; }
</style>
`;

// --- CORE ROUTES ---

// Homepage & Leaderboard
app.get('/', (req, res) => {
    const data = db();
    const board = data.leaderboard.map(entry => `
        <div style="display:flex; justify-content:space-between; padding: 10px; border-bottom: 1px solid #222;">
            <span>@${entry.username}</span>
            <span class="gold-text">Slot #${entry.slot}</span>
        </div>
    `).join('');

    res.send(`
        <html>${UI_CSS}<body>
            <nav><div>SOLITUDE <span class="gold-text">AJO</span></div> <div>Login | Dashboard</div></nav>
            <div style="padding: 50px; max-width: 800px; margin: auto;">
                <h1 class="gold-text">Global Leaderboard</h1>
                <div class="glass-card">${board || 'No active slots yet.'}</div>
                <h2 style="margin-top:40px;">Available Groups</h2>
                <div class="glass-card">
                    ${data.groups.map(g => `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <h3>${g.name} <span style="font-size:12px;" class="gold-text">[${g.tier}]</span></h3>
                                <p>Payout: ₦${g.payout.toLocaleString()} | ${g.schedule}</p>
                            </div>
                            <button class="btn-gold" onclick="location.href='/group/${g.id}'">View Details</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </body></html>
    `);
});

// Group Page (Slot System)
app.get('/group/:id', (req, res) => {
    const data = db();
    const group = data.groups.find(g => g.id === req.params.id);
    let slotsHtml = '';
    for(let i=1; i<=100; i++) {
        const isTaken = group.slots.includes(i);
        slotsHtml += `<div class="slot ${isTaken ? 'taken' : 'available'}" onclick="${isTaken ? '' : `selectSlot(${i})`}">${i}</div>`;
    }

    res.send(`
        <html>${UI_CSS}<body>
            <div style="padding: 40px;">
                <h1 class="gold-text">${group.name}</h1>
                <p class="glass-card" style="border-left: 4px solid var(--gold);">${group.billboard}</p>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                    <div class="glass-card">
                        <h3>Select Your Payout Slot</h3>
                        <div class="slot-grid">${slotsHtml}</div>
                    </div>
                    <div class="glass-card">
                        <h3>Group Terms</h3>
                        <p>Contribution: ₦${group.contribution.toLocaleString()}</p>
                        <p>Total Payout: ₦${group.payout.toLocaleString()}</p>
                        <hr>
                        <button class="btn-gold" style="width:100%" onclick="showTerms()">JOIN GROUP</button>
                    </div>
                </div>
            </div>
            <script>
                function showTerms() {
                    if(confirm("Do you agree to the Terms & Conditions of Solitude Ajo?")) {
                        alert("Slot Locked for 10 minutes. Please complete first payment.");
                    }
                }
            </script>
        </body></html>
    `);
});

// Admin Dashboard (Analytics)
app.get('/admin', (req, res) => {
    const data = db();
    const totalRev = data.transactions.filter(t => t.status === 'approved').reduce((a, b) => a + b.amount, 0);
    
    res.send(`
        <html>${UI_CSS}<body>
            <div style="padding: 40px;">
                <h1 class="gold-text">Admin Command Center</h1>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                    <div class="glass-card"><h4>Total Platform Revenue</h4><h2>₦${totalRev.toLocaleString()}</h2></div>
                    <div class="glass-card"><h4>Active Users</h4><h2>${data.users.length}</h2></div>
                    <div class="glass-card"><h4>Pending Approvals</h4><h2>${data.transactions.filter(t => t.status === 'pending').length}</h2></div>
                </div>
                
                <h3 style="margin-top:40px;">Transaction Records</h3>
                <div class="glass-card">
                    <table style="width:100%; text-align:left;">
                        <tr style="color:var(--gold)"><th>Code</th><th>User</th><th>Amount</th><th>Status</th></tr>
                        ${data.transactions.map(t => `
                            <tr><td>${t.code}</td><td>${t.username}</td><td>₦${t.amount}</td><td>${t.status}</td></tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        </body></html>
    `);
});

// --- AUTOMATION: PAYMENT REMINDERS ---
setInterval(() => {
    console.log("Solitude Ajo Engine: Checking for daily pending payments...");
    // Logic to push notification objects into notifications array for users with missing daily payments
}, 86400000); // Runs every 24 hours

app.listen(3000, () => console.log("SOLITUDE AJO ACTIVE ON PORT 3000"));
