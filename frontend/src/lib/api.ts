// Thin client for the Cascade backend, proxied through Next API routes
// (so the in-app preview and the real browser both work without CORS).
const LEARN = '/api/learn';
const CASCADE = '/api/cascade';

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const learnApi = {
  list: () => fetch(`${LEARN}/lessons`).then(j<any>),
  get: (slug: string) => fetch(`${LEARN}/lessons/${slug}`).then(j<any>),
  submit: (slug: string, body: any) =>
    fetch(`${LEARN}/lessons/${slug}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(j<any>),
  hint: (slug: string, level: number) =>
    fetch(`${LEARN}/lessons/${slug}/hint?level=${level}`).then(j<any>),
  toolkit: (userId: string) => fetch(`${LEARN}/users/${userId}/toolkit`).then(j<any>),
};

export const cascadeApi = {
  graph: (archetype: string) => fetch(`${CASCADE}/cascade/graph/${archetype}`).then(j<any>),
  start: (archetype: string, userId: string) =>
    fetch(`${CASCADE}/cascade/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archetype, user_id: userId }),
    }).then(j<any>),
  current: (sid: string) => fetch(`${CASCADE}/cascade/${sid}`).then(j<any>),
  fix: (sid: string, fix: string) =>
    fetch(`${CASCADE}/cascade/${sid}/fix`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fix }),
    }).then(j<any>),
  hint: (sid: string, level: number) =>
    fetch(`${CASCADE}/cascade/${sid}/hint?level=${level}`).then(j<any>),
  summary: (sid: string) => fetch(`${CASCADE}/cascade/${sid}/summary`).then(j<any>),
  dag: (sid: string) => fetch(`${CASCADE}/cascade/${sid}/dag`).then(j<any>),
};

const LEAGUE = '/api/league';
const REFACTOR = '/api/refactor';
export const leagueApi = {
  createSeason: (name: string, weeks: number) =>
    fetch(`${LEAGUE}/seasons`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, weeks }),
    }).then(j<any>),
  currentSeason: () => fetch(`${LEAGUE}/seasons/current`).then(j<any>),
  standings: (seasonId: string, division: string) =>
    fetch(`${LEAGUE}/standings?season_id=${encodeURIComponent(seasonId)}&division=${encodeURIComponent(division)}`).then(j<any>),
};
export const refactorApi = {
  start: (codebase: string, userId: string) =>
    fetch(`${REFACTOR}/refactor/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codebase, user_id: userId }),
    }).then(j<any>),
  deps: (sid: string) => fetch(`${REFACTOR}/refactor/${sid}/deps`).then(j<any>),
  file: (sid: string, path: string) =>
    fetch(`${REFACTOR}/refactor/${sid}/file?path=${encodeURIComponent(path)}`).then(j<any>),
};
const CONSTRAINT = '/api/constraint';
export const constraintApi = {
  archetypes: () => fetch(`${CONSTRAINT}/archetypes`).then(j<any>),
  start: (archetype: string, userId: string) =>
    fetch(`${CONSTRAINT}/constraint/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archetype, user_id: userId }),
    }).then(j<any>),
  current: (sid: string) => fetch(`${CONSTRAINT}/constraint/${sid}`).then(j<any>),
  submit: (sid: string, code: string) =>
    fetch(`${CONSTRAINT}/constraint/${sid}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).then(j<any>),
  hint: (sid: string, level: number) =>
    fetch(`${CONSTRAINT}/constraint/${sid}/hint?level=${level}`).then(j<any>),
};
