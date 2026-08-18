<section class="coinflip-wrapper">
  <!-- HERO / HEADER SECTION -->
  <div class="coinflip-hero">
    <div class="coinflip-display">
      <span class="animated-coin">🪙</span>
    </div>
    <h2>COIN FLIP ARENA</h2>
    <p>Player vs Player • Double Stakes</p>
  </div>

  <!-- SELECTION FORM -->
  <div class="form-group">
    <label class="section-label">1. SELECT YOUR SIDE</label>
    <div class="coinflip-vs-grid">
      <button type="button" class="coin-choice-btn active" data-choice="HEADS">
        <span class="choice-emoji">👑</span>
        <strong>HEADS</strong>
        <small>King</small>
      </button>
      <span class="vs-badge">VS</span>
      <button type="button" class="coin-choice-btn" data-choice="TAILS">
        <span class="choice-emoji">🦅</span>
        <strong>TAILS</strong>
        <small>Eagle</small>
      </button>
    </div>
  </div>

  <!-- BET AMOUNT SELECTION -->
  <div class="form-group">
    <label class="section-label">2. CHOOSE STAKE (ETB)</label>
    <div class="chip-grid">
      <button type="button" class="chip-btn active" data-amount="10">10 ETB</button>
      <button type="button" class="chip-btn" data-amount="50">50 ETB</button>
      <button type="button" class="chip-btn" data-amount="100">100 ETB</button>
      <button type="button" class="chip-btn" data-amount="500">500 ETB</button>
    </div>
  </div>

  <!-- CREATE CHALLENGE ACTION BUTTON -->
  <button id="create-coin-challenge" class="flip-action-btn" type="button">
    <span>⚡ CREATE CHALLENGE</span>
  </button>
  <p class="secure-text">🔒 100% Provably Fair Random System</p>
</section>

<!-- OPEN LOBBY / CHALLENGES LIST -->
<section class="bets-section mt-16">
  <div class="section-title">
    <div class="title-icon purple">🎮</div>
    <div>
      <h2>Open Challenges</h2>
      <p>Play against real players online</p>
    </div>
  </div>

  <div id="lobby-container" class="bets-container">
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading open challenges...</span>
    </div>
  </div>
</section>