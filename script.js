// --- Helper: Column Labels (A, B, ... Z, AA, AB, etc.) ---
function colLabel(n) {
  let label = '';
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

// --- Globals for Descriptions (fetched from descriptions.json) ---
let DESCRIPTIONS = ["Nothing here."]; // fallback in case JSON fails

// Fetch descriptions.json and trigger first map generation
fetch('descriptions.json')
  .then(res => res.json())
  .then(json => {
    if (Array.isArray(json.descriptions)) DESCRIPTIONS = json.descriptions;
    doGenerate();
  })
  .catch(() => {
    // fallback in case of fetch error
    doGenerate();
  });

// --- Hint Definitions ---
const hintTypes = [
  { dir: 'N', label: 'north', dx: 0, dy: -1 },
  { dir: 'S', label: 'south', dx: 0, dy: 1 },
  { dir: 'W', label: 'west', dx: -1, dy: 0 },
  { dir: 'E', label: 'east', dx: 1, dy: 0 }
];

// --- Map Generator ---
function generateMap(rows, cols, chestCount, hintCount, searchAgainCount) {
  // All possible cell coords
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c });

  // Fisher-Yates Shuffle
  function shuffle(arr) {
    let a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Place chests
  let shuffled = shuffle(cells);
  const chests = shuffled.slice(0, chestCount).map(({r, c}) => ({
    r, c, coins: 1 + Math.floor(Math.random() * 3)
  }));

  const isChest = Array.from({length: rows}, () => Array(cols).fill(false));
  chests.forEach(({r, c}) => { isChest[r][c] = true; });

  // Place hints (only in non-chest cells)
  shuffled = shuffle(cells.filter(({r, c}) => !isChest[r][c]));
  let hints = [];
  for (let i = 0; i < hintCount && i < shuffled.length; i++) {
    const {r, c} = shuffled[i];
    const dir = hintTypes[Math.floor(Math.random() * hintTypes.length)];
    let count = 0, rr = r + dir.dy, cc = c + dir.dx;
    while (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
      if (isChest[rr][cc]) count++;
      rr += dir.dy; cc += dir.dx;
    }
    let content;
    if (Math.random() < 0.5) {
      if (count > 0) content = `There is at least one treasure to the ${dir.label}.`;
      else content = `There are no chests to the ${dir.label}.`;
    } else {
      let neighbors = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && isChest[nr][nc]) neighbors++;
      }
      if (neighbors === 0) content = "There are no chests in the neighborhood of this field.";
      else if (neighbors === 1) content = "There is exactly one chest nearby.";
      else content = `There are ${neighbors} chests in the neighborhood.`;
    }
    hints.push({ r, c, content });
  }
  const isHint = Array.from({length: rows}, () => Array(cols).fill(null));
  hints.forEach(({ r, c, content }) => { isHint[r][c] = content; });

  // Place "search again"
  const nonSpecial = cells.filter(({ r, c }) => !isChest[r][c] && !isHint[r][c]);
  shuffled = shuffle(nonSpecial);
  const searchAgain = shuffled.slice(0, searchAgainCount);
  const isSearchAgain = Array.from({length: rows}, () => Array(cols).fill(false));
  searchAgain.forEach(({ r, c }) => { isSearchAgain[r][c] = true; });

  // Fill the grid
  const fieldContent = Array.from({length: rows}, () => Array(cols).fill(""));
  // Chests
  chests.forEach(({ r, c, coins }) => fieldContent[r][c] = `Treasure chest (${coins} coin${coins>1?'s':''})`);
  // Hints
  hints.forEach(({ r, c, content }) => fieldContent[r][c] = content);
  // Search again
  searchAgain.forEach(({ r, c }) => fieldContent[r][c] = "Search again!");
  // All other cells: random description from DESCRIPTIONS
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!fieldContent[r][c]) {
      fieldContent[r][c] = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];
    }
  }

  return fieldContent;
}

// --- Renderers ---
function renderGrid(fieldContent) {
  const rows = fieldContent.length, cols = fieldContent[0].length;
  const grid = document.createElement('div');
  // Column labels
  const headerRow = document.createElement('div');
  headerRow.className = "grid-row";
  const corner = document.createElement('div'); corner.className = "grid-cell"; corner.style.background = "none";
  headerRow.appendChild(corner);
  for (let c = 0; c < cols; c++) {
    const colCell = document.createElement('div');
    colCell.className = "grid-cell";
    colCell.style.background = "#c0edcf";
    colCell.textContent = colLabel(c);
    headerRow.appendChild(colCell);
  }
  grid.appendChild(headerRow);

  for (let r = 0; r < rows; r++) {
    const rowDiv = document.createElement('div'); rowDiv.className = "grid-row";
    const rowLabel = document.createElement('div');
    rowLabel.className = "grid-cell"; rowLabel.textContent = (r + 1);
    rowLabel.style.background = "#c0edcf";
    rowDiv.appendChild(rowLabel);

    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = "grid-cell";
      cell.textContent = colLabel(c) + (r + 1);

      // Tooltip on hover
      cell.onmouseenter = () => {
        let tip = document.createElement('div');
        tip.className = 'tooltip';
        tip.textContent = fieldContent[r][c];
        cell.appendChild(tip);
      };
      cell.onmouseleave = () => {
        let tip = cell.querySelector('.tooltip');
        if (tip) tip.remove();
      };
      rowDiv.appendChild(cell);
    }
    grid.appendChild(rowDiv);
  }
  return grid;
}

function renderList(fieldContent) {
  let out = [];
  const rows = fieldContent.length, cols = fieldContent[0].length;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push(`${colLabel(c)}${r + 1}: ${fieldContent[r][c]}`);
  return out.join('\n');
}

// --- Main action ---
function doGenerate() {
  const rows = parseInt(document.getElementById('rows').value, 10);
  const cols = parseInt(document.getElementById('cols').value, 10);
  const chests = parseInt(document.getElementById('chests').value, 10);
  const hints = parseInt(document.getElementById('hints').value, 10);
  const searchAgain = parseInt(document.getElementById('searchAgain').value, 10);

  const fieldContent = generateMap(rows, cols, chests, hints, searchAgain);

  // Grid
  const grid = renderGrid(fieldContent);
  const gridDiv = document.getElementById('grid');
  gridDiv.innerHTML = '';
  gridDiv.appendChild(grid);

  // List
  document.getElementById('list').textContent = renderList(fieldContent);
}

// Hook up the button (will run after fetch if descriptions.json loads)
document.getElementById('generate').onclick = doGenerate;
