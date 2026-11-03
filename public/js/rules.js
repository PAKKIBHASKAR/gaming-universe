// ==========================================
// GAME RULES & HOW TO PLAY MODAL SYSTEM
// Provides rules before playing any game
// ==========================================
const GAME_RULES_DATA = {
  chess: {
    title: 'CYBER CHESS - RULES & TACTICS',
    badge: 'STRATEGY • 2 PLAYERS • AI ENGINE',
    icon: '♟️',
    summary: 'Command your neon digital fleet. Outmaneuver your opponent and deliver Checkmate to the enemy King.',
    sections: [
      {
        heading: 'Piece Movements & Protocol',
        items: [
          '♙ <b>Pawns</b>: Advance 1 step forward (2 steps on first turn). Capture 1 step diagonally forward.',
          '♘ <b>Knights</b>: Jump in an "L-shape" (2 squares in one direction, then 1 square perpendicular). The only unit that jumps over other pieces.',
          '♗ <b>Bishops</b>: Glide diagonally any number of open squares.',
          '♖ <b>Rooks</b>: Charge horizontally or vertically along open files and ranks.',
          '♕ <b>Queen</b>: The ultimate weapon. Moves any distance horizontally, vertically, or diagonally.',
          '♔ <b>King</b>: Steps 1 square in any direction. Guard him at all costs.'
        ]
      },
      {
        heading: 'Objective & Winning Condition',
        items: [
          '<b>Checkmate</b>: Attack the opposing King such that no legal escape move exists.',
          '<b>Stalemate / Draw</b>: If a player has no legal moves and is NOT in check, the match ends in a cyber draw.',
          '<b>Play vs Computer</b>: Challenge our Quantum Minimax AI engine.'
        ]
      }
    ]
  },

  carrom: {
    title: 'CYBER CARROM - RULES & POCKET PROTOCOL',
    badge: 'PHYSICS • 2-4 PLAYERS • STRIKER SIMULATION',
    icon: '🎯',
    summary: 'Flick your Striker with calibrated velocity and angles. Pocket all your assigned cyber coins before your opponents.',
    sections: [
      {
        heading: 'Coin Scoring Values',
        items: [
          '⚪ <b>White Coins</b>: 10 Points each.',
          '⚫ <b>Black Coins</b>: 5 Points each.',
          '🔴 <b>Red Queen</b>: 25 Points. Must be "covered" by sinking another coin immediately on the next shot!'
        ]
      },
      {
        heading: 'Striker Rules & Shooting',
        items: [
          '<b>Baseline Position</b>: Position your striker anywhere touching your baseline or circles.',
          '<b>Drag & Shoot</b>: Pull back to set shot power and aim the laser trajectory line.',
          '<b>Fouls</b>: If your Striker sinks into a pocket, it is a penalty foul (-1 coin penalty).',
          '<b>Modes</b>: Play solo vs Computer or gather 2 to 4 players for an intense table battle.'
        ]
      }
    ]
  },

  ludo: {
    title: 'CYBER LUDO - RULES & RACE TO HOME',
    badge: 'BOARD RACE • 2 TO 4 PLAYERS • DICE SIMULATION',
    icon: '🎲',
    summary: 'Roll the holographic dice, break your tokens out of the galactic hangar, and guide all 4 tokens safely into the cosmic home triangle.',
    sections: [
      {
        heading: 'Movement & Dice Rules',
        items: [
          '<b>Deploy Token (Roll 6)</b>: You MUST roll a 6 to release a token from the base onto the active track.',
          '<b>Bonus Turn on 6</b>: Rolling a 6 grants an immediate extra dice roll!',
          '<b>Capturing Opponents</b>: Landing exactly on an opponent’s token captures it, sending it straight back to their base and giving you a bonus roll.'
        ]
      },
      {
        heading: 'Safe Zones & Victory',
        items: [
          '⭐ <b>Star Cells</b>: Tokens resting on Star cells are shielded by force fields and CANNOT be captured.',
          '<b>Home Stretch</b>: Tokens navigate into their colored runway where opponents cannot enter.',
          '<b>Victory</b>: The first player to successfully escort all 4 tokens into the central Home core wins!'
        ]
      }
    ]
  },

  snakes: {
    title: 'SNAKES & LADDERS - RULES & TRAJECTORY',
    badge: 'CLASSIC ARCADE • 2 TO 4 PLAYERS • PORTALS & TRAPS',
    icon: '🐍',
    summary: 'Climb neon energy ladders and evade digital cyber-snakes on your 100-cell journey to the finish line.',
    sections: [
      {
        heading: 'Board Mechanics',
        items: [
          '<b>Dice Roll</b>: Roll the dice each turn to advance from tile 1 towards tile 100.',
          '🪜 <b>Ladders (Boosters)</b>: Landing on the base of a ladder teleports your avatar directly to the top rung.',
          '🐍 <b>Snakes (Cyber Glitches)</b>: Landing on the head of a snake causes your token to slide down to its tail.',
          '<b>Roll 6</b>: Rolling a 6 gives an immediate extra turn.'
        ]
      },
      {
        heading: 'Victory Condition',
        items: [
          '<b>Exact Landing on 100</b>: You must reach tile 100 with an exact roll to claim victory. Excess roll numbers bounce back!',
          '<b>Supports 2, 3, or 4 Players</b>: Play with smart AI bots or invite friends via shareable room links.'
        ]
      }
    ]
  }
};

class RulesModal {
  constructor() {
    this.modalEl = document.getElementById('rules-modal');
    this.targetGame = null;
    this.onConfirmCallback = null;
    this.bindEvents();
  }

  bindEvents() {
    const startBtn = document.getElementById('rules-start-game-btn');
    const closeBtn = document.getElementById('rules-close-btn');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        window.soundFX && window.soundFX.click();
        this.hide();
        if (this.onConfirmCallback) {
          this.onConfirmCallback();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }
  }

  show(gameType, onConfirm) {
    this.targetGame = gameType;
    this.onConfirmCallback = onConfirm;

    const data = GAME_RULES_DATA[gameType];
    if (!data) return;

    document.getElementById('rules-game-icon').textContent = data.icon;
    document.getElementById('rules-game-title').textContent = data.title;
    document.getElementById('rules-game-badge').textContent = data.badge;
    document.getElementById('rules-summary').textContent = data.summary;

    const contentContainer = document.getElementById('rules-sections-container');
    contentContainer.innerHTML = '';

    data.sections.forEach(sec => {
      const secDiv = document.createElement('div');
      secDiv.className = 'rules-section-card';
      secDiv.innerHTML = `
        <h4 class="rules-sec-heading">${sec.heading}</h4>
        <ul class="rules-list">
          ${sec.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      `;
      contentContainer.appendChild(secDiv);
    });

    this.modalEl.classList.remove('hidden');
    window.soundFX && window.soundFX.click();
  }

  hide() {
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }
}

window.rulesModal = new RulesModal();
