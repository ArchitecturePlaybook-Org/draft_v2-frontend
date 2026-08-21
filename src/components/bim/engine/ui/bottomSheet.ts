import { state } from "../core/state";

export function setBottomSheetState(targetState: string) {
  const rightSidebar = document.getElementById("right-sidebar") || document.getElementById("sidebar-right");
  const sheetBackdrop = document.getElementById("sheet-backdrop");
  if (!rightSidebar) return;

  state.bottomSheetState = targetState;
  rightSidebar.classList.remove("sheet-closed", "sheet-peek", "sheet-half", "sheet-full");
  rightSidebar.classList.add(`sheet-${targetState}`);

  if (sheetBackdrop) {
    if (targetState === "half" || targetState === "full") {
      sheetBackdrop.classList.add("active");
    } else {
      sheetBackdrop.classList.remove("active");
    }
  }

  if (targetState === "full" || targetState === "half" || targetState === "peek") {
    rightSidebar.classList.add("visible");
    rightSidebar.style.setProperty("display", "flex", "important");
  } else if (targetState === "closed") {
    rightSidebar.classList.remove("visible");
    rightSidebar.style.setProperty("display", "none", "important");
  }
}

export function updateMobilePeekCard(name: string, type: string) {
  const peekCard = document.getElementById("mobile-peek-card");
  const peekType = document.getElementById("peek-element-type");
  const peekName = document.getElementById("peek-element-name");
  if (peekCard && peekType && peekName) {
    peekType.textContent = type;
    peekName.textContent = name;
    peekCard.style.display = "flex";

    if (window.innerWidth <= 768) {
      if (state.bottomSheetState === "closed") {
        setBottomSheetState("peek");
      }
    }
  }
}

export function initBottomSheetController() {
  const rightSidebar = document.getElementById("right-sidebar") || document.getElementById("sidebar-right");
  const sheetHandleBar = document.getElementById("sheet-handle-bar");
  const sheetBackdrop = document.getElementById("sheet-backdrop");
  const btnPeekIsolate = document.getElementById("btn-peek-isolate");
  const btnPeekHide = document.getElementById("btn-peek-hide");
  const btnPeekDetails = document.getElementById("btn-peek-details");
  const toolIsolate = document.getElementById("tool-isolate");
  const toolHide = document.getElementById("tool-hide");

  if (!rightSidebar) return;

  rightSidebar.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  if (!sheetHandleBar) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  let startTime = 0;

  const getSnapOffset = (st: string) => {
    switch (st) {
      case "full": return 0;
      case "half": return window.innerHeight * 0.28;
      case "peek": return window.innerHeight - 74;
      case "closed": default: return window.innerHeight * 1.05;
    }
  };

  sheetHandleBar.addEventListener("touchstart", (e) => {
    if (window.innerWidth > 768) return;
    isDragging = true;
    startY = e.touches[0].clientY;
    currentY = startY;
    startTime = Date.now();
    rightSidebar.classList.add("is-dragging");
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!isDragging || window.innerWidth > 768) return;
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    const baseOffset = getSnapOffset(state.bottomSheetState);
    const newOffset = Math.max(0, baseOffset + deltaY);
    rightSidebar.style.transform = `translate3d(0, ${newOffset}px, 0)`;
  }, { passive: true });

  window.addEventListener("touchend", () => {
    if (!isDragging || window.innerWidth > 768) return;
    isDragging = false;
    rightSidebar.classList.remove("is-dragging");
    rightSidebar.style.transform = "";

    const deltaY = currentY - startY;
    const elapsedTime = Date.now() - startTime;
    const velocityY = deltaY / Math.max(elapsedTime, 1);

    if (velocityY > 0.6) {
      if (state.bottomSheetState === "full") setBottomSheetState("half");
      else if (state.bottomSheetState === "half") setBottomSheetState("closed");
      else if (state.bottomSheetState === "peek") setBottomSheetState("closed");
    } else if (velocityY < -0.6) {
      if (state.bottomSheetState === "closed") setBottomSheetState("half");
      else if (state.bottomSheetState === "peek") setBottomSheetState("half");
      else if (state.bottomSheetState === "half") setBottomSheetState("full");
    } else {
      const finalY = getSnapOffset(state.bottomSheetState) + deltaY;
      const snapFull = getSnapOffset("full");
      const snapHalf = getSnapOffset("half");
      const snapClosed = getSnapOffset("closed");

      const dists = [
        { state: "full", d: Math.abs(finalY - snapFull) },
        { state: "half", d: Math.abs(finalY - snapHalf) },
        { state: "closed", d: Math.abs(finalY - snapClosed) },
      ];
      dists.sort((a, b) => a.d - b.d);
      setBottomSheetState(dists[0].state);
    }
  });

  if (sheetBackdrop) {
    sheetBackdrop.addEventListener("click", () => {
      setBottomSheetState("closed");
    });
  }

  if (btnPeekIsolate && toolIsolate) {
    btnPeekIsolate.addEventListener("click", (e) => {
      e.stopPropagation();
      toolIsolate.click();
    });
  }

  if (btnPeekHide && toolHide) {
    btnPeekHide.addEventListener("click", (e) => {
      e.stopPropagation();
      toolHide.click();
    });
  }

  if (btnPeekDetails) {
    btnPeekDetails.addEventListener("click", (e) => {
      e.stopPropagation();
      const drawer = document.getElementById("inspector-drawer");
      if (drawer) drawer.style.display = "flex";
      setBottomSheetState("full");
    });
  }

  initMobileBottomPillBar();
}

export function initMobileBottomPillBar() {
  const pillTree = document.getElementById("mobile-pill-tree");
  const pillViews = document.getElementById("mobile-pill-views");
  const pillButtons = [pillTree, pillViews];

  function setActivePill(btn: HTMLElement | null) {
    pillButtons.forEach((b) => b?.classList.remove("active"));
    btn?.classList.add("active");
  }

  if (pillTree) {
    pillTree.addEventListener("click", (e) => {
      e.stopPropagation();
      setActivePill(pillTree);
      const storeysTab = document.querySelector('.tab-btn[data-tab="tab-storeys"]') as HTMLElement | null;
      if (storeysTab) storeysTab.click();
      const drawer = document.getElementById("inspector-drawer");
      if (drawer) drawer.style.display = "none";

      if (window.innerWidth <= 768) {
        setBottomSheetState("half");
      } else {
        const sidebar = document.getElementById("right-sidebar");
        sidebar?.classList.toggle("visible");
      }
    });
  }

  if (pillViews) {
    pillViews.addEventListener("click", (e) => {
      e.stopPropagation();
      setActivePill(pillViews);
      const viewsTab = document.getElementById("tab-btn-views");
      if (viewsTab) viewsTab.click();
      const drawer = document.getElementById("inspector-drawer");
      if (drawer) drawer.style.display = "none";

      if (window.innerWidth <= 768) {
        setBottomSheetState("half");
      } else {
        const sidebar = document.getElementById("right-sidebar");
        sidebar?.classList.add("visible");
      }
    });
  }
}
