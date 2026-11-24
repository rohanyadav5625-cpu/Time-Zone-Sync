// State Management
let participants = [];
let allSupportedZones = [];
let selectedSlotIndex = 48; // 48 x 15 mins = 12:00 UTC
let meetingDurationMinutes = 60;
let is24HourFormat = true;
let isDarkTheme = false;
let selectedDateStr = new Date().toISOString().split("T")[0];
let isDraggingTimeline = false;
let deferredInstallPrompt = null;

// Tour Guide State
let currentTourStep = 0;

const POPULAR_CITIES = {
  "India (IST)": "Asia/Kolkata",
  "Delhi": "Asia/Kolkata",
  "Mumbai": "Asia/Kolkata",
  "Bengaluru": "Asia/Kolkata",
  "Ghaziabad": "Asia/Kolkata",
  "Kolkata": "Asia/Kolkata",
  "New York": "America/New_York",
  "London": "Europe/London",
  "Tokyo": "Asia/Tokyo",
  "Sydney": "Australia/Sydney",
  "Berlin": "Europe/Berlin",
  "Paris": "Europe/Paris",
  "San Francisco": "America/Los_Angeles",
  "Dubai": "Asia/Dubai",
  "Singapore": "Asia/Singapore"
};

const TOUR_STEPS = [
  {
    targetId: "tour-step-add-member",
    arrow: "↓ Column 1: Add Team Member",
    title: "Add Team Members & Time Zones",
    description:
      "Type a city or zone in the filter box, enter an optional member name, select India (IST) or any world city/zone, and click + Add to include them in the planner."
  },
  {
    targetId: "tour-step-controls",
    arrow: "↓ Column 2: Date, Duration & UTC Slider",
    title: "Control Meeting Time & Duration",
    description:
      "Choose a DST-aware meeting date, set duration (30m to 2h), and move the UTC slider or use Left/Right arrow keys to shift the meeting window."
  },
  {
    targetId: "tour-step-timelines",
    arrow: "↓ Column 3: Interactive Participant Timelines",
    title: "Inspect Local Hours & Drag Timelines",
    description:
      "Each row shows local time, working hours, +1 Day / -1 Day shifts, and color-coded hours. Drag across any timeline bar to pick a time slot directly."
  },
  {
    targetId: "tour-step-heatmap",
    arrow: "↓ Column 4: Weekly Fairness Heatmap",
    title: "Spot Best Hours Across the Week",
    description:
      "Compare Mon–Sun discomfort scores across all 24 UTC hours. Click any cell to jump straight to that hour."
  },
  {
    targetId: "tour-step-sidebar",
    arrow: "→ Right Column: Suggestions, Invites & Saved Teams",
    title: "Optimal Slots, Calendar Links & Team Backup",
    description:
      "Click top-scored slots to apply them, open Google Calendar or Outlook with 1 click, check +6 month DST shifts, and save or export/import teams as JSON."
  },
  {
    targetId: "tour-step-footer",
    arrow: "↓ Bottom Bar: About, Privacy Policy & Guide",
    title: "App Info, Privacy & Re-open Guide",
    description:
      "Open About or Privacy Policy anytime from here, and click the Guide button whenever you want to review this walkthrough again."
  }
];

// DOM Elements
const installAppBtn = document.getElementById("install-app-btn");
const zoneSearchInput = document.getElementById("zone-search-input");
const personLabelInput = document.getElementById("person-label-input");
const citySelect = document.getElementById("city-select");
const popularOptgroup = document.getElementById("popular-optgroup");
const allZonesOptgroup = document.getElementById("all-zones-optgroup");
const zoneCountBadge = document.getElementById("zone-count-badge");
const addPersonBtn = document.getElementById("add-person-btn");
const participantsList = document.getElementById("participants-list");
const meetingDateInput = document.getElementById("meeting-date-input");
const timeSlider = document.getElementById("time-slider");
const computedSlotOutput = document.getElementById("computed-slot-output");
const slotsResults = document.getElementById("slots-results");
const dstShiftList = document.getElementById("dst-shift-list");
const durationSelect = document.getElementById("duration-select");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const clockFormatBtn = document.getElementById("clock-format-btn");
const saveTeamBtn = document.getElementById("save-team-btn");
const copyInviteBtn = document.getElementById("copy-invite-btn");
const shareLinkBtn = document.getElementById("share-link-btn");
const exportIcsBtn = document.getElementById("export-ics-btn");
const weeklyHeatmap = document.getElementById("weekly-heatmap");
const googleCalLink = document.getElementById("google-cal-link");
const outlookCalLink = document.getElementById("outlook-cal-link");
const exportJsonBtn = document.getElementById("export-json-btn");
const importJsonBtn = document.getElementById("import-json-btn");
const importJsonFile = document.getElementById("import-json-file");

// Footer & Modals
const footerAboutBtn = document.getElementById("footer-about-btn");
const footerPrivacyBtn = document.getElementById("footer-privacy-btn");
const footerGuideBtn = document.getElementById("footer-guide-btn");

