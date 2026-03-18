# Polished Blackjack (21)

A complete, casino-accurate Blackjack game built with plain HTML, CSS, and JavaScript.

## Features
- **6-Deck Shoe**: Standard casino rules with configurable deck count.
- **Dealer Peek**: Dealer checks for Blackjack if showing Ace or 10-value card.
- **S17/H17**: Dealer stands on soft 17 (configurable).
- **Splitting**: Support for up to 3 re-splits (4 hands total).
- **Double Down**: Allowed on initial 2 cards.
- **Late Surrender**: Forfeit half the bet if allowed.
- **Persistent Stats**: Tracks bankroll, wins, losses, and streaks across sessions.
- **Responsive Table**: "Landscape" felt design with scrollable area for multiple split hands.

## Setup & Run
1. Ensure the `assets/cards` folder contains the card images (this is handled by the setup).
2. Open `index.html` in any modern web browser.
3. No build step required.

## Multiplayer (LAN)

To make the multiplayer game accessible from other devices on your local network, start the bundled server which serves the client files and runs the WebSocket endpoint:

1. Install dependencies and start the server from the `server` folder:

```bash
cd server
npm install
npm start
```

2. On the machine running the server, open your browser to `http://localhost:8080` to play locally.

3. On other devices on the same LAN, open `http://<HOST_IP>:8080` where `<HOST_IP>` is the LAN IPv4 address of the server machine (for example `192.168.1.42`). The WebSocket server listens on port `8081` and the client will connect automatically when the page is loaded from the server.

Notes:
- Ensure your OS firewall allows inbound connections to ports `8080` and `8081`.
- This setup is intended for LAN/local testing. Do not expose the server to the public internet without additional security (TLS, authentication, rate limiting).

## Gameplay Instructions
1. **Betting**: Click chips ($1, $5, $25, $100) to build your bet.
2. **Deal**: Click 'Deal' to start the hand.
3. **Actions**:
   - **Hit**: Take another card.
   - **Stand**: Keep your current total.
   - **Double**: Double your bet, take exactly one more card.
   - **Split**: If you have two cards of the same rank, split them into two hands.
   - **Surrender**: Forfeit half your bet and end the round.
4. **Settings**: Click the gear icon (⚙️) to change rules like deck count or S17.

## Rules
- Blackjack pays 3:2 (default).
- Dealer stands on 17.
- Dealer checks for blackjack on Ace/10 upcards.
- Insurance is not implemented (per standard "Late Surrender" preference).
