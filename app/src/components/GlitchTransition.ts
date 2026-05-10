import gsap from 'gsap';

export class GlitchTransition {
  dom: HTMLElement | null;
  innerHTML: string;
  col_1: Element | null;
  col_2: Element | null;
  col_3: Element | null;
  col_4: Element | null;
  isPlaying: boolean;

  constructor(imageUrl: string = "/img/reward-wallpaper.jpg") {
    this.dom = document.querySelector(".transition-container");
    this.innerHTML = `<div class="glitch-col col-1"><div class="glitch-img glitch-1" style="background-image: url(${imageUrl}); left: 0;"></div></div><div class="glitch-col col-2"><div class="glitch-img glitch-2" style="background-image: url(${imageUrl}); left: -25vw;"></div></div><div class="glitch-col col-3"><div class="glitch-img glitch-3" style="background-image: url(${imageUrl}); left: -50vw;"></div></div><div class="glitch-col col-4"><div class="glitch-img glitch-4" style="background-image: url(${imageUrl}); left: -75vw;"></div></div>`;

    if (this.dom) {
      this.dom.innerHTML = this.innerHTML;
      this.col_1 = document.querySelector(".col-1");
      this.col_2 = document.querySelector(".col-2");
      this.col_3 = document.querySelector(".col-3");
      this.col_4 = document.querySelector(".col-4");
    } else {
      this.col_1 = null;
      this.col_2 = null;
      this.col_3 = null;
      this.col_4 = null;
    }

    this.isPlaying = false;
  }

  generateRandomNumber(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  init(onComplete?: () => void) {
    if (!this.dom || this.isPlaying) return;
    this.isPlaying = true;

    this.dom.classList.add("active");

    const tlShow = gsap.timeline();
    tlShow.to(this.dom, {
      duration: 0.3,
      opacity: 1,
    });

    tlShow.call(() => {
      if (this.col_1) {
        gsap.to(this.col_1, {
          duration: 0.05,
          ease: "power1.inOut",
          yPercent: this.generateRandomNumber(-100, 100),
          skewY: this.generateRandomNumber(-10, 10),
        });
      }
      if (this.col_2) {
        gsap.to(this.col_2, {
          duration: 0.05,
          ease: "power1.inOut",
          yPercent: this.generateRandomNumber(-100, 100),
          skewY: this.generateRandomNumber(-10, 10),
        });
      }
      if (this.col_3) {
        gsap.to(this.col_3, {
          duration: 0.05,
          ease: "power1.inOut",
          yPercent: this.generateRandomNumber(-100, 100),
          skewY: this.generateRandomNumber(-10, 10),
        });
      }
      if (this.col_4) {
        gsap.to(this.col_4, {
          duration: 0.05,
          ease: "power1.inOut",
          yPercent: this.generateRandomNumber(-100, 100),
          skewY: this.generateRandomNumber(-10, 10),
        });
      }
    });

    const tlEnter = gsap.timeline({ delay: 0.25 });
    const cols = [this.col_1, this.col_2, this.col_3, this.col_4].filter(Boolean);

    tlEnter.to(cols, {
      duration: 0.25,
      ease: "power1.inOut",
      yPercent: 0,
      skewY: 0,
    });

    tlEnter.fromTo(
      cols,
      { scaleY: 1.5 },
      { duration: 1, scaleY: 1, ease: "expo.out" },
      0
    );

    tlEnter.call(() => {
      if (onComplete) onComplete();
    }, [], "+=0.5");
  }

  hide() {
    if (!this.dom) return;
    gsap.to(this.dom, {
      duration: 0.5,
      opacity: 0,
      onComplete: () => {
        this.dom?.classList.remove("active");
        this.isPlaying = false;
        if (this.dom) this.dom.innerHTML = "";
      },
    });
  }
}