const tourOverlay = document.getElementById("tour-guide-overlay");
const tourSpotlight = document.getElementById("tour-spotlight");
const tourCallout = document.getElementById("tour-callout");
const tourStepCounter = document.getElementById("tour-step-counter");
const tourArrowText = document.getElementById("tour-arrow-text");
const tourTitle = document.getElementById("tour-title");
const tourDescription = document.getElementById("tour-description");
const tourPrevBtn = document.getElementById("tour-prev-btn");
const tourNextBtn = document.getElementById("tour-next-btn");
const tourSkipBtn = document.getElementById("tour-skip-btn");
const tourDoneSkipBtn = document.getElementById("tour-done-skip-btn");

const infoModalBackdrop = document.getElementById("info-modal-backdrop");
const infoModalTitle = document.getElementById("info-modal-title");
const infoModalBody = document.getElementById("info-modal-body");
const infoModalClose = document.getElementById("info-modal-close");
const infoModalOk = document.getElementById("info-modal-ok");

// PWA Registration & Install Prompt
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Ignore registration error on restricted file:// origins
      });
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installAppBtn) {
      installAppBtn.classList.remove("hidden");
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (installAppBtn) {
      installAppBtn.classList.add("hidden");
    }
    showStatusMessage("TimeSync Pro installed!");
  });

  if (installAppBtn) {
    installAppBtn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installAppBtn.classList.add("hidden");
    });
  }
}

// Toast Helper (English notifications)
function showStatusMessage(message) {
  let toast = document.getElementById("status-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "status-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: max(16px, env(safe-area-inset-bottom));
      right: max(16px, env(safe-area-inset-right));
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
      z-index: 9999;
      transition: opacity 0.25s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = "1";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
  }, 2500);
}

// Safe Clipboard Helper
async function copyToClipboardSafe(text, successMsg) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showStatusMessage(successMsg);
      return;
    }
  } catch (err) {
    // Fallback below
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
    showStatusMessage(successMsg);
  } catch (err) {
    showStatusMessage("Unable to copy. Please copy manually.");
  } finally {
    document.body.removeChild(textarea);
  }
}

// Date & Timezone Math
function getSelectedUtcDate(slotIdx = selectedSlotIndex, dateOverride = selectedDateStr) {
  const [year, month, day] = (dateOverride || new Date().toISOString().split("T")[0])
    .split("-")
    .map(Number);
  const totalMinutes = slotIdx * 15;
  return new Date(
    Date.UTC(year, month - 1, day, Math.floor(totalMinutes / 60), totalMinutes % 60, 0)
  );
}

function getLocalTimeParts(timeZone, utcDate) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false
  });
  const parts = formatter.formatToParts(utcDate);
  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10) % 24;
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  return {
    year,
    month,
    day,
    isoDate: `${year}-${month}-${day}`,
    hour,
    minute,
    weekday
  };
}

function getDayShiftLabel(localIsoDate, utcDate) {
  const utcIsoDate = utcDate.toISOString().split("T")[0];
  if (localIsoDate > utcIsoDate) return "+1 Day";
  if (localIsoDate < utcIsoDate) return "-1 Day";
  return "";
}

function getZoneOffset(timeZone, date = getSelectedUtcDate()) {
  try {
    const format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset"
    });
    const parts = format.formatToParts(date);
    return parts.find((p) => p.type === "timeZoneName")?.value || "UTC";
  } catch (e) {
    return "UTC";
  }
}

function formatHourLabel(hour24) {
  const h = ((hour24 % 24) + 24) % 24;
  if (is24HourFormat) {
    return `${String(h).padStart(2, "0")}:00`;
  }
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

function formatSlotTime(totalMinutes, suffix = "UTC") {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const mins = wrapped % 60;

  if (is24HourFormat) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}${suffix ? " " + suffix : ""}`;
  }
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${period}${suffix ? " " + suffix : ""}`;
}

function getCustomHourCategory(hour, workStart = 9, workEnd = 17) {
  const start = Math.max(0, Math.min(23, Number(workStart) || 9));
  const end = Math.max(1, Math.min(24, Number(workEnd) || 17));

  const inWork = start < end
    ? hour >= start && hour < end
    : hour >= start || hour < end;

  if (inWork) {
    return { label: "Work", class: "status-work", score: 0 };
  }

  const flexStart = (start - 2 + 24) % 24;
  const flexEnd = (end + 4) % 24;
  const inFlex = flexStart < flexEnd
    ? hour >= flexStart && hour < flexEnd
    : hour >= flexStart || hour < flexEnd;

  if (inFlex) {
    return { label: "Flex", class: "status-early", score: 1 };
  }

  return { label: "Night", class: "status-night", score: 3 };
}

// Initialization
function init() {
  registerServiceWorker();

  allSupportedZones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : Object.values(POPULAR_CITIES);

  renderZoneDropdown("");
  loadStateFromURL();

  if (participants.length === 0) {
    participants = [
      { id: 1, name: "India", timeZone: "Asia/Kolkata", workStart: 9, workEnd: 18 },
      { id: 2, name: "New York", timeZone: "America/New_York", workStart: 9, workEnd: 17 },
      { id: 3, name: "London", timeZone: "Europe/London", workStart: 9, workEnd: 17 }
    ];
  }

  setupEventListeners();
  render();
  maybeShowFirstTimeGuide();
}

