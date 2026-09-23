let sequence = 0;

// Temporary UI identifiers; persisted IDs are assigned by the API.
export function createClientId() {
  sequence += 1;
  return `client-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2)}`;
}
