/* Hogwarts Academy — front-end. Plain ES2022, no framework, no build step. */

const $ = (selector, root = document) => root.querySelector(selector);

const PAGE_SIZE = 40;

const HOUSE_ACCENTS = {
  Gryffindor: "#8d2b1f",
  Slytherin: "#1f4d3a",
  Ravenclaw: "#2b3f6b",
  Hufflepuff: "#9b7314",
};

const DIFFICULTY_COLOURS = {
  Unknown: "#948d7c",
  Beginner: "#5b7f52",
  Moderate: "#a8873f",
  Intermediate: "#a8873f",
  Advanced: "#b4642a",
  Expert: "#8d2b1f",
  Master: "#5b2a63",
  OrdinaryWizardingLevel: "#4b6b7a",
  OneOfAKind: "#5b2a63",
};

const DIFFICULTY_ORDER = [
  "Unknown",
  "Beginner",
  "Moderate",
  "Intermediate",
  "Advanced",
  "Expert",
  "Master",
  "OrdinaryWizardingLevel",
  "OneOfAKind",
];

const state = {
  houses: [],
  spells: [],
  elixirs: [],
  spellQuery: "",
  spellLimit: PAGE_SIZE,
  elixirLimit: 60,
  difficulty: "All",
};

/* ------------------------------- helpers -------------------------------- */

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wrap matches in the (already escaped) text with <mark>. */
function highlight(escaped, query) {
  if (!query) {
    return escaped;
  }

  const pattern = new RegExp(`(${escapeRegExp(esc(query))})`, "gi");
  return escaped.replace(pattern, "<mark>$1</mark>");
}

function setStatus(text, status) {
  $("#status").dataset.state = status;
  $("#status-text").textContent = text;
}

