/**
 * LocalStorageラッパー
 */

const Storage = {
    SESSIONS_KEY: 'hokuto_sessions',
    CURRENT_KEY: 'hokuto_current',

    // セッション一覧を取得
    getSessions() {
        const data = localStorage.getItem(this.SESSIONS_KEY);
        return data ? JSON.parse(data) : [];
    },

    // セッション一覧を保存
    saveSessions(sessions) {
        localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    },

    // 現在の実戦データを取得
    getCurrentSession() {
        const data = localStorage.getItem(this.CURRENT_KEY);
        if (data) {
            return JSON.parse(data);
        }
        return this.createNewSession();
    },

    // 現在の実戦データを保存
    saveCurrentSession(session) {
        localStorage.setItem(this.CURRENT_KEY, JSON.stringify(session));
    },

    // 新しいセッションを作成
    createNewSession(hallName = '', machineNumber = '', machineType = 'hokuto') {
        const now = new Date();
        const baseSession = {
            id: `session_${now.getTime()}`,
            date: now.toISOString().split('T')[0],
            startTime: now.toTimeString().slice(0, 5),
            endTime: null,
            hallName,
            machineNumber,
            machineType,
            totalGames: 0,
            memo: ''
        };

        if (machineType === 'magireco') {
            return {
                ...baseSession,
                czCount: 0,
                czSuccess: 0,
                atCount: 0,
                roleCount: {
                    weakCherry: 0,
                    strongCherry: 0,
                    watermelon: 0,
                    chance: 0
                },
                zoneWins: {
                    under100: 0,
                    g200: 0,
                    g300: 0,
                    over400: 0
                },
                endScreens: {
                    bigBonus: {
                        kyubey: 0,
                        season1: 0,
                        season2: 0,
                        momoko: 0,
                        tsuruno: 0,
                        other: 0
                    },
                    at: {
                        madokaIroha: 0,
                        magius: 0,
                        mikazuki: 0,
                        other: 0
                    }
                }
            };
        }

        // 北斗の拳（既存）
        return {
            ...baseSession,
            triggers: [],
            roleCount: {
                bell: 0,
                weakCherry: 0,
                watermelon: 0
            },
            checklist: {
                bell: false,
                at: false,
                mode: false
            }
        };
    },

    // セッションを履歴に保存
    saveToHistory(session) {
        session.endTime = new Date().toTimeString().slice(0, 5);
        const sessions = this.getSessions();

        // 既存のセッションを更新または新規追加
        const existingIndex = sessions.findIndex(s => s.id === session.id);
        if (existingIndex >= 0) {
            sessions[existingIndex] = session;
        } else {
            sessions.unshift(session);
        }

        this.saveSessions(sessions);
        this.clearCurrentSession();
    },

    // 現在のセッションをクリア
    clearCurrentSession() {
        localStorage.removeItem(this.CURRENT_KEY);
    },

    // セッションを削除
    deleteSession(sessionId) {
        const sessions = this.getSessions();
        const filtered = sessions.filter(s => s.id !== sessionId);
        this.saveSessions(filtered);
    },

    // セッションを取得
    getSession(sessionId) {
        const sessions = this.getSessions();
        return sessions.find(s => s.id === sessionId);
    }
};
