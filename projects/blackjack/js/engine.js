/**
 * Blackjack Engine - Pure Logic
 */

class Card {
    constructor(suit, rank) {
        this.suit = suit; // 'H', 'D', 'C', 'S'
        this.rank = rank; // 'A', '2'-'10', 'J', 'Q', 'K'
        this.isHidden = false;
    }

    get value() {
        if (['J', 'Q', 'K'].includes(this.rank)) return 10;
        if (this.rank === 'A') return 11;
        return parseInt(this.rank);
    }

    get imagePath() {
        if (this.isHidden) return 'assets/cards/BACK.png';
        return `assets/cards/${this.rank}-${this.suit}.png`;
    }
}

class Deck {
    constructor(numDecks = 6) {
        this.numDecks = numDecks;
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        const suits = ['H', 'D', 'C', 'S'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        for (let i = 0; i < this.numDecks; i++) {
            for (const suit of suits) {
                for (const rank of ranks) {
                    this.cards.push(new Card(suit, rank));
                }
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) this.reset();
        return this.cards.pop();
    }

    get penetration() {
        const total = this.numDecks * 52;
        return (total - this.cards.length) / total;
    }
}

class Hand {
    constructor(bet = 0) {
        this.cards = [];
        this.bet = bet;
        this.status = 'active'; // 'active', 'stood', 'busted', 'doubled', 'surrendered'
        this.isSplit = false;
    }

    addCard(card) {
        this.cards.push(card);
        const value = this.calculateValue();
        if (value > 21) {
            this.status = 'busted';
        }
    }

    calculateValue() {
        let total = 0;
        let aces = 0;

        for (const card of this.cards) {
            if (card.rank === 'A') {
                aces++;
                total += 11;
            } else {
                total += card.value;
            }
        }

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    get isBlackjack() {
        return this.cards.length === 2 && this.calculateValue() === 21 && !this.isSplit;
    }

    get isSoft() {
        let total = 0;
        let aces = 0;
        for (const card of this.cards) {
            if (card.rank === 'A') {
                aces++;
                total += 11;
            } else {
                total += card.value;
            }
        }
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        // If we still have an ace that is counted as 11
        return aces > 0 && total <= 21;
    }
}

// Export for Shared Use (Node.js & Browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Card, Deck, Hand };
} else {
    window.BJEngine = { Card, Deck, Hand };
}
