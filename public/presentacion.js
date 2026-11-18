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

    if (updateHistory) {
      history.replaceState(null, "", `#slide-${currentIndex + 1}`);
    }
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
