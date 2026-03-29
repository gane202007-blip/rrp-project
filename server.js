// ================= AUTH =================

// LOGIN
async function login() {
    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            })
        });

        const data = await res.json();

        alert(data.message);

        if (res.ok) {
            if (data.role === 'admin') {
                window.location = 'dashboard.html';
            } else {
                window.location = 'index.html';
            }
        }
    } catch (err) {
        alert("Login error");
        console.error(err);
    }
}


// SIGNUP
async function signup() {
    try {
        const res = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('name').value,
                email: document.getElementById('email2').value,
                password: document.getElementById('password2').value
            })
        });

        const text = await res.text();
        alert(text);
    } catch (err) {
        alert("Signup error");
        console.error(err);
    }
}


// ================= ADD DATA =================

const form = document.getElementById('form');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const res = await fetch('/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plastic_type: document.getElementById('type').value,
                    weight: parseFloat(document.getElementById('weight').value),
                    collection_point: document.getElementById('point').value,
                    date: document.getElementById('date').value
                })
            });

            const text = await res.text();
            alert("✅ " + text);

            form.reset();

        } catch (err) {
            alert("Error adding data");
            console.error(err);
        }
    });
}


// ================= DASHBOARD =================

let pieChart = null;
let barChart = null;

async function loadDashboard() {
    try {
        const res = await fetch('/data');
        let data = await res.json();

        // DATE FILTER
        const start = document.getElementById('startDate')?.value;
        const end = document.getElementById('endDate')?.value;

        if (start && end) {
            data = data.filter(d => d.date >= start && d.date <= end);
        }

        let total = 0;
        let types = { PET: 0, HDPE: 0, LDPE: 0, Mixed: 0 };
        let monthly = {};

        data.forEach(d => {
            total += d.weight;

            if (types[d.plastic_type] !== undefined) {
                types[d.plastic_type] += d.weight;
            }

            // GROUP BY MONTH
            const month = d.date.substring(0, 7);

            if (!monthly[month]) monthly[month] = 0;
            monthly[month] += d.weight;
        });

        // UPDATE STATS
        document.getElementById('total').innerText = total.toFixed(2);
        document.getElementById('bricks').innerText = Math.floor(total * 10);
        document.getElementById('road').innerText = (total * 2).toFixed(2);
        document.getElementById('co2').innerText = (total * 1.5).toFixed(2);

        // DESTROY OLD CHARTS (IMPORTANT)
        if (pieChart) pieChart.destroy();
        if (barChart) barChart.destroy();

        // PIE CHART
        pieChart = new Chart(document.getElementById('chart'), {
            type: 'pie',
            data: {
                labels: Object.keys(types),
                datasets: [{
                    data: Object.values(types)
                }]
            }
        });

        // BAR CHART
        barChart = new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(monthly),
                datasets: [{
                    label: 'Plastic Collected (kg)',
                    data: Object.values(monthly)
                }]
            }
        });

        // INSIGHTS
        showInsights(data, total, types);

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}


// ================= INSIGHTS =================

function showInsights(data, total, types) {

    if (data.length === 0) {
        document.getElementById('topType').innerText = "N/A";
        document.getElementById('avgDay').innerText = "0";
        return;
    }

    // TOP TYPE
    let maxType = Object.keys(types).reduce((a, b) =>
        types[a] > types[b] ? a : b
    );

    // AVG PER DAY
    let uniqueDays = new Set(data.map(d => d.date)).size;
    let avg = (total / uniqueDays).toFixed(2);

    // UPDATE UI
    document.getElementById('topType').innerText = maxType;
    document.getElementById('avgDay').innerText = avg;
}


// ================= DOWNLOAD =================

function download() {
    window.location.href = '/download';
}


// ================= AUTO LOAD =================

if (document.getElementById('chart')) {
    loadDashboard();
}
