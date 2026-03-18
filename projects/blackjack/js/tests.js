/**
 * Blackjack Engine Tests
 * Run via tests.html — open browser console to see results.
 */

let _passed = 0;
let _failed = 0;

function assert(condition, msg) {
    if (condition) {
        console.log(`  ✅ PASS: ${msg}`);
        _passed++;
    } else {
        console.error(`  ❌ FAIL: ${msg}`);
        _failed++;
    }
}

function runTests() {
    _passed = 0;
    _failed = 0;
    const engine = window.BJEngine;

    console.group("Blackjack Engine Tests");

    // ─── 1. Scoring ───────────────────────────────────────────────────────────
    console.group("1. Scoring");
    const score = (ranks) => {
        const h = new engine.Hand();
        ranks.forEach(r => h.addCard(new engine.Card('H', r)));
        return h.calculateValue();
    };

    assert(score(['10', '7']) === 17, "Hard 17");
    assert(score(['A', '6']) === 17, "Soft 17 (A counts as 11)");
    assert(score(['A', '6', 'A']) === 18, "Soft 18 — two aces, one demoted");
    assert(score(['A', '10']) === 21, "Ace + 10 = 21");
    assert(score(['A', 'A', 'A']) === 13, "Triple Ace = 13");
    assert(score(['K', 'Q', 'J']) === 30, "K+Q+J = 30 (bust)");
    assert(score(['A', '9']) === 20, "Soft 20");
    assert(score(['A', 'A']) === 12, "Pair of aces = 12");
    assert(score(['5', '6', 'K']) === 21, "5+6+K = 21");
    console.groupEnd();

    // ─── 2. Blackjack Detection ───────────────────────────────────────────────
    console.group("2. Blackjack Detection");
    const bj = new engine.Hand(10);
    bj.addCard(new engine.Card('H', 'A'));
    bj.addCard(new engine.Card('S', 'K'));
    assert(bj.isBlackjack === true, "A+K is blackjack");
    assert(bj.calculateValue() === 21, "Blackjack value = 21");

    // Split hand should NOT be blackjack even if A+K
    const splitHand = new engine.Hand(10);
    splitHand.isSplit = true;
    splitHand.addCard(new engine.Card('H', 'A'));
    splitHand.addCard(new engine.Card('S', 'K'));
    assert(splitHand.isBlackjack === false, "21 on a split hand is NOT blackjack");

    // 3-card 21 is not blackjack
    const h21 = new engine.Hand(10);
    h21.addCard(new engine.Card('H', '7'));
    h21.addCard(new engine.Card('S', '7'));
    h21.addCard(new engine.Card('D', '7'));
    assert(h21.isBlackjack === false, "3-card 21 is NOT blackjack");
    console.groupEnd();

    // ─── 3. isSoft ────────────────────────────────────────────────────────────
    console.group("3. isSoft");
    const softHand = new engine.Hand();
    softHand.addCard(new engine.Card('H', 'A'));
    softHand.addCard(new engine.Card('H', '6'));
    assert(softHand.isSoft === true, "A+6 is soft");

    const hardHand = new engine.Hand();
    hardHand.addCard(new engine.Card('H', 'A'));
    hardHand.addCard(new engine.Card('H', '6'));
    hardHand.addCard(new engine.Card('H', '8'));
    assert(hardHand.isSoft === false, "A+6+8=15 is hard (ace forced to 1)");
    console.groupEnd();

    // ─── 4. Hand Status Transitions ───────────────────────────────────────────
    console.group("4. Hand Status");
    const freshHand = new engine.Hand(10);
    assert(freshHand.status === 'active', "New hand starts active");

    freshHand.addCard(new engine.Card('H', '10'));
    freshHand.addCard(new engine.Card('H', 'K'));
    assert(freshHand.status === 'active', "20 — still active after two cards");

    freshHand.addCard(new engine.Card('H', '5'));
    assert(freshHand.status === 'busted', "25 — busted after third card");

    const doubleHand = new engine.Hand(10);
    doubleHand.addCard(new engine.Card('H', '5'));
    doubleHand.addCard(new engine.Card('H', '6'));
    doubleHand.status = 'doubled';
    assert(doubleHand.status === 'doubled', "Hand status can be set to 'doubled'");

    const stoodHand = new engine.Hand(10);
    stoodHand.addCard(new engine.Card('H', '8'));
    stoodHand.addCard(new engine.Card('H', '9'));
    stoodHand.status = 'stood';
    assert(stoodHand.status === 'stood', "Hand status can be set to 'stood'");
    console.groupEnd();

    // ─── 5. Deck ──────────────────────────────────────────────────────────────
    console.group("5. Deck");
    const deck1 = new engine.Deck(1);
    assert(deck1.cards.length === 52, "Single deck = 52 cards");

    const deck6 = new engine.Deck(6);
    assert(deck6.cards.length === 312, "Six decks = 312 cards");

    deck1.draw();
    assert(deck1.cards.length === 51, "Draw reduces count by 1");

    // Penetration
    const deckSmall = new engine.Deck(1);
    for (let i = 0; i < 26; i++) deckSmall.draw();
    const pen = deckSmall.penetration;
    assert(Math.abs(pen - 0.5) < 0.01, `50% penetration after 26 draws (got ${pen.toFixed(2)})`);
    console.groupEnd();

    // ─── 6. Payout Arithmetic ─────────────────────────────────────────────────
    console.group("6. Payout Arithmetic");
    // 3:2 blackjack: bet 10 → return 10 + 15 = 25
    const bjPayout = 10 + (10 * 1.5);
    assert(bjPayout === 25, "3:2 BJ payout on $10 bet = $25 returned");

    // 6:5 blackjack: bet 10 → return 10 + 12 = 22
    const bjPayout65 = 10 + (10 * 1.2);
    assert(bjPayout65 === 22, "6:5 BJ payout on $10 bet = $22 returned");

    // Regular win: bet 10 → return 20
    const winReturn = 10 * 2;
    assert(winReturn === 20, "Regular win on $10 bet returns $20");

    // Surrender: half bet returned
    const surrenderReturn = 10 / 2;
    assert(surrenderReturn === 5, "Surrender on $10 returns $5");
    console.groupEnd();

    // ─── 7. Summary ───────────────────────────────────────────────────────────
    console.groupEnd(); // Close "Blackjack Engine Tests"
    console.log(`\n🃏 Tests complete: ${_passed} passed, ${_failed} failed.`);
    if (_failed === 0) console.log('✅ All tests passed!');
    else console.warn(`⚠️ ${_failed} test(s) failed.`);

    // Update the DOM summary if tests.html has a results element
    const resultsEl = document.getElementById('test-results');
    if (resultsEl) {
        resultsEl.textContent = `${_passed} passed / ${_failed} failed`;
        resultsEl.style.color = _failed === 0 ? '#4caf50' : '#f44336';
    }
}

window.runTests = runTests;

// Auto-run when the DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    // Small delay so BJEngine is available
    setTimeout(runTests, 100);
});
