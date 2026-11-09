/**
 * Typed client for the Wizard World API.
 * https://wizard-world-api.herokuapp.com/swagger/index.html
 *
 * Only the endpoints this project actually uses are modelled. Fields the API
 * sends as nullable stay nullable here so the UI is forced to handle them.
 */

const BASE_URL = "https://wizard-world-api.herokuapp.com";

export interface HouseHead {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Trait {
  id: string;
  name: string;
}

export interface House {
  id: string;
  name: string;
  houseColours: string;
  founder: string;
  animal: string;
  element: string;
  ghost: string;
  commonRoom: string;
  heads: HouseHead[];
  traits: Trait[];
}

export interface Spell {
  id: string;
  name: string;
  incantation: string | null;
  effect: string | null;
  canBeVerbal: boolean | null;
  type: string | null;
  light: string | null;
  creator: string | null;
}

export interface Ingredient {
  id: string;
  name: string;
}

export interface Elixir {
  id: string;
  name: string;
  effect: string | null;
  sideEffects: string | null;
  characteristics: string | null;
  time: string | null;
  difficulty: string | null;
  ingredients: Ingredient[];
  inventors: HouseHead[];
  manufacturer: string | null;
}

export interface SpellQuery {
  name?: string;
  type?: string;
}

export interface ElixirQuery {
  name?: string;
  difficulty?: string;
  ingredient?: string;
}

/** Raised when the upstream API answers with a non-2xx status. */
export class WizardWorldError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "WizardWorldError";
  }
}

function buildUrl(path: string, query: Record<string, string | undefined> = {}): string {
  const url = new URL(path, BASE_URL);

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

async function getJson<T>(path: string, query?: Record<string, string | undefined>): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new WizardWorldError(path, response.status, `${path} responded ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getHouses(): Promise<House[]> {
  return getJson<House[]>("/Houses");
}

export async function getSpells(query: SpellQuery = {}): Promise<Spell[]> {
  return getJson<Spell[]>("/Spells", { name: query.name, type: query.type });
}

export async function getElixirs(query: ElixirQuery = {}): Promise<Elixir[]> {
  return getJson<Elixir[]>("/Elixirs", {
    name: query.name,
    difficulty: query.difficulty,
    ingredient: query.ingredient,
  });
}
