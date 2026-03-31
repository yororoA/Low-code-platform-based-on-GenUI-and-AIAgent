export function dispatchEvent<T>(name: string, detail: T) {
  const event = new CustomEvent<T>(name, { detail: detail });
  window.dispatchEvent(event);
}