function renderZoneDropdown(filterText) {
  const q = (filterText || "").trim().toLowerCase();
  popularOptgroup.innerHTML = "";
  allZonesOptgroup.innerHTML = "";

  let matchCount = 0;

  Object.keys(POPULAR_CITIES).forEach((city) => {
    const zone = POPULAR_CITIES[city];
    if (!q || city.toLowerCase().includes(q) || zone.toLowerCase().includes(q)) {
      const opt = document.createElement("option");
      opt.value = zone;
      opt.dataset.cityName = city;
      opt.textContent = `${city} (${zone})`;
      popularOptgroup.appendChild(opt);
      matchCount++;
    }
  });

  allSupportedZones.forEach((zone) => {
    if (!q || zone.toLowerCase().includes(q)) {
      const opt = document.createElement("option");
      opt.value = zone;
      opt.textContent = zone.replace(/_/g, " ");
      allZonesOptgroup.appendChild(opt);
      matchCount++;
    }
  });

  if (citySelect.options.length > 0 && citySelect.selectedIndex < 0) {
    citySelect.selectedIndex = 0;
  }

  if (zoneCountBadge) {
    zoneCountBadge.textContent = q ? `${matchCount} Matches` : `${allSupportedZones.length} Time Zones Ready`;
  }
}

function setupEventListeners() {
  zoneSearchInput.addEventListener("input", (e) => {
    renderZoneDropdown(e.target.value);
  });

  addPersonBtn.addEventListener("click", () => {
    const selectedOption = citySelect.options[citySelect.selectedIndex];
    if (!selectedOption) return;
    const zone = selectedOption.value;
    const customLabel = personLabelInput.value.trim();
    const presetName = selectedOption.dataset?.cityName;
    const fallbackCity = zone === "Asia/Kolkata" ? "India" : zone.split("/").pop().replace(/_/g, " ");
    const name = customLabel || presetName || fallbackCity;

    participants.push({
      id: Date.now(),
      name,
      timeZone: zone,
      workStart: 9,
      workEnd: 17
    });
    personLabelInput.value = "";
    updateURLState();
    render();
    showStatusMessage(`${name} added!`);
  });

  meetingDateInput.addEventListener("change", (e) => {
    if (e.target.value) {
      selectedDateStr = e.target.value;
      updateURLState();
      render();
    }
  });

  timeSlider.addEventListener("input", (e) => {
    selectedSlotIndex = parseInt(e.target.value, 10);
    timeSlider.setAttribute("aria-valuenow", selectedSlotIndex);
    updateComputedOutput();
    renderParticipants();
    renderWeeklyHeatmap();
    renderDstShiftComparison();
    updateCloudCalendarLinks();
    updateURLState();
  });

  durationSelect.addEventListener("change", (e) => {
    meetingDurationMinutes = parseInt(e.target.value, 10);
    updateURLState();
    render();
  });

  themeToggleBtn.addEventListener("click", () => {
    isDarkTheme = !isDarkTheme;
    applyTheme();
    updateURLState();
  });

  clockFormatBtn.addEventListener("click", () => {
    is24HourFormat = !is24HourFormat;
    updateURLState();
    render();
    showStatusMessage(is24HourFormat ? "Switched to 24-hour clock" : "Switched to 12-hour AM/PM clock");
  });

  window.addEventListener("pointerup", () => {
    isDraggingTimeline = false;
  });

  window.addEventListener("resize", () => {
    if (!tourOverlay.classList.contains("hidden")) {
      positionTourStep(currentTourStep);
    }
  });

  window.addEventListener("orientationchange", () => {
    if (!tourOverlay.classList.contains("hidden")) {
      setTimeout(() => positionTourStep(currentTourStep), 200);
    }
  });

  saveTeamBtn.addEventListener("click", saveTeamToLocalStorage);
  copyInviteBtn.addEventListener("click", copyInviteToClipboard);
  shareLinkBtn.addEventListener("click", copyShareableURL);
  exportIcsBtn.addEventListener("click", exportIcsFile);

  exportJsonBtn.addEventListener("click", exportBackupJson);
  importJsonBtn.addEventListener("click", () => importJsonFile.click());
  importJsonFile.addEventListener("change", handleImportBackupJson);

  // Footer & Modals
  footerAboutBtn.addEventListener("click", () => openInfoModal("about"));
  footerPrivacyBtn.addEventListener("click", () => openInfoModal("privacy"));
  footerGuideBtn.addEventListener("click", () => startTourGuide(0));

  infoModalClose.addEventListener("click", closeInfoModal);
  infoModalOk.addEventListener("click", closeInfoModal);
  infoModalBackdrop.addEventListener("click", (e) => {
    if (e.target === infoModalBackdrop) closeInfoModal();
  });

  // Guide Controls
  tourPrevBtn.addEventListener("click", () => {
    if (currentTourStep > 0) {
      currentTourStep--;
      positionTourStep(currentTourStep);
    }
  });

  tourNextBtn.addEventListener("click", () => {
    if (currentTourStep < TOUR_STEPS.length - 1) {
      currentTourStep++;
      positionTourStep(currentTourStep);
    } else {
      finishTourGuide();
    }
  });

  tourSkipBtn.addEventListener("click", finishTourGuide);
  tourDoneSkipBtn.addEventListener("click", finishTourGuide);
}

