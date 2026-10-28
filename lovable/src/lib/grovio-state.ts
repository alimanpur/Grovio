/** Client-side session + onboarding + tour state (prototype, localStorage). */

export type Role = "Owner" | "Manager" | "Cashier";

export type Session = {
  name: string;
  email: string;
  role: Role;
  storeName: string;
};

const SESSION = "grovio.session";
const ONBOARDED = "grovio.onboarded";
const TOUR = "grovio.tourDone";

const read = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const getSession = () => read<Session>(SESSION);

export const setSession = (session: Session) => {
  window.localStorage.setItem(SESSION, JSON.stringify(session));
};

export const clearSession = () => {
  window.localStorage.removeItem(SESSION);
};

export const isOnboarded = () => read<boolean>(ONBOARDED) === true;
export const setOnboarded = (v: boolean) =>
  window.localStorage.setItem(ONBOARDED, JSON.stringify(v));

export const isTourDone = () => read<boolean>(TOUR) === true;
export const setTourDone = (v: boolean) =>
  window.localStorage.setItem(TOUR, JSON.stringify(v));

export const defaultSession: Session = {
  name: "Ramesh Sharma",
  email: "ramesh@sharmaprovision.in",
  role: "Owner",
  storeName: "Sharma Provision Store",
};
