/**
 * Blackjack Stats - Persistence
 */

const STATS_KEY = 'blackjack_stats';

const defaultStats = {
    handsPlayed: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    blackjacks: 0,
    busts: 0,
    doubles: 0,
    splits: 0,
    surrenders: 0,
    bankroll: 1000,
    netProfit: 0,
    longestStreak: 0,
    currentStreak: 0
};

class StatsManager {
    constructor() {
        this.stats = this.load();
    }

    load() {
        const saved = localStorage.getItem(STATS_KEY);
        if (!saved) return { ...defaultStats };
        try {
            const parsed = JSON.parse(saved);
            // Schema migration: fill in any fields missing from older saves
            return { ...defaultStats, ...parsed };
        } catch (e) {
            console.warn('Stats data corrupted, resetting to defaults.', e);
            return { ...defaultStats };
        }
    }

    save() {
        localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
    }

    recordResult(result, amount, isBlackjack = false, isBust = false) {
        this.stats.handsPlayed++;
        if (isBlackjack) this.stats.blackjacks++;
        if (isBust) this.stats.busts++;

        if (result === 'win') {
            this.stats.wins++;
            this.stats.currentStreak++;
            this.stats.netProfit += amount;
            if (this.stats.currentStreak > this.stats.longestStreak) {
                this.stats.longestStreak = this.stats.currentStreak;
            }
        } else if (result === 'loss') {
            this.stats.losses++;
            this.stats.currentStreak = 0;
            this.stats.netProfit -= amount;
        } else {
            // Push: do not break an active win streak
            this.stats.pushes++;
        }

        this.save();
    }

    updateBankroll(amount) {
        this.stats.bankroll = amount;
        this.save();
    }

    increment(field) {
        if (field in this.stats) {
            this.stats[field]++;
            this.save();
        }
    }

    reset() {
        this.stats = { ...defaultStats };
        this.save();
    }
}

window.Stats = new StatsManager();