// First-Time Device Guide Logic
function maybeShowFirstTimeGuide() {
  try {
    const seenGuide = localStorage.getItem("timesync_guide_seen_v1");
    if (!seenGuide) {
      setTimeout(() => startTourGuide(0), 300);
    }
  } catch (e) {
    startTourGuide(0);
  }
}

function startTourGuide(stepIndex = 0) {
  currentTourStep = Math.max(0, Math.min(TOUR_STEPS.length - 1, stepIndex));
  tourOverlay.classList.remove("hidden");
  positionTourStep(currentTourStep);
}

function finishTourGuide() {
  tourOverlay.classList.add("hidden");
  try {
    localStorage.setItem("timesync_guide_seen_v1", "true");
  } catch (e) {
    // Ignore storage error
  }
}

function positionTourStep(stepIndex) {
  const step = TOUR_STEPS[stepIndex];
  const targetEl = document.getElementById(step.targetId);

  tourStepCounter.textContent = `Step ${stepIndex + 1} of ${TOUR_STEPS.length}`;
  tourArrowText.textContent = step.arrow;
  tourTitle.textContent = step.title;
  tourDescription.textContent = step.description;

  tourPrevBtn.disabled = stepIndex === 0;
  tourNextBtn.textContent = stepIndex === TOUR_STEPS.length - 1 ? "Done ✓" : "Next →";

  if (!targetEl) return;

  targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

  setTimeout(() => {
    const rect = targetEl.getBoundingClientRect();
    const pad = 8;

    const spotTop = Math.max(8, rect.top - pad);
    const spotLeft = Math.max(8, rect.left - pad);
    const spotWidth = Math.min(window.innerWidth - 16, rect.width + pad * 2);
    const spotHeight = Math.max(40, rect.height + pad * 2);

    tourSpotlight.style.top = `${spotTop}px`;
    tourSpotlight.style.left = `${spotLeft}px`;
    tourSpotlight.style.width = `${spotWidth}px`;
    tourSpotlight.style.height = `${spotHeight}px`;

    const calloutWidth = Math.min(410, window.innerWidth - 24);
    const calloutHeight = tourCallout.offsetHeight || 220;

    let calloutLeft = rect.left;
    if (calloutLeft + calloutWidth > window.innerWidth - 12) {
      calloutLeft = window.innerWidth - calloutWidth - 12;
    }
    if (calloutLeft < 12) calloutLeft = 12;

    let calloutTop;
    if (rect.bottom + calloutHeight + 18 < window.innerHeight) {
      calloutTop = rect.bottom + 14;
      tourArrowText.textContent = `↑ ${step.arrow}`;
    } else if (rect.top - calloutHeight - 18 > 8) {
      calloutTop = rect.top - calloutHeight - 14;
      tourArrowText.textContent = `↓ ${step.arrow}`;
    } else {
      calloutTop = Math.max(12, Math.min(window.innerHeight - calloutHeight - 12, rect.top + 16));
      tourArrowText.textContent = `← ${step.arrow}`;
    }

    tourCallout.style.left = `${calloutLeft}px`;
    tourCallout.style.top = `${calloutTop}px`;
  }, 180);
}

// About & Privacy Modal
function openInfoModal(type) {
  if (type === "privacy") {
    infoModalTitle.textContent = "Privacy Policy";
    infoModalBody.innerHTML = `
      <p><strong>Local-First Processing:</strong> All time zone calculations, fairness scores, and calendar exports run locally in your browser.</p>
      <p><strong>Browser Storage:</strong> Saved teams and guide preferences are stored in your browser's <code>localStorage</code>. Shareable links encode your current team and slot state in the URL query string.</p>
      <p><strong>No Backend Tracking:</strong> TimeSync Pro does not upload your saved teams or meeting schedules to an external server.</p>
    `;
  } else {
    infoModalTitle.textContent = "About TimeSync Pro";
    infoModalBody.innerHTML = `
      <p><strong>TimeSync Pro</strong> helps distributed teams find fair meeting slots across world time zones, including <strong>India (IST)</strong> and custom working hours.</p>
      <p><strong>Key Capabilities:</strong> DST-aware scheduling, +6 month DST shift checks, weekly fairness heatmap, <code>+1 Day</code> / <code>-1 Day</code> alerts, Google &amp; Outlook calendar links, <code>.ics</code> export, offline PWA caching, and JSON backup/restore.</p>
    `;
  }
  infoModalBackdrop.classList.remove("hidden");
}

