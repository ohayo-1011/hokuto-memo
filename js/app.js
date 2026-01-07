/**
 * 北斗メモ メインアプリケーション
 */

const App = {
    session: null,
    currentMode: 'normal',
    selectedHistoryId: null,
    minusHoldTimer: null,

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

    // モード名マップ
    modeNames: {
        normal: '通常',
        heaven: '天国',
        hell: '地獄'
    },

    init() {
        console.log('🌟 北斗メモ 初期化...');

        // Service Worker登録
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => {
                console.warn('SW registration failed:', err);
            });
        }

        // セッション読み込み
        this.session = Storage.getCurrentSession();

        // イベントリスナー設定
        this.setupEventListeners();

        // UI更新
        this.updateUI();
        this.loadHistory();

        console.log('✅ 初期化完了');
    },

    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // ゲーム数入力
        document.getElementById('totalGames').addEventListener('input', (e) => {
            this.session.totalGames = parseInt(e.target.value) || 0;
            this.save();
            this.updateProbabilities();
            this.updateExpectation();
        });

        document.getElementById('gamesPlus').addEventListener('click', () => {
            this.session.totalGames += 100;
            this.save();
            this.updateUI();
        });

        document.getElementById('gamesMinus').addEventListener('click', () => {
            this.session.totalGames = Math.max(0, this.session.totalGames - 100);
            this.save();
            this.updateUI();
        });

        // モード選択
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = e.target.dataset.mode;
            });
        });

        // 当選契機ボタン
        document.querySelectorAll('.trigger-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const trigger = e.currentTarget.dataset.trigger;
                this.addTrigger(trigger);
            });
        });

        // 小役カウンター
        document.querySelectorAll('.counter-btn').forEach(btn => {
            const role = btn.dataset.role;
            const action = btn.dataset.action;

            if (action === 'plus') {
                btn.addEventListener('click', () => {
                    this.session.roleCount[role]++;
                    this.save();
                    this.updateUI();
                });
            } else {
                // マイナスは長押し
                btn.addEventListener('mousedown', () => this.startMinus(role));
                btn.addEventListener('mouseup', () => this.stopMinus());
                btn.addEventListener('mouseleave', () => this.stopMinus());
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.startMinus(role);
                });
                btn.addEventListener('touchend', () => this.stopMinus());
            }
        });

        // 新規セッション
        document.getElementById('newSessionBtn').addEventListener('click', () => {
            document.getElementById('newSessionModal').classList.add('active');
        });

        document.getElementById('closeNewSession').addEventListener('click', () => {
            document.getElementById('newSessionModal').classList.remove('active');
        });

        document.getElementById('cancelNewSession').addEventListener('click', () => {
            document.getElementById('newSessionModal').classList.remove('active');
        });

        document.getElementById('confirmNewSession').addEventListener('click', () => {
            const hallName = document.getElementById('hallName').value;
            const machineNumber = document.getElementById('machineNumber').value;
            this.startNewSession(hallName, machineNumber);
            document.getElementById('newSessionModal').classList.remove('active');
        });

        // 履歴ボタン
        document.getElementById('historyBtn').addEventListener('click', () => {
            this.switchTab('history');
        });

        // セッション保存
        document.getElementById('saveSession').addEventListener('click', () => {
            this.saveSessionToHistory();
        });

        // チェックリスト
        document.getElementById('checkBell').addEventListener('change', (e) => {
            this.session.checklist.bell = e.target.checked;
            this.save();
        });
        document.getElementById('checkAT').addEventListener('change', (e) => {
            this.session.checklist.at = e.target.checked;
            this.save();
        });
        document.getElementById('checkMode').addEventListener('change', (e) => {
            this.session.checklist.mode = e.target.checked;
            this.save();
        });
        document.getElementById('sessionMemo').addEventListener('input', (e) => {
            this.session.memo = e.target.value;
            this.save();
        });

        // 履歴モーダル
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('historyModal').classList.remove('active');
        });

        document.getElementById('deleteSession').addEventListener('click', () => {
            if (this.selectedHistoryId && confirm('この実戦データを削除しますか？')) {
                Storage.deleteSession(this.selectedHistoryId);
                document.getElementById('historyModal').classList.remove('active');
                this.loadHistory();
                this.showToast('削除しました');
            }
        });
    },

    // 長押しマイナス
    startMinus(role) {
        if (this.session.roleCount[role] > 0) {
            this.session.roleCount[role]--;
            this.save();
            this.updateUI();
        }

        this.minusHoldTimer = setTimeout(() => {
            this.minusInterval = setInterval(() => {
                if (this.session.roleCount[role] > 0) {
                    this.session.roleCount[role]--;
                    this.save();
                    this.updateUI();
                }
            }, 100);
        }, 500);
    },

    stopMinus() {
        clearTimeout(this.minusHoldTimer);
        clearInterval(this.minusInterval);
    },

    // タブ切り替え
    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });

        if (tab === 'triggers') {
            this.updateTriggerHistory();
        } else if (tab === 'summary') {
            this.updateSummary();
        } else if (tab === 'history') {
            this.loadHistory();
        }
    },

    // 当選契機追加
    addTrigger(type) {
        const trigger = {
            type,
            mode: this.currentMode,
            time: new Date().toTimeString().slice(0, 5),
            games: this.session.totalGames
        };

        this.session.triggers.push(trigger);
        this.save();
        this.updateUI();

        const modeName = this.modeNames[this.currentMode];
        this.showToast(`${this.triggerNames[type]}（${modeName}）を記録`);
    },

    // 当選履歴更新
    updateTriggerHistory() {
        const container = document.getElementById('triggerHistoryList');
        const triggers = this.session.triggers;

        if (triggers.length === 0) {
            container.innerHTML = '<p class="empty-message">まだ当選データがありません</p>';
            return;
        }

        container.innerHTML = triggers.map((t, i) => {
            const modeClass = t.mode === 'heaven' ? 'mode-heaven' : t.mode === 'hell' ? 'mode-hell' : '';
            return `
            <div class="trigger-history-item ${modeClass}">
                <div class="trigger-num">${i + 1}回目</div>
                <div class="trigger-info">
                    <div class="trigger-type">${this.triggerNames[t.type] || t.type}</div>
                    <div class="trigger-meta">${t.time} / ${t.games.toLocaleString()}G時点</div>
                </div>
                <span class="trigger-mode ${t.mode}">${this.modeNames[t.mode] || '通常'}</span>
            </div>
            `;
        }).join('');
    },

    // 新規セッション開始
    startNewSession(hallName, machineNumber) {
        // 現在のセッションを保存するか確認
        if (this.session.triggers.length > 0 || this.session.totalGames > 0) {
            if (confirm('現在の実戦データを保存しますか？')) {
                this.saveSessionToHistory();
            }
        }

        this.session = Storage.createNewSession(hallName, machineNumber);
        this.currentMode = 'normal';
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === 'normal');
        });

        this.save();
        this.updateUI();
        this.switchTab('main');
        this.showToast('新しい実戦を開始しました');
    },

    // セッションを履歴に保存
    saveSessionToHistory() {
        if (this.session.triggers.length === 0 && this.session.totalGames === 0) {
            this.showToast('データがありません');
            return;
        }

        Storage.saveToHistory(this.session);
        this.session = Storage.createNewSession();
        this.save();
        this.updateUI();
        this.loadHistory();
        this.showToast('保存しました');
    },

    // データ保存
    save() {
        Storage.saveCurrentSession(this.session);
    },

    // UI更新
    updateUI() {
        // ゲーム数
        document.getElementById('totalGames').value = this.session.totalGames;

        // AT回数
        document.getElementById('atCount').textContent = this.session.triggers.length;

        // 小役カウント
        document.getElementById('bellCount').textContent = this.session.roleCount.bell;
        document.getElementById('weakCherryCount').textContent = this.session.roleCount.weakCherry;
        document.getElementById('watermelonCount').textContent = this.session.roleCount.watermelon;

        this.updateProbabilities();
        this.updateExpectation();
    },

    // 確率更新
    updateProbabilities() {
        const games = this.session.totalGames;

        const calcProb = (count) => {
            if (count === 0 || games === 0) return '--';
            return `1/${(games / count).toFixed(1)}`;
        };

        document.getElementById('bellProb').textContent = calcProb(this.session.roleCount.bell);
        document.getElementById('weakCherryProb').textContent = calcProb(this.session.roleCount.weakCherry);
        document.getElementById('watermelonProb').textContent = calcProb(this.session.roleCount.watermelon);
    },

    // 期待度メーター更新
    updateExpectation() {
        const games = this.session.totalGames;
        const bells = this.session.roleCount.bell;
        const bar = document.getElementById('expectationBar');
        const label = document.getElementById('expectationLabel');

        if (games < 500 || bells === 0) {
            bar.style.setProperty('--meter-width', '0%');
            bar.style.setProperty('--meter-color', '#6b7280');
            label.textContent = '--';
            return;
        }

        const prob = games / bells;

        // 1/38未満 = 高, 1/38~1/45 = 中, 1/45以上 = 低
        let width, color, text;

        if (prob < 38) {
            width = 100;
            color = '#10b981';
            text = '高';
        } else if (prob < 45) {
            width = 60;
            color = '#f59e0b';
            text = '中';
        } else {
            width = 30;
            color = '#ef4444';
            text = '低';
        }

        bar.style.setProperty('--meter-width', `${width}%`);
        bar.style.setProperty('--meter-color', color);
        label.textContent = text;
    },

    // サマリー更新
    updateSummary() {
        const session = this.session;

        document.getElementById('summaryGames').textContent = `${session.totalGames.toLocaleString()} G`;
        document.getElementById('summaryAT').textContent = `${session.triggers.length} 回`;

        if (session.triggers.length > 0 && session.totalGames > 0) {
            const prob = session.totalGames / session.triggers.length;
            document.getElementById('summaryATProb').textContent = `1/${prob.toFixed(0)}`;
        } else {
            document.getElementById('summaryATProb').textContent = '--';
        }

        // 契機グラフ
        Charts.renderTriggerChart('triggerChart', session.triggers);

        // 契機内訳
        this.renderTriggerBreakdown(session.triggers);

        // モード内訳
        this.renderModeBreakdown(session.triggers);

        // 確率一覧
        this.renderProbList(session);

        // チェックリスト
        document.getElementById('checkBell').checked = session.checklist?.bell || false;
        document.getElementById('checkAT').checked = session.checklist?.at || false;
        document.getElementById('checkMode').checked = session.checklist?.mode || false;
        document.getElementById('sessionMemo').value = session.memo || '';
    },

    // 契機内訳表示
    renderTriggerBreakdown(triggers) {
        const container = document.getElementById('triggerBreakdown');
        const counts = {};

        triggers.forEach(t => {
            counts[t.type] = (counts[t.type] || 0) + 1;
        });

        if (Object.keys(counts).length === 0) {
            container.innerHTML = '<p class="empty-message">データなし</p>';
            return;
        }

        container.innerHTML = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `
        <div class="breakdown-item">
          <span>${this.triggerNames[type] || type}</span>
          <span>${count}回</span>
        </div>
      `).join('');
    },

    // モード内訳表示
    renderModeBreakdown(triggers) {
        const container = document.getElementById('modeBreakdown');
        const counts = { normal: 0, heaven: 0, hell: 0 };

        triggers.forEach(t => {
            counts[t.mode || 'normal']++;
        });

        const total = triggers.length;
        if (total === 0) {
            container.innerHTML = '<p class="empty-message">データなし</p>';
            return;
        }

        container.innerHTML = Object.entries(counts)
            .map(([mode, count]) => `
        <div class="breakdown-item">
          <span>${this.modeNames[mode]}</span>
          <span>${count}回（${Math.round(count / total * 100)}%）</span>
        </div>
      `).join('');
    },

    // 確率一覧表示
    renderProbList(session) {
        const container = document.getElementById('probList');
        const games = session.totalGames;

        const calcProb = (count) => {
            if (count === 0 || games === 0) return '--';
            return `1/${(games / count).toFixed(1)}`;
        };

        container.innerHTML = `
      <div class="prob-item">
        <span>🔔 共通ベル</span>
        <span>${calcProb(session.roleCount.bell)}</span>
      </div>
      <div class="prob-item">
        <span>🍒 弱チェリー</span>
        <span>${calcProb(session.roleCount.weakCherry)}</span>
      </div>
      <div class="prob-item">
        <span>🍉 スイカ</span>
        <span>${calcProb(session.roleCount.watermelon)}</span>
      </div>
    `;
    },

    // 履歴読み込み
    loadHistory() {
        const container = document.getElementById('historyList');
        const sessions = Storage.getSessions();

        if (sessions.length === 0) {
            container.innerHTML = '<p class="empty-message">まだ実戦データがありません</p>';
            return;
        }

        container.innerHTML = sessions.map(s => `
      <div class="history-item" data-id="${s.id}">
        <div class="history-date">${s.date} ${s.startTime}〜${s.endTime || ''}</div>
        <div class="history-info">
          ${s.hallName ? s.hallName + ' ' : ''}${s.machineNumber ? 'No.' + s.machineNumber : ''}
          | ${s.totalGames.toLocaleString()}G | AT ${s.triggers.length}回
        </div>
      </div>
    `).join('');

        // クリックイベント
        container.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showHistoryDetail(item.dataset.id);
            });
        });
    },

    // 履歴詳細表示
    showHistoryDetail(sessionId) {
        const session = Storage.getSession(sessionId);
        if (!session) return;

        this.selectedHistoryId = sessionId;

        document.getElementById('modalTitle').textContent =
            `${session.date} ${session.startTime}〜${session.endTime || ''}`;

        // 契機カウント
        const triggerCounts = {};
        session.triggers.forEach(t => {
            triggerCounts[t.type] = (triggerCounts[t.type] || 0) + 1;
        });

        const triggerList = Object.entries(triggerCounts)
            .map(([type, count]) => `${this.triggerNames[type] || type}: ${count}回`)
            .join('<br>');

        const calcProb = (count) => {
            if (count === 0 || session.totalGames === 0) return '--';
            return `1/${(session.totalGames / count).toFixed(1)}`;
        };

        document.getElementById('modalBody').innerHTML = `
      <div class="detail-section">
        <strong>基本情報</strong><br>
        ${session.hallName ? 'ホール: ' + session.hallName + '<br>' : ''}
        ${session.machineNumber ? '台番: ' + session.machineNumber + '<br>' : ''}
        総ゲーム数: ${session.totalGames.toLocaleString()}G<br>
        AT回数: ${session.triggers.length}回
      </div>
      <div class="detail-section" style="margin-top: 12px;">
        <strong>当選契機</strong><br>
        ${triggerList || 'なし'}
      </div>
      <div class="detail-section" style="margin-top: 12px;">
        <strong>小役確率</strong><br>
        共通ベル: ${calcProb(session.roleCount.bell)}<br>
        弱チェリー: ${calcProb(session.roleCount.weakCherry)}<br>
        スイカ: ${calcProb(session.roleCount.watermelon)}
      </div>
      ${session.memo ? `
      <div class="detail-section" style="margin-top: 12px;">
        <strong>メモ</strong><br>
        ${session.memo}
      </div>
      ` : ''}
    `;

        document.getElementById('historyModal').classList.add('active');
    },

    // トースト表示
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
};

// アプリ初期化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
