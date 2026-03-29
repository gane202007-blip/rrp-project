// ================= AUTH CHECK (RUN ON ALL PAGES) =================
async function checkLogin() {
    const res = await fetch('/data', {
        credentials: 'include'
    });

    if (res.status === 401) {
        window.location.href = 'login.html';
    }
}

checkLogin();
(async () => {
    try {
        const res = await fetch('/me');
        const data = await res.json();

        const isLoginPage = window.location.pathname.includes('login.html');

        if (!data.loggedIn && !isLoginPage) {
            window.location = 'login.html';
        }

        // Show username if exists
        if (data.loggedIn && document.getElementById('username')) {
            document.getElementById('username').innerText =
                data.name + " (" + data.role + ")";
        }

    } catch (err) {
        console.log("Auth check error:", err);
    }
})();


// ================= FORM SUBMIT =================
const form = document.getElementById('form');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            plastic_type: document.getElementById('type').value,
            weight: parseFloat(document.getElementById('weight').value),
            collection_point: document.getElementById('point').value,
            date: document.getElementById('date').value
        };

        try {
            const res = await fetch('/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const text = await res.text();
            alert("✅ " + text);

            form.reset();
        } catch (err) {
            alert("Error adding data");
        }
    });
}


// ================= DASHBOARD =================
async function loadDashboard() {

    const res = await fetch('/data');
    let data = await res.json();

    // FILTER BY DATE
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    if (start && end) {
        data = data.filter(d => d.date >= start && d.date <= end);
    }

    let total = 0;
    let types = { PET: 0, HDPE: 0, LDPE: 0, Mixed: 0 };
    let monthly = {};

    data.forEach(d => {
        total += d.weight;

        types[d.plastic_type] += d.weight;

        // MONTH GROUPING
        const month = d.date.substring(0, 7); // YYYY-MM

        if (!monthly[month]) monthly[month] = 0;
        monthly[month] += d.weight;
    });

    // MAIN STATS
    document.getElementById('total').innerText = total.toFixed(2);
    document.getElementById('bricks').innerText = Math.floor(total * 10);
    document.getElementById('road').innerText = (total * 2).toFixed(2);
    document.getElementById('co2').innerText = (total * 1.5).toFixed(2);

    // PIE CHART
    new Chart(document.getElementById('chart'), {
        type: 'pie',
        data: {
            labels: Object.keys(types),
            datasets: [{ data: Object.values(types) }]
        }
    });

    // BAR CHART (Monthly Trends)
    new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(monthly),
            datasets: [{
                label: 'Plastic Collected (kg)',
                data: Object.values(monthly)
            }]
        }
    });

    // EXTRA INSIGHTS
    showInsights(data, total, types);
}

// ================= DOWNLOAD =================
function download() {
    window.location.href = '/download';
}
function showInsights(data, total, types) {
    document.getElementById('topType').innerText = maxType;
document.getElementById('avgDay').innerText = avg;

    // Top plastic type
    let maxType = Object.keys(types).reduce((a, b) =>
        types[a] > types[b] ? a : b
    );

    // Avg per day
    let days = new Set(data.map(d => d.date)).size;
    let avg = days ? (total / days).toFixed(2) : 0;

    console.log("Top Plastic:", maxType);
    console.log("Avg per day:", avg);
}