function closeInfoModal() {
  infoModalBackdrop.classList.add("hidden");
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", isDarkTheme ? "dark" : "light");
  themeToggleBtn.textContent = isDarkTheme ? "☀️ Light Mode" : "🌙 Dark Mode";
}

// Render Core UI
function render() {
  applyTheme();
  clockFormatBtn.textContent = is24HourFormat ? "🕒 24h Clock" : "🕒 12h Clock";
  meetingDateInput.value = selectedDateStr;
  timeSlider.value = selectedSlotIndex;
  timeSlider.setAttribute("aria-valuenow", selectedSlotIndex);
  durationSelect.value = String(meetingDurationMinutes);

  renderParticipants();
  updateComputedOutput();
  computeFairnessScores();
  renderWeeklyHeatmap();
  renderDstShiftComparison();
  updateCloudCalendarLinks();
  renderSavedTeams();
}

function removeParticipant(id) {
  participants = participants.filter((p) => p.id !== id);
  updateURLState();
  render();
  showStatusMessage("Participant removed.");
}

function updateWorkHours(id, field, value) {
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) return;
  participants = participants.map((p) => {
    if (p.id !== id) return p;
    return {
      ...p,
      [field]: Math.max(0, Math.min(24, num))
    };
  });
  updateURLState();
  renderParticipants();
  computeFairnessScores();
  renderWeeklyHeatmap();
}

function updateSlotFromPointer(stripEl, clientX) {
  const rect = stripEl.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const newIndex = Math.min(95, Math.max(0, Math.round(ratio * 95)));
  if (newIndex !== selectedSlotIndex) {
    selectedSlotIndex = newIndex;
    timeSlider.value = selectedSlotIndex;
    timeSlider.setAttribute("aria-valuenow", selectedSlotIndex);
    updateComputedOutput();
    renderParticipants();
    renderWeeklyHeatmap();
    renderDstShiftComparison();
    updateCloudCalendarLinks();
    updateURLState();
  }
}

function renderParticipants() {
  participantsList.innerHTML = "";
  const selectedUtcDate = getSelectedUtcDate();

  participants.forEach((p) => {
    const workStart = p.workStart ?? 9;
    const workEnd = p.workEnd ?? 17;

    const li = document.createElement("li");
    li.className = "person-card";

    const offsetText = getZoneOffset(p.timeZone, selectedUtcDate);
    const localParts = getLocalTimeParts(p.timeZone, selectedUtcDate);
    const dayShiftBadge = getDayShiftLabel(localParts.isoDate, selectedUtcDate);
    const localMins = localParts.hour * 60 + localParts.minute;
    const categoryNow = getCustomHourCategory(localParts.hour, workStart, workEnd);

    const header = document.createElement("div");
    header.className = "person-header-flex";
    header.innerHTML = `
      <div class="person-meta">
        <span class="person-name">${p.name}</span>
        <span class="person-offset">${p.timeZone} • ${offsetText}</span>
        <span class="work-hours-inline">
          Work:
          <input type="number" min="0" max="23" value="${workStart}" onchange="updateWorkHours(${p.id}, 'workStart', this.value)" title="Work start hour" />
          –
          <input type="number" min="1" max="24" value="${workEnd}" onchange="updateWorkHours(${p.id}, 'workEnd', this.value)" title="Work end hour" />
        </span>
        <span class="local-slot-pill ${categoryNow.class}">
          ${localParts.weekday} ${formatSlotTime(localMins, "")} (${categoryNow.label})
        </span>
        ${dayShiftBadge ? `<span class="day-shift-badge">${dayShiftBadge}</span>` : ""}
      </div>
      <button type="button" class="remove-btn" title="Remove participant" onclick="removeParticipant(${p.id})">✕</button>
    `;

    const strip = document.createElement("div");
    strip.className = "timeline-strip";

    strip.addEventListener("pointerdown", (e) => {
      isDraggingTimeline = true;
      updateSlotFromPointer(strip, e.clientX);
    });

    strip.addEventListener("pointermove", (e) => {
      if (isDraggingTimeline) {
        updateSlotFromPointer(strip, e.clientX);
      }
    });

    for (let utcHour = 0; utcHour < 24; utcHour++) {
      const colUtcDate = getSelectedUtcDate(utcHour * 4);
      const cellLocal = getLocalTimeParts(p.timeZone, colUtcDate);
      const category = getCustomHourCategory(cellLocal.hour, workStart, workEnd);

      const cell = document.createElement("div");
      cell.className = `hour-cell ${category.class}`;
      const shortHour = is24HourFormat
        ? String(cellLocal.hour).padStart(2, "0")
        : formatHourLabel(cellLocal.hour).replace(" ", "");
      const minTag = cellLocal.minute === 30 ? ":30" : "";

      cell.innerHTML = `<span>${shortHour}${minTag}</span><small>${category.label[0]}</small>`;
      cell.title = `${p.name}: ${formatSlotTime(cellLocal.hour * 60 + cellLocal.minute, "")} local (${formatHourLabel(utcHour)} UTC)`;
      strip.appendChild(cell);
    }

    const indicator = document.createElement("div");
    indicator.className = "selected-indicator";
    const startPercent = (selectedSlotIndex / 96) * 100;
    const widthPercent = (meetingDurationMinutes / 1440) * 100;
    indicator.style.left = `${startPercent}%`;
    indicator.style.width = `${widthPercent}%`;
    strip.appendChild(indicator);

    li.appendChild(header);
    li.appendChild(strip);
    participantsList.appendChild(li);
  });
}

