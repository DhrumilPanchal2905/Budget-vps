// Native: download a file from the API (e.g. CSV export) and open the share sheet (save to Files / Drive / WhatsApp…).
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_URL } from "./config";
import { ApiClientError, baseHeaders } from "./api";
import { applySetCookie } from "./cookie-jar";

export async function downloadFromApi(path: string, filename: string, mime = "text/csv"): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { headers: await baseHeaders(), credentials: "omit" });
  applySetCookie(res.headers.get("x-bp-set-cookie"));
  if (!res.ok) {
    let msg = "Download failed.";
    try {
      msg = ((await res.json()) as { message?: string }).message || msg;
    } catch {
      /* not json */
    }
    throw new ApiClientError(res.status, msg);
  }
  const text = await res.text();
  const uri = `${FileSystem.cacheDirectory}${filename.replace(/[^\w.-]/g, "_")}`;
  await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: filename, UTI: mime === "text/csv" ? "public.comma-separated-values-text" : undefined });
}
