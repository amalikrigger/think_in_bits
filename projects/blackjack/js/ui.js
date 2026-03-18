/**
 * Blackjack UI - DOM Manipulation
 */

class UIManager {
    constructor() {
        this.dealerHand = document.getElementById('dealer-hand');
        this.dealerScore = document.getElementById('dealer-score');
        this.playerHandsContainer = document.getElementById('player-hands-container');
        this.messageArea = document.getElementById('game-message');
        this.bankrollDisplay = document.getElementById('bankroll-display');
        this.betDisplay = document.getElementById('total-bet-display');
        
        // Containers
        this.chipsContainer = document.querySelector('.chips');
        
        // Buttons
        this.dealBtn = document.getElementById('deal-btn');
        this.hitBtn = document.getElementById('hit-btn');
        this.standBtn = document.getElementById('stand-btn');
        this.doubleBtn = document.getElementById('double-btn');
        this.splitBtn = document.getElementById('split-btn');
        this.surrenderBtn = document.getElementById('surrender-btn');
        this.clearBetBtn = document.getElementById('clear-bet-btn');
        
        this.actionControls = document.getElementById('action-controls');
        this.bettingControls = document.getElementById('betting-controls');
        
        this.settingsModal = document.getElementById('settings-modal');
        this.helpModal = document.getElementById('help-modal');

        // Help modal controls
        const helpBtn = document.getElementById('help-btn');
        const closeHelp = document.getElementById('close-help');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                const isHidden = this.helpModal.classList.contains('hidden');
                if (isHidden) {
                    this.helpModal.classList.remove('hidden');
                    this._trapFocus(this.helpModal);
                } else {
                    this.helpModal.classList.add('hidden');
                    this._releaseFocus();
                }
            });
        }
        if (closeHelp) {
            closeHelp.addEventListener('click', () => {
                this.helpModal.classList.add('hidden');
                this._releaseFocus();
            });
        }

        // Sounds & Full Screen Controls
        this.soundBtn = document.getElementById('sound-btn');
        this.musicBtn = document.getElementById('music-btn'); // Add music btn
        this.musicSelect = document.getElementById('music-select'); // Add music select
        this.fullscreenBtn = document.getElementById('fullscreen-btn');

        if(this.soundBtn) {
            this.soundBtn.addEventListener('click', () => {
                const enabled = window.soundManager.toggle();
                this.soundBtn.textContent = enabled ? '🔊' : '🔇';
                this.soundBtn.title = enabled ? 'Mute Sound' : 'Unmute Sound';
            });
        }

        // Music Controls
        if (this.musicBtn) {
            this.musicBtn.addEventListener('click', () => {
                const enabled = window.soundManager.toggleMusic();
                this.musicBtn.textContent = enabled ? '🎵' : '🔇'; // Or another icon for mute music
                this.musicBtn.title = enabled ? 'Turn Music Off' : 'Turn Music On';
                if (!enabled) this.musicBtn.classList.add('muted');
                else this.musicBtn.classList.remove('muted');
            });
        }

        if (this.musicSelect && window.soundManager) {
            // Populate select
            window.soundManager.musicTracks.forEach((track, index) => {
                const option = document.createElement('option');
                option.value = index;
                // Prettify name: remove extension and replace hyphens
                let name = track.replace('.mp3', '').replace(/-/g, ' ');
                // Capitalize
                name = name.charAt(0).toUpperCase() + name.slice(1);
                option.textContent = name;
                this.musicSelect.appendChild(option);
            });

            this.musicSelect.addEventListener('change', (e) => {
                const index = parseInt(e.target.value);
                window.soundManager.setTrack(index);
            });
        }

        if(this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.log(`Error attempting to enable full-screen mode: ${err.message}`);
                    });
                    document.body.classList.add('fullscreen');
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                        document.body.classList.remove('fullscreen');
                    }
                }
            });
        }

        // Add sound triggers to interactions
        if (this.chipsContainer) {
            this.chipsContainer.addEventListener('click', (e) => {
                if ((e.target.classList.contains('chip') || e.target.closest('.chip')) && !this.chipsContainer.classList.contains('disabled')) {
                    if (window.soundManager) window.soundManager.play('chip');
                }
            });
        }

        ['deal-btn', 'hit-btn', 'stand-btn', 'double-btn', 'split-btn', 'surrender-btn', 'clear-bet-btn'].forEach(id => {
            const btn = document.getElementById(id);
            if(btn) {
                btn.addEventListener('click', () => {
                    if(!btn.disabled && window.soundManager) window.soundManager.play('click');
                });
            }
        });

        // Multiplayer seat chip displays
        this.seatChipEls = Array.from(document.querySelectorAll('.seat-bankroll'));
        // Initialize seat displays: seat 0 is local player bankroll (if available)
        this.seatChipEls.forEach((el, i) => {
            if (i === 0 && window.Stats) el.textContent = Math.floor(window.Stats.stats.bankroll);
            else el.textContent = '0';
        });
    }

    updateBankroll(amount) {
        this.bankrollDisplay.textContent = Math.floor(amount);
        // Keep seat 0 in sync with the player's bankroll
        if (this.seatChipEls && this.seatChipEls[0]) {
            this.seatChipEls[0].textContent = Math.floor(amount);
        }
    }

    updateBet(amount) {
        this.betDisplay.textContent = Math.floor(amount);
    }

    setMessage(msg) {
        this.messageArea.textContent = msg;
    }

    renderHand(hand, container, showScore = true) {
        // Keep track of existing cards to avoid re-animating them
        const existingCount = container.querySelectorAll('.card').length;
        
        hand.cards.forEach((card, index) => {
            if (index < existingCount) return; // Skip already rendered cards

            const cardEl = document.createElement('div');
            cardEl.className = 'card dealing';
            if (card.isHidden) cardEl.classList.add('card-hidden');
            cardEl.style.backgroundImage = `url(${card.imagePath})`;
            
            // Offset for overlapping cards
            if (index > 0) {
                cardEl.classList.add('card-overlap');
            }

            container.appendChild(cardEl);
            
            // Trigger animation on next frame
            requestAnimationFrame(() => {
                setTimeout(() => {
                    cardEl.classList.remove('dealing');
                    cardEl.style.opacity = '1';
                    if (window.soundManager) window.soundManager.play('deal');
                }, index * 200); // Slower staggered deal
            });
        });

        if (showScore) {
            const score = hand.calculateValue();
            return score;
        }
        return null;
    }

    renderPlayerHands(hands, activeIndex) {
        // Clear fully when resetting to empty board
        if (hands.length === 0) {
            this.playerHandsContainer.innerHTML = '';
            return;
        }

        // Reuse existing hand divs so renderHand's existingCount check prevents re-animation
        const existingHandDivs = Array.from(this.playerHandsContainer.querySelectorAll('.player-hand'));

        hands.forEach((hand, index) => {
            let handDiv = existingHandDivs[index];
            if (!handDiv) {
                handDiv = document.createElement('div');
                handDiv.className = 'player-hand';
                const label = document.createElement('div');
                label.className = 'hand-label';
                const cardArea = document.createElement('div');
                cardArea.className = 'card-area';
                handDiv.appendChild(label);
                handDiv.appendChild(cardArea);
                this.playerHandsContainer.appendChild(handDiv);
            }

            // Update active highlight
            handDiv.classList.toggle('active', index === activeIndex);

            // Refresh score label
            const label = handDiv.querySelector('.hand-label');
            const val = hand.calculateValue();
            label.innerHTML = `Hand ${index + 1} <span class="score-badge">${val}</span>`;

            // Append only new cards — renderHand skips already-rendered ones via existingCount
            const cardArea = handDiv.querySelector('.card-area');
            this.renderHand(hand, cardArea, false);
        });

        // Remove stale hand divs if hands count shrank (e.g. after a reset)
        for (let i = hands.length; i < existingHandDivs.length; i++) {
            existingHandDivs[i].remove();
        }
    }

    showActions(show) {
        if (show) {
            this.actionControls.classList.remove('hidden');
            this.bettingControls.classList.add('hidden');
        } else {
            this.actionControls.classList.add('hidden');
            this.bettingControls.classList.remove('hidden');
        }
    }

    enableBetting(enabled) {
        if (enabled) {
            this.chipsContainer.classList.remove('disabled');
            this.clearBetBtn.disabled = false;
        } else {
            this.chipsContainer.classList.add('disabled');
            this.clearBetBtn.disabled = true;
        }
    }

    toggleButton(id, enabled) {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !enabled;
    }

    showSettings(show) {
        if (show) {
            this.settingsModal.classList.remove('hidden');
            this._trapFocus(this.settingsModal);
        } else {
            this.settingsModal.classList.add('hidden');
            this._releaseFocus();
        }
    }

    showHandResults(handResults) {
        const handDivs = this.playerHandsContainer.querySelectorAll('.player-hand');
        handResults.forEach((res, i) => {
            if (handDivs[i]) {
                // Remove any existing badge
                const existing = handDivs[i].querySelector('.hand-result-badge');
                if (existing) existing.remove();
                const badge = document.createElement('span');
                badge.className = `hand-result-badge ${res.badgeClass}`;
                badge.textContent = res.result;
                handDivs[i].appendChild(badge);
            }
        });
    }

    showOutOfMoney() {
        if (document.getElementById('out-of-money-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'out-of-money-overlay';
        overlay.className = 'out-of-money-overlay';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Out of money');
        overlay.innerHTML = `
            <div class="explosion"></div>
            <div class="out-message">You're out</div>
            <button class="restart-btn">Restart</button>
        `;
        document.body.appendChild(overlay);

        const doRestart = () => {
            this.clearOutOfMoney();
            if (window.Stats) window.Stats.updateBankroll(1000);
            if (window.UI) window.UI.updateBankroll(1000);
            if (window.Game) {
                window.Game.bankroll = 1000;
                window.Game.currentBet = 0;
                window.Game.ui.updateBet(0);
                window.Game.ui.enableBetting(true);
                window.Game.ui.toggleButton('deal-btn', false);
                window.Game.ui.setMessage('Bankroll reset to $1000');
            }
        };

        // Hook up restart button
        const btn = overlay.querySelector('.restart-btn');
        if (btn) {
            btn.addEventListener('click', doRestart);
            btn.focus(); // Focus for keyboard accessibility
        }
    }

    clearOutOfMoney() {
        const el = document.getElementById('out-of-money-overlay');
        if (el) el.remove();
    }

    _trapFocus(container) {
        this._previousFocus = document.activeElement;
        this._focusTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = container.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', this._focusTrapHandler);
        // Focus first focusable element
        const firstFocusable = container.querySelector('button, input, select');
        if (firstFocusable) firstFocusable.focus();
    }

    _releaseFocus() {
        if (this._focusTrapHandler) {
            document.removeEventListener('keydown', this._focusTrapHandler);
            this._focusTrapHandler = null;
        }
        if (this._previousFocus) {
            this._previousFocus.focus();
            this._previousFocus = null;
        }
    }
}

window.UI = new UIManager();
