/**
 * グラフ描画モジュール
 */

const Charts = {
    triggerChart: null,

    // 契機カラーマップ
    triggerColors: {
        mystery: '#6b7280',
        weak_cherry: '#ec4899',
        weak_watermelon: '#34d399',
        strong_watermelon: '#10b981',
        mid_cherry: '#ef4444',
        chance: '#f59e0b',
        ceiling: '#8b5cf6'
    },

    // 契機名マップ
    triggerNames: {
        mystery: '謎当たり',
        weak_cherry: '弱チェリー',
        weak_watermelon: '弱スイカ',
        strong_watermelon: '強スイカ',
        mid_cherry: '中段チェリー',
        chance: 'チャンス目',
        ceiling: '天井'
    },

    // 契機円グラフを描画
    renderTriggerChart(canvasId, triggers) {
        if (this.triggerChart) {
            this.triggerChart.destroy();
        }

        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        // 契機をカウント
        const counts = {};
        triggers.forEach(t => {
            counts[t.type] = (counts[t.type] || 0) + 1;
        });

        const labels = Object.keys(counts).map(k => this.triggerNames[k] || k);
        const data = Object.values(counts);
        const colors = Object.keys(counts).map(k => this.triggerColors[k] || '#888');

        if (data.length === 0) {
            return;
        }

        this.triggerChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#9ca3af',
                            font: { size: 11 },
                            boxWidth: 12,
                            padding: 8
                        }
                    }
                }
            }
        });
    }
};
