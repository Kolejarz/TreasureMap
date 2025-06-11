// Utility for column letters (A, B, ... Z, AA, AB ...)
function colLabel(n) {
  let label = '';
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

// Funny things to put in empty cells
const funnyThings = [
  "a bunch of berries", "a sneaky beetle", "a shiny stick", "a pinecone",
  "a blue mushroom", "a squirrel", "a fairy footprint", "a weird stone",
  "an owl feather", "a frog", "a butterfly", "a sleepy gnome"
];

// Types for hints
const hintTypes = [
  { dir: 'N', label: 'north', dx: 0, dy: -1 },
  { dir: 'S', label: 'south', dx: 0, dy: 1 },
  { dir: 'W', label: 'west', dx: -1, dy: 0 },
  { dir: 'E', label: 'east', dx: 1, dy: 0 }
];

function generateMap(rows, cols, chestCount, hintCount, searchAgainCount, funnyCount) {
  // Build cell index list
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ r, c });
    }
  }

  // Shuffle utility
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
  const chests = shuffled.slice(0, chestCount).map(({r, c}) => ({ r, c, coins: 1 + Math.floor(Math.random()*3) }));

  // Mark chests on a map
  const isChest = Array.from({length: rows}, () => Array(cols).fill(false));
  chests.forEach(({r, c}) => { isChest[r][c] = true; });

  // Hints: only on non-chest cells
  shuffled = shuffle(cells.filter(({r, c}) => !isChest[r][c]));
  let hints = [];
  for (let i = 0; i < hintCount && i < shuffled.length; i++) {
    const {r, c} = shuffled[i];
    // Randomly pick a hint type
    const dir = hintTypes[Math.floor(Math.random()*hintTypes.length)];
    let count = 0, rr = r+dir.dy, cc = c+dir.dx;
    // Look in that direction until end of board
    while (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
      if (isChest[rr][cc]) count++;
      rr += dir.dy; cc += dir.dx;
    }
    // Sometimes, instead, put a neighborhood or "none in neighborhood" hint
    let content;
    if (Math.random() < 0.5) {
      if (count > 0) content = `There is at least one treasure to the ${dir.label}.`;
      else content = `There are no chests to the ${dir.label}.`;
    } else {
      // Count chests in 8-neighbor cells
      let neighbors = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r+dr, nc = c+dc;
        if (nr>=0 && nr<rows && nc>=0 && nc<cols && isChest[nr][nc]) neighbors++;
      }
      if (neighbors === 0) content = "There are no chests in the neighborhood of this field.";
      else if (neighbors === 1) content = "There is exactly one chest nearby.";
      else content = `There are ${neighbors} chests in the neighborhood.`;
    }
    hints.push({r, c, content});
  }
  // Mark hints on map
  const isHint = Array.from({length: rows}, () => Array(cols).fill(null));
  hints.forEach(({r,c,content}) => { isHint[r][c] = content; });

  // Place "search again" and funny things, then fill rest with "nothing"
  const left = cells.filter(({r,c}) => !isChest[r][c] && !isHint[r][c]);
  shuffled = shuffle(left);
  const searchAgain = shuffled.slice(0, searchAgainCount);
  const funny = shuffled.slice(searchAgainCount, searchAgainCount+funnyCount);
  // Rest is empty
  const empty = shuffled.slice(searchAgainCount+funnyCount);

  // Build the final map
  const fieldContent = Array.from({length: rows}, () => Array(cols).fill(""));
  // Place chests
  chests.forEach(({r,c,coins}) => fieldContent[r][c] = `Treasure chest (${coins} coins)`);
  // Place hints
  hints.forEach(({r,c,content}) => fieldContent[r][c] = content);
  // Search again
  searchAgain.forEach(({r,c}) => fieldContent[r][c] = "Search again!");
  // Funny things
  funny.forEach(({r,c},i) => fieldContent[r][c] = funnyThings[i % funnyThings.length]);
  // Empty
  empty.forEach(({r,c}) => fieldContent[r][c] = "Nothing here.");

  return fieldContent;
}

// Generate the grid/table
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
    rowLabel.className = "grid-cell"; rowLabel.textContent = (r+1);
    rowLabel.style.background = "#c0edcf";
    rowDiv.appendChild(rowLabel);

    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = "grid-cell";
      cell.textContent = colLabel(c)+(r+1);

      // Tooltip on hover
      cell.onmouseenter = (e) => {
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

// Output as text list
function renderList(fieldContent) {
  let out = [];
  const rows = fieldContent.length, cols = fieldContent[0].length;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push(`${colLabel(c)}${r+1}: ${fieldContent[r][c]}`);
  return out.join('\n');
}

// Set up
function doGenerate() {
  const rows = parseInt(document.getElementById('rows').value,10);
  const cols = parseInt(document.getElementById('cols').value,10);
  const chests = parseInt(document.getElementById('chests').value,10);
  const hints = parseInt(document.getElementById('hints').value,10);
  const searchAgain = parseInt(document.getElementById('searchAgain').value,10);
  const funny = parseInt(document.getElementById('funny').value,10);

  const fieldContent = generateMap(rows, cols, chests, hints, searchAgain, funny);

  // Grid
  const grid = renderGrid(fieldContent);
  const gridDiv = document.getElementById('grid');
  gridDiv.innerHTML = '';
  gridDiv.appendChild(grid);

  // List
  document.getElementById('list').textContent = renderList(fieldContent);
}

document.getElementById('generate').onclick = doGenerate;
window.onload = doGenerate;
