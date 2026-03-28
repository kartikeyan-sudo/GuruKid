const KEY = "gurukid-notes";

export function saveText(name, content) {
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  data[name] = content;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadText(name) {
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  return data[name] || "";
}

export function listFiles() {
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  return Object.keys(data);
}
