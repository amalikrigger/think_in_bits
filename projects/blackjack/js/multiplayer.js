/**
 * Multiplayer Client
 */
class MultiplayerClient {
    constructor() {
        this.socket = null;
        this.seatIndex = -1;
        this.currentBet = 0;
        this.isConnected = false;
        this.ui = window.UI; // Access global UI instance
        
        // DOM Elements
        this.mpSeatsContainer = document.getElementById('multiplayer-seats');
        this.spContainer = document.getElementById('player-hands-container');
        this.dealerArea = document.getElementById('dealer-area');
        this.mpDealerArea = document.getElementById('mp-dealer'); 
        this.statusEl = document.getElementById('mp-status');
        this.mpStartBtn = document.getElementById('mp-start-btn');
        
        // Seat elements
        this.seats = [];
        for (let i = 0; i < 4; i++) {
            this.seats.push({
                el: document.getElementById(`seat-${i}`),
                bankroll: document.querySelector(`#seat-${i} .seat-bankroll`),
                bet: document.querySelector(`#seat-${i} .seat-bet-val`),
                cards: document.querySelector(`#seat-${i} .card-area`),
                label: document.querySelector(`#seat-${i} .seat-label`)
            });
        }
        
        this.init();
    }

    init() {
        if (this.mpStartBtn) {
            this.mpStartBtn.addEventListener('click', () => {
                if (!this.isConnected) {
                    this.connect();
                } else {
                    this.disconnect();
                }
            });
        }

        // Hook into existing buttons
        // Logic relies on window.isMultiplayer preventing local actions
        
        const bindBtn = (id, type) => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => {
                if (this.isConnected) this.send(type);
            });
        };

        bindBtn('hit-btn', 'hit');
        bindBtn('stand-btn', 'stand');
        bindBtn('double-btn', 'double');
        bindBtn('split-btn', 'split');
        bindBtn('surrender-btn', 'surrender');
        bindBtn('deal-btn', 'deal');
        
        // Chips
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (this.isConnected) {
                    const val = parseInt(chip.dataset.value);
                    this.currentBet = (this.currentBet || 0) + val;
                    this.send('bet', { amount: this.currentBet });
                }
            });
        });

        const clearBtn = document.getElementById('clear-bet-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                 if (this.isConnected) {
                     this.currentBet = 0;
                     this.send('bet', { amount: 0 });
                 }
            });
        }
    }

    connect() {
        this._intentionalDisconnect = false;
        this._reconnectAttempts = this._reconnectAttempts || 0;

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const port = 8081; 
        const url = `${protocol}//${location.hostname}:${port}`;
        
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('Connected to Multiplayer Server');
            this._reconnectAttempts = 0;
            this.isConnected = true;
            window.isMultiplayer = true;
            if (this.statusEl) this.statusEl.textContent = 'MP: Connected';
            if (this.mpStartBtn) this.mpStartBtn.textContent = 'Disconnect';
            this.toggleInterface(true);
            this.currentBet = 0;
            // Flush any queued messages
            if (this._msgQueue && this._msgQueue.length > 0) {
                this._msgQueue.forEach(msg => this.socket.send(msg));
                this._msgQueue = [];
            }
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (e) {
                console.error(e);
            }
        };

        this.socket.onclose = () => {
            console.log('Disconnected');
            // Auto-reconnect on unexpected disconnects (up to 3 attempts with backoff)
            if (this.isConnected && !this._intentionalDisconnect && this._reconnectAttempts < 3) {
                this._reconnectAttempts++;
                const delay = Math.pow(2, this._reconnectAttempts) * 1000;
                if (this.statusEl) this.statusEl.textContent = `MP: Reconnecting (${this._reconnectAttempts}/3)...`;
                setTimeout(() => this.connect(), delay);
                return;
            }
            this._reconnectAttempts = 0;
            this.cleanup();
        };

        this.socket.onerror = (err) => {
            console.error('WebSocket Error', err);
            if (this.statusEl) this.statusEl.textContent = 'MP: Error';
        };
    }

    disconnect() {
        this._intentionalDisconnect = true;
        if (this.socket) {
            this.socket.close();
        }
    }
    
    cleanup() {
        this.isConnected = false;
        this._intentionalDisconnect = false;
        this._reconnectAttempts = 0;
        window.isMultiplayer = false;
        if (this.statusEl) this.statusEl.textContent = 'MP: Disconnected';
        if (this.mpStartBtn) this.mpStartBtn.textContent = 'Start Multiplayer';
        this.socket = null;
        this.toggleInterface(false);
        this.seatIndex = -1;
    }

    send(type, payload = {}) {
        const msg = JSON.stringify({ type, ...payload });
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(msg);
        } else {
            // Queue messages to send once connection opens
            if (!this._msgQueue) this._msgQueue = [];
            this._msgQueue.push(msg);
        }
    }

    toggleInterface(isMp) {
        if (isMp) {
            if (this.mpSeatsContainer) this.mpSeatsContainer.style.display = 'flex';
            if (this.spContainer) this.spContainer.style.display = 'none';
            document.body.classList.add('multiplayer-mode');
            if (this.mpDealerArea) this.mpDealerArea.style.display = 'none'; 
            
            // Clear SP UI
            if (this.ui) {
                this.ui.playerHandsContainer.innerHTML = '';
                const dealerCardArea = this.dealerArea.querySelector('.card-area');
                if(dealerCardArea) dealerCardArea.innerHTML = '';
                const ds = document.getElementById('dealer-score');
                if (ds) ds.textContent = '';
                this.ui.setMessage('Waiting for game...');
            }
        } else {
            if (this.mpSeatsContainer) this.mpSeatsContainer.style.display = 'none';
            if (this.spContainer) this.spContainer.style.display = 'flex';
            document.body.classList.remove('multiplayer-mode');
            location.reload(); 
        }
    }

    handleMessage(data) {
        if (data.type === 'seat-assigned') {
            this.seatIndex = data.seat;
            if (this.statusEl) this.statusEl.textContent = `MP: Seat ${this.seatIndex + 1}`;
            
            // Mark my seat
            this.seats.forEach((s, i) => {
                if (s.el) {
                    if (i === this.seatIndex) s.el.classList.add('you');
                    else s.el.classList.remove('you');
                }
            });
            
        } else if (data.type === 'state-update') {
            this.renderState(data);
        } else if (data.type === 'error') {
            alert(data.message);
        }
    }

    renderState(data) {
        // Render Dealer
        const dealerCardArea = this.dealerArea.querySelector('.card-area');
        if (dealerCardArea) {
            dealerCardArea.innerHTML = '';
            data.dealer.cards.forEach((c, i) => {
                const el = document.createElement('div');
                el.className = 'card';
                const imgPath = c.isHidden ? 'assets/cards/BACK.png' : `assets/cards/${c.rank}-${c.suit}.png`;
                el.style.backgroundImage = `url(${imgPath})`;
                if (i > 0) el.classList.add('card-overlap');
                dealerCardArea.appendChild(el);
            });
        }
        const ds = document.getElementById('dealer-score');
        if (ds) ds.textContent = data.dealer.score;

        // Render Seats
        data.seats.forEach((seatData, i) => {
            const seatEl = this.seats[i];
            if (!seatEl || !seatEl.el) return;
            
            if (seatData) {
                seatEl.el.classList.add('occupied');
                seatEl.el.classList.toggle('active-turn', i === data.activeSeat);
                seatEl.bankroll.textContent = seatData.bankroll;
                if (seatEl.bet) seatEl.bet.textContent = seatData.bet;
                
                // Cards — render main hand + any split hands, all in the same area
                if (seatEl.cards) {
                    seatEl.cards.innerHTML = '';
                    // Collect all cards: main hand first, then split hands
                    const allCards = [...(seatData.cards || [])];
                    if (seatData.splitHands && seatData.splitHands.length > 0) {
                        seatData.splitHands.forEach(sh => allCards.push(...sh.cards));
                    }
                    allCards.forEach((c, idx) => {
                        const el = document.createElement('div');
                        el.className = 'card';
                        const imgPath = c.isHidden ? 'assets/cards/BACK.png' : `assets/cards/${c.rank}-${c.suit}.png`;
                        el.style.backgroundImage = `url(${imgPath})`;
                        if (idx > 0) el.classList.add('card-overlap-sm');
                        seatEl.cards.appendChild(el);
                    });
                }
                
                if (seatData.status === 'blackjack') seatEl.el.dataset.status = 'BJ';
                else if (seatData.status === 'busted') seatEl.el.dataset.status = 'BUST';
                else delete seatEl.el.dataset.status;

            } else {
                seatEl.el.classList.remove('occupied');
                seatEl.el.classList.remove('active-turn');
                if (seatEl.cards) seatEl.cards.innerHTML = '';
                if (seatEl.bet) seatEl.bet.textContent = '0';
                seatEl.bankroll.textContent = '0';
            }
        });
        
        // Update my controls
        const mySeat = data.seats[this.seatIndex];
        if (mySeat && this.ui) {
             this.ui.updateBankroll(mySeat.bankroll);
             this.ui.updateBet(mySeat.bet);
             this.currentBet = mySeat.bet; 
             
             const isMyTurn = (data.state === 'playing' && data.activeSeat === this.seatIndex);
             this.ui.showActions(isMyTurn);
             
             if (data.state === 'betting') {
                 this.ui.enableBetting(true);
                 this.ui.toggleButton('deal-btn', mySeat.bet > 0);
                 this.ui.toggleButton('clear-bet-btn', true);
             } else {
                 this.ui.enableBetting(false);
                 this.ui.toggleButton('deal-btn', false);
                 this.ui.toggleButton('clear-bet-btn', false);
             }
             
             this.ui.setMessage(this.getStatusMessage(data.state, data.activeSeat, mySeat));
        }
    }
    
    getStatusMessage(state, activeSeat, mySeat) {
        if (state === 'betting') return "Place your bets!";
        if (state === 'dealer-turn') return "Dealer's turn...";
        if (state === 'resolved') {
            if (mySeat.status === 'blackjack') return "Blackjack!";
            if (mySeat.status === 'busted') return "Busted!";
            return "Round Over";
        }
        if (state === 'playing') {
            if (activeSeat === this.seatIndex) return "Your turn!";
            return `Player ${activeSeat + 1}'s turn`;
        }
        return '';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.MP = new MultiplayerClient();
});