async function getJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`);
  }

  return response.json();
}

function stagger(index) {
  return `style="--i:${index}"`;
}

/** "OrdinaryWizardingLevel" -> "Ordinary Wizarding Level" */
function humanise(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

/* -------------------------------- houses -------------------------------- */

function renderHouses() {
  const grid = $("#houses-grid");

  if (state.houses.length === 0) {
    grid.innerHTML = `<p class="hint">The archive returned no houses.</p>`;
    return;
  }

  grid.innerHTML = state.houses
    .map((house, index) => {
      const accent = HOUSE_ACCENTS[house.name] ?? "#a8873f";
      const heads = (house.heads ?? [])
        .map((head) => `${head.firstName ?? ""} ${head.lastName ?? ""}`.trim())
        .filter(Boolean)
        .join(", ");

      const facts = [
        ["Founder", house.founder],
        ["Animal", house.animal],
        ["Element", house.element],
        ["Ghost", house.ghost],
        ["Common room", house.commonRoom],
        ["Heads", heads],
      ].filter(([, value]) => value);

      return `
        <article class="house-card" style="--i:${index};--accent:${esc(accent)}">
          <div class="house-head">
            <div class="house-crest" aria-hidden="true">${esc(house.name.charAt(0))}</div>
            <div>
              <h3>${esc(house.name)}</h3>
              <p class="house-colours">${esc(house.houseColours)}</p>
            </div>
          </div>
          <dl class="facts">
            ${facts
              .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
              .join("")}
          </dl>
          <ul class="traits">
            ${(house.traits ?? []).map((trait) => `<li>${esc(trait.name)}</li>`).join("")}
          </ul>
        </article>`;
    })
    .join("");

  $("#houses-note").textContent = `${state.houses.length} houses on record`;
}

/* -------------------------------- spells -------------------------------- */

function visibleSpells() {
  const query = state.spellQuery.trim().toLowerCase();

  if (!query) {
    return state.spells;
  }

  return state.spells.filter((spell) =>
    [spell.name, spell.incantation, spell.effect, spell.type]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query))
  );
}

function renderSpells() {
  const matches = visibleSpells();
  const shown = matches.slice(0, state.spellLimit);
  const list = $("#spell-list");
  const query = state.spellQuery.trim();

  $("#spells-count").textContent = query
    ? `${matches.length} of ${state.spells.length} spells`
    : `${state.spells.length} spells`;

  if (matches.length === 0) {
    list.innerHTML = `<li class="hint">No spell answers to “${esc(query)}”.</li>`;
    return;
  }

  list.innerHTML = shown
    .map(
      (spell, index) => `
        <li class="spell-row" ${stagger(index)} style="--i:${Math.min(index, 20)}">
          <span class="spell-name">
            ${highlight(esc(spell.name), query)}
            ${
              spell.incantation
                ? `<span class="spell-incantation">${highlight(esc(spell.incantation), query)}</span>`
                : ""
            }
          </span>
          <span class="spell-type">${esc(spell.type ?? "Unclassified")}</span>
          <span class="spell-effect">${highlight(esc(spell.effect ?? "Effect unrecorded"), query)}</span>
        </li>`
    )
    .join("");

  if (matches.length > shown.length) {
    const button = document.createElement("button");
    button.className = "more";
    button.type = "button";
    button.textContent = `Show ${Math.min(PAGE_SIZE, matches.length - shown.length)} more · ${matches.length - shown.length} remaining`;
    button.addEventListener("click", () => {
      state.spellLimit += PAGE_SIZE;
      renderSpells();
    });

    const previous = list.nextElementSibling;
    if (previous?.classList.contains("more")) {
      previous.remove();
    }

    list.after(button);
  }
}

/* -------------------------------- elixirs ------------------------------- */

function renderDifficulties() {
  const levels = [...new Set(state.elixirs.map((elixir) => elixir.difficulty ?? "Unknown"))];
  const ranked = (level) => {
    const index = DIFFICULTY_ORDER.indexOf(level);
    return index === -1 ? DIFFICULTY_ORDER.length : index;
  };
  const options = ["All", ...levels.sort((a, b) => ranked(a) - ranked(b) || a.localeCompare(b))];

  $("#difficulty-chips").innerHTML = options
    .map(
      (option) => `
        <button class="chip" type="button" data-difficulty="${esc(option)}"
          aria-pressed="${option === state.difficulty}">${esc(humanise(option))}</button>`
    )
    .join("");

  for (const chip of document.querySelectorAll(".chip")) {
    chip.addEventListener("click", () => {
      state.difficulty = chip.dataset.difficulty;
      state.elixirLimit = 60;
      for (const other of document.querySelectorAll(".chip")) {
        other.setAttribute("aria-pressed", String(other === chip));
      }
      renderElixirs();
    });
  }
}

function renderElixirs() {
  const matches =
    state.difficulty === "All"
      ? state.elixirs
      : state.elixirs.filter((elixir) => (elixir.difficulty ?? "Unknown") === state.difficulty);

  const shown = matches.slice(0, state.elixirLimit);

  $("#elixirs-note").textContent =
    state.difficulty === "All"
      ? `${state.elixirs.length} elixirs on record`
      : `${matches.length} ${humanise(state.difficulty).toLowerCase()} elixirs`;

  const grid = $("#elixirs-grid");

  if (matches.length === 0) {
    grid.innerHTML = `<p class="hint">Nothing on this shelf.</p>`;
    return;
  }

  grid.innerHTML = shown
    .map((elixir, index) => {
      const difficulty = elixir.difficulty ?? "Unknown";
      const level = DIFFICULTY_COLOURS[difficulty] ?? DIFFICULTY_COLOURS.Unknown;
      const ingredients = (elixir.ingredients ?? []).slice(0, 4).map((item) => item.name);

      return `
        <article class="elixir-card" ${stagger(index)} style="--i:${Math.min(index, 20)}">
          <span class="difficulty" style="--level:${level}">${esc(humanise(difficulty))}</span>
          <h3>${esc(elixir.name)}</h3>
          <p class="elixir-effect">${esc(elixir.effect ?? "Effect unrecorded.")}</p>
          ${
            elixir.sideEffects
              ? `<p class="elixir-side"><strong>Caution</strong>${esc(elixir.sideEffects)}</p>`
              : ""
          }
          ${
            ingredients.length
              ? `<ul class="ingredients">${ingredients
                  .map((name) => `<li>${esc(name)}</li>`)
                  .join("")}</ul>`
              : ""
          }
        </article>`;
    })
    .join("");

  if (matches.length > shown.length) {
    const button = document.createElement("button");
    button.className = "more";
    button.type = "button";
    button.textContent = `Show ${Math.min(60, matches.length - shown.length)} more · ${
      matches.length - shown.length
    } remaining`;
    button.addEventListener("click", () => {
      state.elixirLimit += 60;
      renderElixirs();
    });
    grid.after(button);
  } else if (grid.nextElementSibling?.classList.contains("more")) {
    grid.nextElementSibling.remove();
  }
}

/* --------------------------------- boot --------------------------------- */

async function boot() {
  setStatus("Consulting the archive…", "loading");

  try {
    const [houses, spells, elixirs] = await Promise.all([
      getJson("/api/houses"),
      getJson("/api/spells"),
      getJson("/api/elixirs"),
    ]);

    state.houses = houses;
    state.spells = spells;
    state.elixirs = elixirs;

    $("#tally-houses").textContent = houses.length;
    $("#tally-spells").textContent = spells.length;
    $("#tally-elixirs").textContent = elixirs.length;

    renderHouses();
    renderSpells();
    renderDifficulties();
    renderElixirs();

    // Deep link: /?q=patronus arrives pre-filtered.
    const initial = new URLSearchParams(location.search).get("q");
    if (initial) {
      search.value = initial;
      state.spellQuery = initial;
      renderSpells();
    }

    setStatus("Archive connected", "ready");
  } catch (error) {
    console.error(error);
    setStatus("Archive unreachable", "error");

    for (const id of ["#houses-grid", "#spell-list", "#elixirs-grid"]) {
      $(id).innerHTML = `<p class="hint">Could not reach the Wizard World API. Is the server running?</p>`;
    }
  }
}

const search = $("#spell-search");

/** Keep the address bar in sync so a filtered view can be shared or reloaded. */
function syncUrl() {
  const url = new URL(location.href);

  if (state.spellQuery.trim()) {
    url.searchParams.set("q", state.spellQuery.trim());
  } else {
    url.searchParams.delete("q");
  }

  history.replaceState(null, "", url);
}

search.addEventListener("input", () => {
  state.spellQuery = search.value;
  state.spellLimit = PAGE_SIZE;
  renderSpells();
  syncUrl();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== search) {
    event.preventDefault();
    search.focus();
    search.select();
  }

  if (event.key === "Escape" && document.activeElement === search && search.value) {
    search.value = "";
    state.spellQuery = "";
    state.spellLimit = PAGE_SIZE;
    renderSpells();
    syncUrl();
  }
});

boot();