function updateComputedOutput() {
  computedSlotOutput.value = formatSlotTime(selectedSlotIndex * 15, "UTC");
}

// Build Plain Invite Summary
function buildInviteSummaryText() {
  const slotTime = computedSlotOutput ? computedSlotOutput.value : "12:00 UTC";
  const startUtcDate = getSelectedUtcDate();

  let inviteText = "Meeting Invitation\n";
  inviteText += `Date (UTC): ${selectedDateStr}\n`;
  inviteText += `UTC Slot: ${slotTime}\n`;
  inviteText += `Duration: ${meetingDurationMinutes} Mins\n\n`;
  inviteText += "Participants Local Times:\n";

  participants.forEach((p) => {
    const localParts = getLocalTimeParts(p.timeZone, startUtcDate);
    const dayShift = getDayShiftLabel(localParts.isoDate, startUtcDate);
    const localTime = new Intl.DateTimeFormat("en-US", {
      timeZone: p.timeZone,
      weekday: "short",
      hour: is24HourFormat ? "2-digit" : "numeric",
      minute: "2-digit",
      hour12: !is24HourFormat
    }).format(startUtcDate);

    const offset = getZoneOffset(p.timeZone, startUtcDate);
    inviteText += `- ${p.name}: ${localTime} (${offset})${dayShift ? " [" + dayShift + "]" : ""}\n`;
  });

  return inviteText;
}

// Update Google Calendar & Outlook Web Links
function updateCloudCalendarLinks() {
  const startDate = getSelectedUtcDate();
  const endDate = new Date(startDate.getTime() + meetingDurationMinutes * 60 * 1000);
  const summary = "Global Team Sync";
  const details = buildInviteSummaryText();

  if (googleCalLink) {
    const gStart = formatIcsUtc(startDate);
    const gEnd = formatIcsUtc(endDate);
    const gParams = new URLSearchParams({
      action: "TEMPLATE",
      text: summary,
      dates: `${gStart}/${gEnd}`,
      details
    });
    googleCalLink.href = `https://calendar.google.com/calendar/render?${gParams.toString()}`;
  }

  if (outlookCalLink) {
    const oParams = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: summary,
      startdt: startDate.toISOString(),
      enddt: endDate.toISOString(),
      body: details
    });
    outlookCalLink.href = `https://outlook.live.com/calendar/0/deeplink/compose?${oParams.toString()}`;
  }
}

// Duration-Aware Fairness Scoring
function getSlotDiscomfortScore(slotIndex, dateOverride = selectedDateStr) {
  let totalDiscomfort = 0;
  const stepsNeeded = Math.max(1, Math.ceil(meetingDurationMinutes / 60));

  for (let step = 0; step < stepsNeeded; step++) {
    const evalIdx = (slotIndex + step * 4) % 96;
    const utcDate = getSelectedUtcDate(evalIdx, dateOverride);

    participants.forEach((p) => {
      const local = getLocalTimeParts(p.timeZone, utcDate);
      totalDiscomfort += getCustomHourCategory(local.hour, p.workStart ?? 9, p.workEnd ?? 17).score;
    });
  }

  return totalDiscomfort;
}

function computeFairnessScores() {
  slotsResults.innerHTML = "";
  if (participants.length === 0) return;

  const candidateSlots = [];

  for (let i = 0; i < 96; i += 2) {
    const score = getSlotDiscomfortScore(i);
    candidateSlots.push({
      time: formatSlotTime(i * 15, "UTC"),
      score,
      slotIndex: i
    });
  }

  candidateSlots.sort((a, b) => a.score - b.score);

  candidateSlots.slice(0, 4).forEach((slot, index) => {
    const card = document.createElement("div");
    card.className = `slot-card ${index === 0 ? "best" : ""}`;
    card.innerHTML = `
      <span><strong>${slot.time}</strong> ${index === 0 ? "🏆 Best Match" : ""}</span>
      <span class="score-tag">Score: ${slot.score}</span>
    `;
    card.addEventListener("click", () => {
      selectedSlotIndex = slot.slotIndex;
      updateURLState();
      render();
      showStatusMessage(`Applied ${slot.time}`);
    });
    slotsResults.appendChild(card);
  });
}

