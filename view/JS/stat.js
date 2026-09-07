document.addEventListener("DOMContentLoaded", () => {
    const totalPV = document.getElementById('totalPV')
    const totalUV = document.getElementById('totalUV')
    const todayPV = document.getElementById('todayPV')
    const todayUV = document.getElementById('todayUV')
    const historyBody = document.getElementById('historyBody')
    const toggleHistory = document.getElementById('toggleHistory')
    const historyTable = document.getElementById('historyTable')
    const detailsBody = document.getElementById('detailsBody')
    const toggleDetails = document.getElementById('toggleDetails')
    const detailsTable = document.getElementById('detailsTable')

    if (toggleHistory && historyTable) {
        toggleHistory.addEventListener('click', () => {
            const visible = historyTable.style.display !== 'none'
            historyTable.style.display = visible ? 'none' : 'block'
        })
    }

    if (toggleDetails && detailsTable) {
        toggleDetails.addEventListener('click', () => {
            const visible = detailsTable.style.display !== 'none'
            detailsTable.style.display = visible ? 'none' : 'block'
            if (!visible) loadDetails()
        })
    }

    loadStats()
    if (detailsTable) loadDetails()

    async function loadStats() {
        try {
            const resp = await API.get('/stats')
            if (!resp.data) return

            const d = resp.data
            if (totalPV) totalPV.textContent = d.total.pv.toLocaleString()
            if (totalUV) totalUV.textContent = d.total.uv.toLocaleString()
            if (todayPV) todayPV.textContent = d.today.pv.toLocaleString()
            if (todayUV) todayUV.textContent = d.today.uv.toLocaleString()

            if (historyBody && d.history && d.history.length > 0) {
                historyBody.innerHTML = d.history.map(r =>
                    `<tr><td>${r.date}</td><td>${r.pv.toLocaleString()}</td><td>${r.uv.toLocaleString()}</td></tr>`
                ).join('')
            }
        } catch (e) {
            console.error('load stats failed', e)
        }
    }

    async function loadDetails() {
        if (!detailsBody) return
        try {
            const resp = await API.get('/stats/details?page=1&page_size=50')
            const items = (resp.data && resp.data.items) || []
            detailsBody.innerHTML = items.map(r => {
                const time = r.created_at ? new Date(r.created_at).toLocaleString() : r.date
                return `<tr><td>${time}</td><td>${r.ip}</td><td>${r.path || '-'}</td></tr>`
            }).join('') || '<tr><td colspan="3">No data</td></tr>'
        } catch (e) {
            console.error('load details failed', e)
            detailsBody.innerHTML = '<tr><td colspan="3">Load failed</td></tr>'
        }
    }
})
