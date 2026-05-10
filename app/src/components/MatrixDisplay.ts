const ALPHABET: Record<string, number[]> = {
  "0": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,1,1, 1,0,1,0,1, 1,1,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "1": [0,0,1,0,0, 0,1,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,1,1,1,0],
  "2": [0,1,1,1,0, 1,0,0,0,1, 0,0,0,0,1, 0,0,0,1,0, 0,0,1,0,0, 0,1,0,0,0, 1,1,1,1,1],
  "3": [0,1,1,1,0, 1,0,0,0,1, 0,0,0,0,1, 0,0,1,1,0, 0,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "4": [0,0,0,1,0, 0,0,1,1,0, 0,1,0,1,0, 1,0,0,1,0, 1,1,1,1,1, 0,0,0,1,0, 0,0,0,1,0],
  "5": [1,1,1,1,1, 1,0,0,0,0, 1,1,1,1,0, 0,0,0,0,1, 0,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "6": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,0, 1,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "7": [1,1,1,1,1, 0,0,0,0,1, 0,0,0,1,0, 0,0,1,0,0, 0,1,0,0,0, 0,1,0,0,0, 0,1,0,0,0],
  "8": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "9": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,1, 0,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "A": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1],
  "B": [1,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,0],
  "C": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,1, 0,1,1,1,0],
  "D": [1,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,0],
  "E": [1,1,1,1,1, 1,0,0,0,0, 1,0,0,0,0, 1,1,1,1,0, 1,0,0,0,0, 1,0,0,0,0, 1,1,1,1,1],
  "F": [1,1,1,1,1, 1,0,0,0,0, 1,0,0,0,0, 1,1,1,1,0, 1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0],
  "G": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,0, 1,0,1,1,1, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "H": [1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1],
  "I": [0,1,1,1,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,1,1,1,0],
  "J": [0,0,1,1,1, 0,0,0,1,0, 0,0,0,1,0, 0,0,0,1,0, 0,0,0,1,0, 1,0,0,1,0, 0,1,1,0,0],
  "K": [1,0,0,0,1, 1,0,0,1,0, 1,0,1,0,0, 1,1,0,0,0, 1,0,1,0,0, 1,0,0,1,0, 1,0,0,0,1],
  "L": [1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0, 1,1,1,1,1],
  "M": [1,0,0,0,1, 1,1,0,1,1, 1,0,1,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1],
  "N": [1,0,0,0,1, 1,0,0,0,1, 1,1,0,0,1, 1,0,1,0,1, 1,0,0,1,1, 1,0,0,0,1, 1,0,0,0,1],
  "O": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "P": [1,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,0, 1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0],
  "Q": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,1,0, 0,1,1,0,1],
  "R": [1,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,0, 1,0,1,0,0, 1,0,0,1,0, 1,0,0,0,1],
  "S": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,0, 0,1,1,1,0, 0,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "T": [1,1,1,1,1, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0],
  "U": [1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "V": [1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 0,1,0,1,0, 0,0,1,0,0],
  "W": [1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,1,0,1, 1,1,0,1,1, 1,0,0,0,1],
  "X": [1,0,0,0,1, 1,0,0,0,1, 0,1,0,1,0, 0,0,1,0,0, 0,1,0,1,0, 1,0,0,0,1, 1,0,0,0,1],
  "Y": [1,0,0,0,1, 1,0,0,0,1, 0,1,0,1,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0],
  "Z": [1,1,1,1,1, 0,0,0,0,1, 0,0,0,1,0, 0,0,1,0,0, 0,1,0,0,0, 1,0,0,0,0, 1,1,1,1,1],
  " ": [0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0],
  "!": [0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,0,0,0, 0,0,1,0,0],
  "+": [0,0,0,0,0, 0,0,1,0,0, 0,0,1,0,0, 1,1,1,1,1, 0,0,1,0,0, 0,0,1,0,0, 0,0,0,0,0],
  "-": [0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0, 1,1,1,1,1, 0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0],
};

const KATAKANA = [
  "\u30A2", "\u30EB", "\u30C8", "\u30E9", "\u30B1", "\u30F3",
  "\u30E9", "\u30A4", "\u30C0", "\u30FC", "\u30D2", "\u30FC",
  "\u30ED", "\u30FC", "\u30B1", "\u30FC", "\u30B9", "\u30C8",
  "\u30B9", "\u30C8", "\u30A2", "\u30F3", "\u30C9",
];

export class MatrixDisplay {
  el: HTMLElement;
  cols: number;
  rows: number;
  dotSize: number;
  gap: number;
  dots: HTMLDivElement[] = [];

  constructor(el: HTMLElement, cols: number, rows: number, dotSize: number, gap: number) {
    this.el = el;
    this.cols = cols;
    this.rows = rows;
    this.dotSize = dotSize;
    this.gap = gap;
    this.initGrid();
  }

  initGrid() {
    this.el.innerHTML = "";
    this.dots = [];
    const totalDots = this.cols * this.rows;
    const fragment = document.createDocumentFragment();

    this.el.style.display = "grid";
    this.el.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
    this.el.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;
    this.el.style.gap = `${this.gap}px`;
    this.el.style.width = "100%";
    this.el.style.aspectRatio = `${this.cols} / ${this.rows}`;
    this.el.style.backgroundColor = "#000";

    for (let i = 0; i < totalDots; i++) {
      const dot = document.createElement("div");
      dot.className = "matrix-dot";
      dot.dataset.index = String(i);
      fragment.appendChild(dot);
      this.dots.push(dot);
    }

    this.el.appendChild(fragment);
  }

  renderText(text: string, onColor = "#00F2FF") {
    for (const dot of this.dots) {
      dot.style.backgroundColor = "";
      dot.style.boxShadow = "";
    }

    const maxChars = Math.floor(this.cols / 6);
    const cleanText = text.toUpperCase().slice(0, maxChars);
    const totalWidth = cleanText.length * 6;
    const startX = Math.floor((this.cols - totalWidth) / 2);
    const startY = Math.floor((this.rows - 7) / 2);

    for (let cIdx = 0; cIdx < cleanText.length; cIdx++) {
      const char = cleanText[cIdx];
      const map = ALPHABET[char] || ALPHABET[" "];

      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          const isActive = map[row * 5 + col];
          const dotIndex = (startY + row) * this.cols + (startX + (cIdx * 6) + col);

          if (isActive && this.dots[dotIndex]) {
            this.dots[dotIndex].style.backgroundColor = onColor;
            this.dots[dotIndex].style.boxShadow = `0 0 ${this.dotSize * 2}px ${onColor}`;
          }
        }
      }
    }
  }

  scramble(duration = 1500, onColor = "#FF00FF") {
    const startTime = Date.now();
    const keys = Object.keys(ALPHABET);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(interval);
        this.renderText("ACCESS GRANTED", "#00F2FF");
        return;
      }

      const randomText = Array.from({ length: 12 }, () =>
        keys[Math.floor(Math.random() * keys.length)]
      ).join("");
      this.renderText(randomText, onColor);
    }, 80);

    return interval;
  }

  katakanaScramble(duration = 1500) {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(interval);
        this.renderText("ACCESS GRANTED", "#00F2FF");
        return;
      }

      const randomText = Array.from({ length: 12 }, () =>
        KATAKANA[Math.floor(Math.random() * KATAKANA.length)]
      ).join("");
      this.renderText(randomText, "#FF00FF");
    }, 80);

    return interval;
  }

  destroy() {
    this.el.innerHTML = "";
    this.dots = [];
  }
}
