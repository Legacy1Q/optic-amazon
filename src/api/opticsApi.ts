const BASE_URL = (import.meta as any).env.VITE_OPTICS_API_URL;
console.log('[opticsApi] BASE_URL:', BASE_URL);

export interface SavedOptic {
  PK     : string;
  SK     : string;
  alias  : string;
  device : string;
  rSlot  : string;
  port   : number;
  serial : string | null;
  at     : string;
}

// ── Load all saved optics for a device ──────────────────
export const loadSavedOptics = async (
  alias  : string,
  device : string
): Promise<SavedOptic[]> => {
  const res = await fetch(
    `${BASE_URL}/optic?device=${encodeURIComponent(device)}`,
    {
      method  : "GET",
      headers : { "x-user-alias": alias },
    }
  );
  if (!res.ok) throw new Error("Failed to load saved optics");
  return res.json();
};

// ── Save a single optic ──────────────────────────────────
export const saveOptic = async (
  alias  : string,
  device : string,
  rSlot  : string,
  port   : number,
  serial : string | null = null
): Promise<void> => {
  const res = await fetch(`${BASE_URL}/optic`, {
    method  : "POST",
    headers : {
      "Content-Type" : "application/json",
      "x-user-alias" : alias,
    },
    body: JSON.stringify({ alias, device, rSlot, port, serial }),
  });
  if (!res.ok) throw new Error("Failed to save optic");
};

// ── Delete a single optic ────────────────────────────────
export const deleteOptic = async (
  alias  : string,
  device : string,
  rSlot  : string,
  port   : number
): Promise<void> => {
  const res = await fetch(
    `${BASE_URL}/optic?alias=${alias}&device=${encodeURIComponent(device)}&rSlot=${rSlot}&port=${port}`,
    {
      method  : "DELETE",
      headers : { "x-user-alias": alias },
    }
  );
  if (!res.ok) throw new Error("Failed to delete optic");
};
