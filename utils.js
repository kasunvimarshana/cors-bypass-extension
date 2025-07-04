export function isUrlAllowed(url, patterns) {
  if (patterns.includes("*")) return true;
  try {
    const parsed = new URL(url);
    return patterns.some(pattern => {
      if (pattern.startsWith("*.")) {
        const domain = pattern.substring(2);
        return parsed.hostname === domain || parsed.hostname.endsWith("." + domain);
      }
      return parsed.hostname === pattern;
    });
  } catch (e) {
    return false;
  }
}