/** Old builds linked to /#/pair (HashRouter). BrowserRouter ignores the hash — redirect once. */
export function redirectLegacyHashRoutes() {
  const { hash } = window.location;
  if (!hash.startsWith('#/')) return;

  const hashBody = hash.slice(1);
  const qIndex = hashBody.indexOf('?');
  const legacyPath = qIndex === -1 ? hashBody : hashBody.slice(0, qIndex);
  const legacyQuery = qIndex === -1 ? '' : hashBody.slice(qIndex);

  if (!legacyPath.startsWith('/')) return;

  window.location.replace(legacyPath + legacyQuery);
}
