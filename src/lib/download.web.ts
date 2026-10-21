// Web: download a file from the API (cookies included) and save it with the browser.
import { API_URL } from "./config";
import { ApiClientError } from "./api";

export async function downloadFromApi(path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    let msg = "Download failed.";
    try {
      msg = ((await res.json()) as { message?: string }).message || msg;
    } catch {
      /* not json */
    }
    throw new ApiClientError(res.status, msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
