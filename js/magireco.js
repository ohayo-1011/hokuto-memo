/**
 * マギアレコード専用ロジック
 */

const MagirecoApp = {
    // マギアレコード用UI更新
    updateUI() {
        const s = App.session;

        // ゲーム数
        document.getElementById('mgTotalGames').value = s.totalGames;

        // AT回数
        document.getElementById('mgAtCount').textContent = s.atCount || 0;

        // 小役カウント
        document.getElementById('mgWeakCherryCount').textContent = s.roleCount.weakCherry;
        document.getElementById('mgWatermelonCount').textContent = s.roleCount.watermelon;

        // 確率表示
        this.updateProbabilities();

        // CZ
        document.getElementById('mgCzCount').textContent = s.czCount;
        document.getElementById('mgCzSuccess').textContent = s.czSuccess;
        const czRate = s.czCount > 0 ? Math.round((s.czSuccess / s.czCount) * 100) : 0;
        document.getElementById('mgCzRate').textContent = s.czCount > 0 ? `${czRate}%` : '--';

        // ゾーン
        document.getElementById('mgZoneUnder100').textContent = s.zoneWins.under100;
        document.getElementById('mgZoneG200').textContent = s.zoneWins.g200;
        document.getElementById('mgZoneG300').textContent = s.zoneWins.g300;
        document.getElementById('mgZoneOver400').textContent = s.zoneWins.over400;

        // 終了画面
        document.getElementById('mgEndKyubey').textContent = s.endScreens.bigBonus.kyubey;
        document.getElementById('mgEndSeason1').textContent = s.endScreens.bigBonus.season1;
        document.getElementById('mgEndSeason2').textContent = s.endScreens.bigBonus.season2;
        document.getElementById('mgEndMomoko').textContent = s.endScreens.bigBonus.momoko;
    },

    // 確率更新
    updateProbabilities() {
        const games = App.session.totalGames;

        const calcProb = (count) => {
            if (count === 0 || games === 0) return '--';
            return `1/${(games / count).toFixed(1)}`;
        };

        document.getElementById('mgWeakCherryProb').textContent = calcProb(App.session.roleCount.weakCherry);
        document.getElementById('mgWatermelonProb').textContent = calcProb(App.session.roleCount.watermelon);
    },

    // イベントリスナー設定
    setupEventListeners() {
        // ゲーム数
        document.getElementById('mgTotalGames').addEventListener('input', (e) => {
            App.session.totalGames = parseInt(e.target.value) || 0;
            App.save();
            this.updateProbabilities();
        });

        document.getElementById('mgGamesPlus').addEventListener('click', () => {
            App.session.totalGames += 100;
            App.save();
            this.updateUI();
        });

        document.getElementById('mgGamesMinus').addEventListener('click', () => {
            App.session.totalGames = Math.max(0, App.session.totalGames - 100);
            App.save();
            this.updateUI();
        });

        // 小役カウンター
        this.setupCounter('mgWeakCherry', 'weakCherry');
        this.setupCounter('mgWatermelon', 'watermelon');

        // CZ
        this.setupCounter('czCount', 'czCount');
        this.setupCounter('czSuccess', 'czSuccess');

        // ゾーン
        document.querySelectorAll('.zone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const zone = e.currentTarget.dataset.zone;
                App.session.zoneWins[zone]++;
                App.session.atCount++;
                App.save();
                this.updateUI();
                App.showToast('ゾーン当選を記録');
            });
        });

        // 終了画面
        document.querySelectorAll('.ending-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screen = e.currentTarget.dataset.screen;
                App.session.endScreens.bigBonus[screen]++;
                App.save();
                this.updateUI();
                App.showToast('終了画面を記録');
            });
        });
    },

    setupCounter(btnRole, dataKey) {
        const plusBtn = document.querySelector(`[data-role="${btnRole}"].plus`);
        const minusBtn = document.querySelector(`[data-role="${btnRole}"].minus`);

        if (plusBtn) {
            plusBtn.addEventListener('click', () => {
                if (dataKey === 'czCount' || dataKey === 'czSuccess') {
                    App.session[dataKey]++;
                } else {
                    App.session.roleCount[dataKey]++;
                }
                App.save();
                this.updateUI();
            });
        }

        if (minusBtn) {
            minusBtn.addEventListener('click', () => {
                if (dataKey === 'czCount' || dataKey === 'czSuccess') {
                    App.session[dataKey] = Math.max(0, App.session[dataKey] - 1);
                } else {
                    App.session.roleCount[dataKey] = Math.max(0, App.session.roleCount[dataKey] - 1);
                }
                App.save();
                this.updateUI();
            });
        }
    }
};
