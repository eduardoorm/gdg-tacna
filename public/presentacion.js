(() => {
  const slides = [...document.querySelectorAll(".slide:not(.is-removed)")];
  const currentLabel = document.querySelector("#current-slide");
  const totalLabel = document.querySelector("#total-slides");
  const progress = document.querySelector("#progress-fill");
  const previousButton = document.querySelector(".prev-button");
  const nextButton = document.querySelector(".next-button");
  const fullscreenButton = document.querySelector(".fullscreen-button");
  const deck = document.querySelector("#deck");
  let currentIndex = 0;
  let touchStartX = 0;

  const formatNumber = (number) => String(number).padStart(2, "0");
  totalLabel.textContent = formatNumber(slides.length);
  const coverIndex = document.querySelector(".cover-index");
  if (coverIndex)
    coverIndex.innerHTML = `01 <b>/</b> ${formatNumber(slides.length)}`;

  function showSlide(index, updateHistory = true) {
    currentIndex = Math.max(0, Math.min(index, slides.length - 1));

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === currentIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      if (isActive) slide.scrollTop = 0;
    });

    currentLabel.textContent = formatNumber(currentIndex + 1);
    progress.style.width = `${((currentIndex + 1) / slides.length) * 100}%`;
    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === slides.length - 1;

    runVideos.forEach((video) =>
      slides[currentIndex].contains(video.root) ? video.enter() : video.leave(),
    );

    if (updateHistory) {
      history.replaceState(null, "", `#slide-${currentIndex + 1}`);
    }
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // ---- Animación tipo video: workflow → evento push → Action ejecutándose ----
  // Cada elemento declara su momento en la línea de tiempo:
  //   data-at="s"               → clase "on" desde el segundo s
  //   data-from / data-to       → "is-running" entre ambos, "is-done" después
  //   data-type + -from / -to   → texto que se escribe letra por letra
  //   data-states="0=a;6.8=b"   → cambia el texto según el segundo
  //   data-timer                → cronómetro del job
  function createRunVideo(root) {
    const total = Number(root.dataset.duration) || 17;
    const num = (value) => Number(value);
    const timed = [...root.querySelectorAll("[data-at]")].map((el) => ({
      el,
      at: num(el.dataset.at),
    }));
    const ranged = [...root.querySelectorAll("[data-from]")].map((el) => ({
      el,
      from: num(el.dataset.from),
      to: num(el.dataset.to),
    }));
    const typers = [...root.querySelectorAll("[data-type]")].map((el) => ({
      el,
      text: el.dataset.type,
      from: num(el.dataset.typeFrom),
      to: num(el.dataset.typeTo),
    }));
    const stated = [...root.querySelectorAll("[data-states]")].map((el) => ({
      el,
      states: el.dataset.states.split(";").map((pair) => {
        const cut = pair.indexOf("=");
        return [Number(pair.slice(0, cut)), pair.slice(cut + 1)];
      }),
    }));
    const timers = [...root.querySelectorAll("[data-timer]")].map((el) => ({
      el,
      from: num(el.dataset.timerFrom),
      to: num(el.dataset.timerTo),
      max: num(el.dataset.timerMax),
    }));
    const chapters = [...root.querySelectorAll("[data-chapter]")].map((el) => ({
      el,
      at: num(el.dataset.chapter),
    }));
    const fill = root.querySelector(".rv-fill");
    const clock = root.querySelector(".rv-time");
    const track = root.querySelector(".rv-track");
    const playButton = root.querySelector(".rv-play");

    let t = 0;
    let active = false;
    let wantPlay = !reduceMotion;
    let frame = 0;
    let last = 0;

    chapters.forEach((chapter) => {
      chapter.el.style.left = `${(chapter.at / total) * 100}%`;
    });

    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const setText = (el, value) => {
      if (el.textContent !== value) el.textContent = value;
    };
    const fmt = (seconds) => `00:${String(Math.floor(seconds)).padStart(2, "0")}`;

    function render() {
      timed.forEach(({ el, at }) => el.classList.toggle("on", t >= at));
      ranged.forEach(({ el, from, to }) => {
        el.classList.toggle("is-running", t >= from && t < to);
        el.classList.toggle("is-done", t >= to);
      });
      typers.forEach(({ el, text, from, to }) => {
        const k = clamp01((t - from) / (to - from));
        setText(el, text.slice(0, Math.round(k * text.length)));
      });
      stated.forEach(({ el, states }) => {
        let value = states[0][1];
        states.forEach(([at, label]) => {
          if (t >= at) value = label;
        });
        setText(el, value);
      });
      timers.forEach(({ el, from, to, max }) => {
        setText(el, `${Math.round(clamp01((t - from) / (to - from)) * max)}s`);
      });
      chapters.forEach((chapter, i) => {
        const next = chapters[i + 1];
        chapter.el.classList.toggle(
          "is-current",
          t >= chapter.at && (!next || t < next.at),
        );
      });
      fill.style.width = `${(t / total) * 100}%`;
      setText(clock, `${fmt(t)} / ${fmt(total)}`);
    }

    function tick(now) {
      t += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (t >= total) t = 0; // vuelve a empezar, como un video en loop
      render();
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      cancelAnimationFrame(frame);
      root.classList.toggle("is-paused", !wantPlay);
      playButton.setAttribute(
        "aria-label",
        wantPlay ? "Pausar animación" : "Reproducir animación",
      );
      if (active && wantPlay) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    playButton.addEventListener("click", () => {
      wantPlay = !wantPlay;
      sync();
      playButton.blur(); // devuelve las flechas del teclado a la presentación
    });

    track.addEventListener("click", (event) => {
      const rect = track.getBoundingClientRect();
      if (!rect.width) return;
      t = clamp01((event.clientX - rect.left) / rect.width) * (total - 0.01);
      render();
    });

    return {
      root,
      enter() {
        if (active) return;
        active = true;
        wantPlay = !reduceMotion;
        t = reduceMotion ? total - 0.01 : 0;
        render();
        sync();
      },
      leave() {
        if (!active) return;
        active = false;
        sync();
      },
    };
  }

  const runVideos = [...document.querySelectorAll("[data-run-video]")].map(
    createRunVideo,
  );

  // ---- Diapositiva del speaker: inclinación 3D siguiendo el mouse ----
  if (!reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      const host = el.closest(".slide");
      host.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse") return;
        const rect = host.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
        el.style.setProperty("--tilt-x", `${(-y * 9).toFixed(2)}deg`);
      });
      host.addEventListener("pointerleave", () => {
        el.style.removeProperty("--tilt-x");
        el.style.removeProperty("--tilt-y");
      });
    });
  }

  function fromHash() {
    const match = window.location.hash.match(/^#slide-(\d+)$/);
    if (match) showSlide(Number(match[1]) - 1, false);
  }

  previousButton.addEventListener("click", () => showSlide(currentIndex - 1));
  nextButton.addEventListener("click", () => showSlide(currentIndex + 1));

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("a, button, input, textarea, select")) {
      if (event.key !== "Escape") return;
    }

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
        event.preventDefault();
        showSlide(currentIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        event.preventDefault();
        showSlide(currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        showSlide(0);
        break;
      case "End":
        event.preventDefault();
        showSlide(slides.length - 1);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "Escape":
        if (document.fullscreenElement) document.exitFullscreen();
        break;
      default:
        break;
    }
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      deck.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  fullscreenButton.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    const isFullscreen = Boolean(document.fullscreenElement);
    fullscreenButton.setAttribute(
      "aria-label",
      isFullscreen ? "Salir de pantalla completa" : "Activar pantalla completa",
    );
    fullscreenButton.title = isFullscreen
      ? "Salir de pantalla completa"
      : "Pantalla completa";
  });

  deck.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0].clientX;
    },
    { passive: true },
  );

  deck.addEventListener(
    "touchend",
    (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) < 55) return;
      showSlide(currentIndex + (distance < 0 ? 1 : -1));
    },
    { passive: true },
  );

  window.addEventListener("hashchange", fromHash);
  fromHash();
  showSlide(currentIndex, false);
})();