// Recurring Meeting DST Shift Comparison (+6 Months)
function renderDstShiftComparison() {
  if (!dstShiftList) return;
  dstShiftList.innerHTML = "";

  if (participants.length === 0) return;

  const baseDate = getSelectedUtcDate(selectedSlotIndex, selectedDateStr);
  const futureObj = new Date(baseDate.getTime() + 182 * 24 * 60 * 60 * 1000);
  const futureDateStr = futureObj.toISOString().split("T")[0];
  const futureUtcDate = getSelectedUtcDate(selectedSlotIndex, futureDateStr);

  participants.forEach((p) => {
    const nowLocal = getLocalTimeParts(p.timeZone, baseDate);
    const futureLocal = getLocalTimeParts(p.timeZone, futureUtcDate);

    const nowMins = nowLocal.hour * 60 + nowLocal.minute;
    const futureMins = futureLocal.hour * 60 + futureLocal.minute;
    const shifted = nowMins !== futureMins;

    const item = document.createElement("div");
    item.className = "dst-item";
    item.innerHTML = `
      <div>
        <strong>${p.name}</strong><br/>
        <small style="color:var(--text-muted);">Now: ${formatSlotTime(nowMins, "")} → +6m: ${formatSlotTime(futureMins, "")}</small>
      </div>
      <span class="${shifted ? "dst-badge-shifted" : "dst-badge-same"}">
        ${shifted ? "DST Shifts" : "No Shift"}
      </span>
    `;
    dstShiftList.appendChild(item);
  });
}

