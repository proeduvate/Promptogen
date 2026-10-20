import { useState } from "react";
import { SEED_PROFILES } from "../data/contextProfiles";

const PROFILES_KEY = "pg-context-profiles";
const ACTIVE_KEY = "pg-active-profile";

const read = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode): changes still hold for this visit.
  }
};

/* Context Profiles and the one in use, saved in localStorage. */
export default function useContextProfiles() {
  const [profiles, setProfiles] = useState(() => read(PROFILES_KEY, SEED_PROFILES));
  const [activeId, setActiveIdState] = useState(() => read(ACTIVE_KEY, null));

  const commit = (next) => {
    write(PROFILES_KEY, next);
    return next;
  };

  const saveProfile = (profile) =>
    setProfiles((list) =>
      commit(list.some(({ id }) => id === profile.id) ? list.map((item) => (item.id === profile.id ? profile : item)) : [...list, profile]),
    );

  const deleteProfile = (id) => {
    setProfiles((list) => commit(list.filter((item) => item.id !== id)));
    if (activeId === id) setActiveId(null);
  };

  const setActiveId = (id) => {
    write(ACTIVE_KEY, id);
    setActiveIdState(id);
  };

  const active = profiles.find(({ id }) => id === activeId) ?? null;

  return { profiles, active, activeId: active ? activeId : null, setActiveId, saveProfile, deleteProfile };
}
