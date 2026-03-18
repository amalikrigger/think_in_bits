/**
 * Blackjack Game - Controller / State Machine
 */

class GameController {
    constructor() {
        this.engine = window.BJEngine;
        this.stats = window.Stats;
        this.ui = window.UI;

        this.deck = new this.engine.Deck();
        this.playerHands = [];
        this.activeHandIndex = 0;
        this.dealerHand = null;
        this.currentBet = 0;
        this.bankroll = this.stats.stats.bankroll || 1000;
        this.isResolving = false;

        this.settings = {
            deckCount: 6,
            s17: true,
            bjPayout: 1.5,
            surrender: true,
            penetrationThreshold: 0.75
        };

        this.init();
    }

    init() {
        // Event Listeners
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => this.addBet(parseInt(chip.dataset.value)));
        });

        document.getElementById('clear-bet-btn').addEventListener('click', () => this.clearBet());
        document.getElementById('deal-btn').addEventListener('click', () => this.startRound());
        document.getElementById('hit-btn').addEventListener('click', () => this.hit());
        document.getElementById('stand-btn').addEventListener('click', () => this.stand());
        document.getElementById('double-btn').addEventListener('click', () => this.doubleDown());
        document.getElementById('split-btn').addEventListener('click', () => this.split());
        document.getElementById('surrender-btn').addEventListener('click', () => this.surrender());
        
        document.getElementById('settings-btn').addEventListener('click', () => this.ui.showSettings(true));
        document.getElementById('close-settings').addEventListener('click', () => this.saveSettings());

        // Reset bankroll to default when reset button clicked
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.stats.reset();
                this.bankroll = 1000;
                this.stats.updateBankroll(1000);
                this.ui.updateBankroll(this.bankroll);
                this.currentBet = 0;
                this.ui.updateBet(0);

                // Clear board state
                this.playerHands = [];
                this.dealerHand = null;
                this.deck = new this.engine.Deck(this.settings.deckCount); // Reset deck
                
                this.ui.renderPlayerHands([], -1);
                this.ui.dealerHand.innerHTML = '';
                this.ui.dealerScore.textContent = '';
                this.ui.showActions(false);
                
                this.ui.setMessage('Bankroll reset to $1000');
                this.ui.enableBetting(true);
                this.ui.toggleButton('deal-btn', false);
            });
        }

        // Keyboard hotkeys: H=Hit, S=Stand, D=Double, P=Split, Q=Surrender, Enter=Deal, R=Repeat bet, Esc=Close settings
        document.addEventListener('keydown', (e) => {
            if (window.isMultiplayer) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            const key = e.key.toUpperCase();
            if (key === 'R') { this.repeatBet(); return; }
            if (key === 'ESCAPE') {
                if (!this.ui.settingsModal.classList.contains('hidden')) this.saveSettings();
                return;
            }
            const map = { 'H': 'hit-btn', 'S': 'stand-btn', 'D': 'double-btn', 'P': 'split-btn', 'Q': 'surrender-btn', 'ENTER': 'deal-btn' };
            const btnId = map[key];
            if (btnId) {
                const btn = document.getElementById(btnId);
                if (btn && !btn.disabled) btn.click();
            }
        });

        this.lastBet = 0;
        this._resolveTimer = null;
        window.isMultiplayer = window.isMultiplayer || false;
        this.ui.updateBankroll(this.bankroll);
        this.updateUI();
    }

    saveSettings() {
        this.settings.deckCount = parseInt(document.getElementById('deck-count').value);
        this.settings.s17 = document.getElementById('s17-toggle').checked;
        this.settings.bjPayout = parseFloat(document.getElementById('bj-payout').value);
        this.settings.surrender = document.getElementById('surrender-toggle').checked;

        if (this.deck.numDecks !== this.settings.deckCount) {
            this.deck = new this.engine.Deck(this.settings.deckCount);
        }
        this.ui.showSettings(false);
    }

    addBet(amount) {
        if (window.isMultiplayer) return;
        if (this.isResolving) return;
        if (this.bankroll >= amount) {
            this.currentBet += amount;
            this.bankroll -= amount;
            this.stats.updateBankroll(this.bankroll);
            this.ui.updateBankroll(this.bankroll);
            this.ui.updateBet(this.currentBet);
            this.ui.toggleButton('deal-btn', this.currentBet > 0);
            this.checkBankruptcy();
        }
    }

    repeatBet() {
        if (window.isMultiplayer) return;
        if (this.lastBet <= 0 || this.isResolving || this.currentBet !== 0) return;
        const amount = Math.min(this.lastBet, this.bankroll);
        if (amount <= 0) return;
        this.currentBet = amount;
        this.bankroll -= amount;
        this.stats.updateBankroll(this.bankroll);
        this.ui.updateBankroll(this.bankroll);
        this.ui.updateBet(this.currentBet);
        this.ui.toggleButton('deal-btn', this.currentBet > 0);
        this.checkBankruptcy();
    }

    clearBet() {
        if (window.isMultiplayer) return;
        if (this.isResolving) return;
        this.bankroll += this.currentBet;
        this.currentBet = 0;
        this.stats.updateBankroll(this.bankroll);
        this.ui.updateBankroll(this.bankroll);
        this.ui.updateBet(this.currentBet);
        this.ui.toggleButton('deal-btn', false);
        this.checkBankruptcy();
    }

    async startRound() {
        if (window.isMultiplayer) return;
        this.lastBet = this.currentBet; // Remember bet for R hotkey repeat
        if (this.deck.penetration > this.settings.penetrationThreshold) {
            this.deck.reset();
            this.ui.setMessage("Shuffling shoe...");
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.playerHands = [new this.engine.Hand(this.currentBet)];
        this.dealerHand = new this.engine.Hand(0);
        this.activeHandIndex = 0;

        // Clear table visually
        this.ui.playerHandsContainer.innerHTML = '';
        this.ui.dealerHand.innerHTML = '';
        this.ui.dealerScore.textContent = '';

        // Deal initial cards with delays for smoothness
        const deal = async (hand, container, isPlayer) => {
            const card = this.deck.draw();
            if (!isPlayer && hand.cards.length === 1) card.isHidden = true;
            hand.addCard(card);
            this.ui.renderHand(hand, container, false);
            await new Promise(resolve => setTimeout(resolve, 400));
        };

        // Create player hand container first
        this.ui.renderPlayerHands(this.playerHands, 0);
        const playerHandContainer = this.ui.playerHandsContainer.querySelector('.card-area');

        await deal(this.playerHands[0], playerHandContainer, true);
        await deal(this.dealerHand, this.ui.dealerHand, false);
        await deal(this.playerHands[0], playerHandContainer, true);
        await deal(this.dealerHand, this.ui.dealerHand, false);

        this.ui.showActions(true);
        this.checkDealerPeek();
    }

    checkDealerPeek() {
        const upCard = this.dealerHand.cards[0];
        const isAceOrTen = upCard.rank === 'A' || upCard.value === 10;

        if (isAceOrTen) {
            // Peek logic
            const dealerVal = this.dealerHand.calculateValue(); // This calculates including hidden card
            if (dealerVal === 21) {
                this.dealerHand.cards[1].isHidden = false;
                this.resolveRound();
                return;
            }
        }

        // Check player natural blackjack
        if (this.playerHands[0].isBlackjack) {
            this.ui.setMessage('BLACKJACK! 🎉');
            setTimeout(() => this.stand(), 1200); // Brief celebration before resolving
        } else {
            this.updateUI();
            // Auto-focus the Hit button for keyboard users
            const hitBtn = document.getElementById('hit-btn');
            if (hitBtn && !hitBtn.disabled) hitBtn.focus();
        }
    }

    updateUI() {
        if (this.playerHands.length === 0) return;
        const currentHand = this.playerHands[this.activeHandIndex];
        this.ui.renderPlayerHands(this.playerHands, this.activeHandIndex);
        this.ui.renderHand(this.dealerHand, this.ui.dealerHand, false);
        
        // Show only the upcard value initially
        this.ui.dealerScore.textContent = this.dealerHand.cards[0].value;

        // Hit and Stand are always available unless hand is busted or stood
        const canHitStand = currentHand.status === 'active';
        this.ui.toggleButton('hit-btn', canHitStand);
        this.ui.toggleButton('stand-btn', canHitStand);

        // Update action buttons availability
        const canDouble = currentHand.cards.length === 2 && this.bankroll >= currentHand.bet && canHitStand;
        const canSplit = currentHand.cards.length === 2 && 
                         currentHand.cards[0].rank === currentHand.cards[1].rank &&
                         this.bankroll >= currentHand.bet &&
                         this.playerHands.length < 4; // Max 4 hands (3 resplits)
        
        this.ui.toggleButton('double-btn', canDouble);
        this.ui.toggleButton('split-btn', canSplit);
        this.ui.toggleButton('surrender-btn', this.settings.surrender && currentHand.cards.length === 2 && canHitStand && !currentHand.isSplit);
    }

    checkBankruptcy() {
        // Only trigger when both bankroll and current bet are zero
        if (this.bankroll <= 0 && this.currentBet <= 0) {
            // Clear any pending round-reset timer to prevent race
            if (this._resolveTimer) {
                clearTimeout(this._resolveTimer);
                this._resolveTimer = null;
            }
            this.ui.showOutOfMoney();
            this.ui.enableBetting(false);
            this.ui.toggleButton('deal-btn', false);
            // Disable all action buttons
            ['hit-btn','stand-btn','double-btn','split-btn','surrender-btn'].forEach(id => this.ui.toggleButton(id, false));
        }
    }

    hit() {
        if (window.isMultiplayer) return;
        const hand = this.playerHands[this.activeHandIndex];
        hand.addCard(this.deck.draw());
        
        this.updateUI(); // Always update UI to show the new card

        if (hand.status === 'busted') {
            // Short delay so player sees the bust card before dealer starts
            setTimeout(() => this.nextHand(), 500);
        }
    }

    stand() {
        if (window.isMultiplayer) return;
        this.playerHands[this.activeHandIndex].status = 'stood';
        this.nextHand();
    }

    doubleDown() {
        if (window.isMultiplayer) return;
        const hand = this.playerHands[this.activeHandIndex];
        this.bankroll -= hand.bet;
        hand.bet *= 2;
        hand.addCard(this.deck.draw());
        if (hand.status !== 'busted') hand.status = 'doubled';
        
        this.stats.increment('doubles');
        this.stats.updateBankroll(this.bankroll);
        this.ui.updateBankroll(this.bankroll);
        this.checkBankruptcy();
        this.updateUI();
        setTimeout(() => this.nextHand(), 500);
    }

    split() {
        if (window.isMultiplayer) return;
        const hand = this.playerHands[this.activeHandIndex];
        this.stats.increment('splits');
        this.bankroll -= hand.bet;
        
        const newHand = new this.engine.Hand(hand.bet);
        newHand.isSplit = true;
        hand.isSplit = true;
        
        const splitCard = hand.cards.pop();
        newHand.addCard(splitCard);
        
        hand.addCard(this.deck.draw());
        newHand.addCard(this.deck.draw());
        
        this.playerHands.splice(this.activeHandIndex + 1, 0, newHand);
        
        this.stats.updateBankroll(this.bankroll);
        this.ui.updateBankroll(this.bankroll);
        this.checkBankruptcy();
        this.updateUI();
        
        // Rule: If split Aces, player gets only 1 card and stands
        if (splitCard.rank === 'A') {
            hand.status = 'stood';
            newHand.status = 'stood';
            setTimeout(() => this.dealerTurn(), 500);
        }
    }

    surrender() {
        if (window.isMultiplayer) return;
        const hand = this.playerHands[this.activeHandIndex];
        hand.status = 'surrendered';
        this.stats.increment('surrenders');
        this.bankroll += hand.bet / 2;
        this.stats.updateBankroll(this.bankroll);
        this.ui.updateBankroll(this.bankroll);
        this.nextHand();
    }

    nextHand() {
        this.activeHandIndex++;
        if (this.activeHandIndex >= this.playerHands.length) {
            this.dealerTurn();
        } else {
            this.updateUI();
        }
    }

    async dealerTurn() {
        // Reveal hole card with flip animation
        this.dealerHand.cards[1].isHidden = false;
        const dealerCardEls = this.ui.dealerHand.querySelectorAll('.card');
        if (dealerCardEls[1]) {
            dealerCardEls[1].classList.remove('card-hidden');
            dealerCardEls[1].classList.add('flipping');
            // Swap image at animation midpoint (300ms into 600ms animation)
            setTimeout(() => {
                dealerCardEls[1].style.backgroundImage = `url(${this.dealerHand.cards[1].imagePath})`;
            }, 300);
            // Remove animation class after it completes
            setTimeout(() => {
                dealerCardEls[1].classList.remove('flipping');
            }, 600);
        }
        if (window.soundManager) window.soundManager.play('flip');
        
        let dealerVal = this.dealerHand.calculateValue();
        this.ui.dealerScore.textContent = dealerVal;

        // If all player hands busted, skip dealer draw
        const allBusted = this.playerHands.every(h => h.status === 'busted' || h.status === 'surrendered');
        if (allBusted) {
            setTimeout(() => this.resolveRound(), 1000);
            return;
        }

        // Dealer hits until 17
        while (dealerVal < 17 || (dealerVal === 17 && this.dealerHand.isSoft && !this.settings.s17)) {
            await new Promise(resolve => setTimeout(resolve, 800)); // Slower dealer hits
            this.dealerHand.addCard(this.deck.draw());
            dealerVal = this.dealerHand.calculateValue();
            this.ui.renderHand(this.dealerHand, this.ui.dealerHand);
            this.ui.dealerScore.textContent = dealerVal;
        }
        
        setTimeout(() => this.resolveRound(), 1000);
    }

    resolveRound() {
        const dealerVal = this.dealerHand.calculateValue();
        const dealerBJ = this.dealerHand.isBlackjack;
        
        this.ui.renderHand(this.dealerHand, this.ui.dealerHand);
        this.ui.dealerScore.textContent = dealerVal;
        
        let totalWin = 0;
        const handResults = [];

        this.playerHands.forEach((hand, i) => {
            const playerVal = hand.calculateValue();
            const playerBJ = hand.isBlackjack;
            let result = '';
            let badgeClass = '';
            let winAmount = 0;

            if (hand.status === 'surrendered') {
                result = 'Surrender';
                badgeClass = 'surrender';
                winAmount = 0; // Already handled at surrender time
                this.stats.recordResult('loss', hand.bet / 2);
            } else if (hand.status === 'busted') {
                result = 'Bust';
                badgeClass = 'bust';
                this.stats.recordResult('loss', hand.bet, false, true);
            } else if (dealerBJ) {
                if (playerBJ) {
                    result = 'Push';
                    badgeClass = 'push';
                    winAmount = hand.bet;
                    this.stats.recordResult('push', 0);
                } else {
                    result = 'Dealer Blackjack';
                    badgeClass = 'loss';
                    this.stats.recordResult('loss', hand.bet);
                }
            } else if (playerBJ) {
                result = 'Blackjack!';
                badgeClass = 'blackjack';
                winAmount = hand.bet + (hand.bet * this.settings.bjPayout);
                this.stats.recordResult('win', hand.bet * this.settings.bjPayout, true);
            } else if (dealerVal > 21) {
                result = 'Dealer Bust!';
                badgeClass = 'win';
                winAmount = hand.bet * 2;
                this.stats.recordResult('win', hand.bet);
            } else if (playerVal > dealerVal) {
                result = 'Win';
                badgeClass = 'win';
                winAmount = hand.bet * 2;
                this.stats.recordResult('win', hand.bet);
            } else if (playerVal < dealerVal) {
                result = 'Loss';
                badgeClass = 'loss';
                this.stats.recordResult('loss', hand.bet);
            } else {
                result = 'Push';
                badgeClass = 'push';
                winAmount = hand.bet;
                this.stats.recordResult('push', 0);
            }

            handResults.push({ result, badgeClass });
            totalWin += winAmount;
        });

        this.bankroll += totalWin;
        this.stats.updateBankroll(this.bankroll);
        this.ui.updateBankroll(this.bankroll);
        this.checkBankruptcy();

        // Compute net change for sound and multi-hand message
        // (surrendered hands already returned half bet mid-round, exclude from net calc)
        const totalBetOnTable = this.playerHands
            .filter(h => h.status !== 'surrendered')
            .reduce((sum, h) => sum + h.bet, 0);
        const netChange = totalWin - totalBetOnTable;

        // Play win/lose audio feedback
        if (window.soundManager) {
            if (netChange > 0) window.soundManager.play('win');
            else if (netChange < 0) window.soundManager.play('lose');
        }
        
        // Show result summary
        let summaryMsg = '';
        if (this.playerHands.length === 1) {
            const h = this.playerHands[0];
            const pVal = h.calculateValue();
            if (h.status === 'surrendered') summaryMsg = 'Surrendered';
            else if (h.status === 'busted') summaryMsg = 'Bust!';
            else if (dealerBJ && !h.isBlackjack) summaryMsg = 'Dealer Blackjack';
            else if (h.isBlackjack && !dealerBJ) summaryMsg = 'BLACKJACK! 🎉';
            else if (dealerVal > 21) summaryMsg = 'Dealer Busts — You Win!';
            else if (pVal > dealerVal) summaryMsg = 'You Win!';
            else if (pVal < dealerVal) summaryMsg = 'Dealer Wins';
            else summaryMsg = 'Push';
        } else {
            const sign = netChange >= 0 ? '+' : '';
            summaryMsg = `Round Over — Net: ${sign}$${netChange}`;
        }
        
        this.ui.setMessage(summaryMsg + '  \u2022  Press R to repeat bet');
        this.ui.showActions(false);
        this.ui.enableBetting(false);
        this.isResolving = true;

        // Show per-hand result badges
        this.ui.showHandResults(handResults);

        // Apply table glow effect based on outcome
        const table = document.getElementById('table');
        const hasBlackjack = handResults.some(r => r.badgeClass === 'blackjack');
        if (hasBlackjack) {
            table.classList.add('glow-blackjack');
        } else if (netChange > 0) {
            table.classList.add('glow-win');
        } else if (netChange < 0) {
            table.classList.add('glow-loss');
        }

        // Reset after 3 seconds
        this._resolveTimer = setTimeout(() => {
            this.currentBet = 0;
            this.playerHands = [];
            this.dealerHand = null;
            this.isResolving = false;
            
            this.ui.enableBetting(true);
            this.ui.updateBet(0);
            this.ui.renderPlayerHands([], -1);
            this.ui.dealerHand.innerHTML = '';
            this.ui.dealerScore.textContent = '';
            // Clear table glow effects
            const table = document.getElementById('table');
            table.classList.remove('glow-win', 'glow-loss', 'glow-blackjack');

            this.ui.setMessage("Place your bet to start!");
            this.ui.toggleButton('deal-btn', false);
            this.updateUI(); // Resets button states
            this.checkBankruptcy();
        }, 3000);
    }
}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
    window.Game = new GameController();
});