// Best Time This Week Heatmap (Mon - Sun)
function renderWeeklyHeatmap() {
  if (!weeklyHeatmap) return;
  weeklyHeatmap.innerHTML = "";

  if (participants.length === 0) {
    weeklyHeatmap.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">Add team members to view the weekly heatmap.</p>`;
    return;
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const grid = document.createElement("div");
  grid.className = "heatmap-grid";

  const activeHour = Math.floor(selectedSlotIndex / 4);

  days.forEach((day, dayIdx) => {
    const dayLabel = document.createElement("div");
    dayLabel.className = "heatmap-day-label";
    dayLabel.textContent = day;
    grid.appendChild(dayLabel);

    for (let h = 0; h < 24; h++) {
      const slotIdx = h * 4;
      let score = getSlotDiscomfortScore(slotIdx);
      if (dayIdx >= 5) score += 1;

      const heatLevel = Math.min(4, Math.max(0, score));
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `heatmap-cell heat-${heatLevel} ${h === activeHour ? "active-slot" : ""}`;
      cell.textContent = is24HourFormat ? String(h) : "";
      cell.title = `${day} • ${formatHourLabel(h)} UTC • Discomfort: ${score}`;

      cell.addEventListener("click", () => {
        selectedSlotIndex = slotIdx;
        updateURLState();
        render();
        showStatusMessage(`${day} ${formatHourLabel(h)} UTC selected`);
      });

      grid.appendChild(cell);
    }
  });

  weeklyHeatmap.appendChild(grid);
}

// Save Team & Saved Teams Management
function saveTeamToLocalStorage() {
  if (!Array.isArray(participants) || participants.length === 0) {
    showStatusMessage("Please add at least one team member first.");
    return;
  }

  const teams = JSON.parse(localStorage.getItem("saved_teams") || "[]");
  const teamSnapshot = participants.map((p) => ({
    id: p.id || Date.now() + Math.random(),
    name: p.name,
    timeZone: p.timeZone,
    workStart: p.workStart ?? 9,
    workEnd: p.workEnd ?? 17
  }));

  teams.push({
    id: Date.now(),
    createdAt: new Date().toLocaleDateString(),
    members: teamSnapshot
  });

  localStorage.setItem("saved_teams", JSON.stringify(teams));
  renderSavedTeams();
  showStatusMessage("Team saved!");
}

function loadSavedTeam(index) {
  const teams = JSON.parse(localStorage.getItem("saved_teams") || "[]");
  const selected = teams[index];
  if (!selected || !Array.isArray(selected.members)) return;

  participants = selected.members.map((m, idx) => ({
    id: Date.now() + idx,
    name: m.name,
    timeZone: m.timeZone,
    workStart: m.workStart ?? 9,
    workEnd: m.workEnd ?? 17
  }));

  updateURLState();
  render();
  showStatusMessage(`Saved Group ${index + 1} loaded!`);
}

function deleteSavedTeam(index) {
  const teams = JSON.parse(localStorage.getItem("saved_teams") || "[]");
  if (index < 0 || index >= teams.length) return;

  teams.splice(index, 1);
  localStorage.setItem("saved_teams", JSON.stringify(teams));
  renderSavedTeams();
  showStatusMessage("Saved team deleted!");
}

function renderSavedTeams() {
  const list = document.getElementById("saved-teams-list");
  if (!list) return;
  list.innerHTML = "";

  const teams = JSON.parse(localStorage.getItem("saved_teams") || "[]");
  if (teams.length === 0) {
    list.innerHTML = `<li style="color:var(--text-muted);">No saved teams yet.</li>`;
    return;
  }

  teams.forEach((t, i) => {
    const li = document.createElement("li");
    const names = t.members.map((m) => m.name).join(", ");
    li.innerHTML = `
      <div>
        <strong>Saved Group ${i + 1}</strong> (${t.members.length})<br/>
        <small style="color:var(--text-muted);">${names}</small>
      </div>
      <div class="saved-team-actions">
        <button type="button" class="btn btn-secondary btn-sm" onclick="loadSavedTeam(${i})">Load</button>
        <button type="button" class="btn btn-danger btn-sm" onclick="deleteSavedTeam(${i})">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });
}

// JSON Backup & Restore
function exportBackupJson() {
  const backupPayload = {
    exportedAt: new Date().toISOString(),
    participants,
    selectedSlotIndex,
    meetingDurationMinutes,
    is24HourFormat,
    isDarkTheme,
    selectedDateStr,
    savedTeams: JSON.parse(localStorage.getItem("saved_teams") || "[]")
  };

  const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "timesync-backup.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  showStatusMessage("JSON backup exported!");
}

function handleImportBackupJson(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || "{}"));
      if (Array.isArray(data.participants)) {
        participants = data.participants;
      }
      if (typeof data.selectedSlotIndex === "number") {
        selectedSlotIndex = Math.max(0, Math.min(95, data.selectedSlotIndex));
      }
      if (typeof data.meetingDurationMinutes === "number") {
        meetingDurationMinutes = data.meetingDurationMinutes;
      }
      if (typeof data.is24HourFormat === "boolean") {
        is24HourFormat = data.is24HourFormat;
      }
      if (typeof data.isDarkTheme === "boolean") {
        isDarkTheme = data.isDarkTheme;
      }
      if (typeof data.selectedDateStr === "string") {
        selectedDateStr = data.selectedDateStr;
      }
      if (Array.isArray(data.savedTeams)) {
        localStorage.setItem("saved_teams", JSON.stringify(data.savedTeams));
      }

      updateURLState();
      render();
      showStatusMessage("JSON backup restored!");
    } catch (err) {
      showStatusMessage("Invalid JSON backup file.");
    } finally {
      importJsonFile.value = "";
    }
  };
  reader.readAsText(file);
}

// Copy Invite
function copyInviteToClipboard() {
  copyToClipboardSafe(buildInviteSummaryText(), "Invite copied to clipboard!");
}

// Share Link & URL State
function updateURLState() {
  try {
    const params = new URLSearchParams(window.location.search);
    params.set("team", JSON.stringify(participants));
    params.set("slot", String(selectedSlotIndex));
    params.set("dur", String(meetingDurationMinutes));
    params.set("fmt", is24HourFormat ? "24" : "12");
    params.set("theme", isDarkTheme ? "dark" : "light");
    params.set("date", selectedDateStr);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  } catch (err) {
    // Ignore restricted origin history limits
  }
}

function buildShareableUrl() {
  const params = new URLSearchParams();
  params.set("team", JSON.stringify(participants));
  params.set("slot", String(selectedSlotIndex));
  params.set("dur", String(meetingDurationMinutes));
  params.set("fmt", is24HourFormat ? "24" : "12");
  params.set("theme", isDarkTheme ? "dark" : "light");
  params.set("date", selectedDateStr);
  return `${window.location.href.split("?")[0]}?${params.toString()}`;
}

function copyShareableURL() {
  copyToClipboardSafe(buildShareableUrl(), "Shareable link copied!");
}

function loadStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const teamData = params.get("team");
  const slotData = params.get("slot");
  const durData = params.get("dur");
  const fmtData = params.get("fmt");
  const themeData = params.get("theme");
  const dateData = params.get("date");

  if (teamData) {
    try {
      const parsed = JSON.parse(teamData);
      if (Array.isArray(parsed)) participants = parsed;
    } catch (e) {
      console.error("Failed to parse team data from URL", e);
    }
  }

  if (slotData !== null) {
    const parsedSlot = parseInt(slotData, 10);
    if (!Number.isNaN(parsedSlot) && parsedSlot >= 0 && parsedSlot <= 95) {
      selectedSlotIndex = parsedSlot;
    }
  }

  if (durData !== null) {
    const parsedDur = parseInt(durData, 10);
    if ([30, 60, 90, 120].includes(parsedDur)) {
      meetingDurationMinutes = parsedDur;
    }
  }

  if (fmtData === "12") is24HourFormat = false;
  else if (fmtData === "24") is24HourFormat = true;

  if (themeData === "dark") isDarkTheme = true;
  else if (themeData === "light") isDarkTheme = false;

  if (dateData && /^\d{4}-\d{2}-\d{2}$/.test(dateData)) {
    selectedDateStr = dateData;
  }
}

// Export .ics Calendar File
function formatIcsUtc(dateObj) {
  return dateObj.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function exportIcsFile() {
  const now = new Date();
  const startDate = getSelectedUtcDate();
  const endDate = new Date(startDate.getTime() + meetingDurationMinutes * 60 * 1000);
  const summary = "Global Team Sync";
  const description = buildInviteSummaryText().replace(/\n/g, "\\n");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TimeSync Pro//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@timesyncpro.local`,
    `DTSTAMP:${formatIcsUtc(now)}`,
    `DTSTART:${formatIcsUtc(startDate)}`,
    `DTEND:${formatIcsUtc(endDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "meeting.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  showStatusMessage("meeting.ics downloaded!");
}

// Launch App
window.addEventListener("DOMContentLoaded", init);