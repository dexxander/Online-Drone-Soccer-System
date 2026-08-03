import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { requireFirebase } from "./firebase";

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function uploadFile(path: string, file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("File must be smaller than 5 MB.");
  const { storage } = requireFirebase();
  const objectRef = ref(storage, `${path}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`);
  await uploadBytes(objectRef, file);
  return getDownloadURL(objectRef);
}

export async function uploadImage(path: string, file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error("Upload a PNG, JPEG, WebP or SVG image.");
  }
  return uploadFile(path, file);
}

export async function removeFile(downloadUrl: string): Promise<void> {
  try {
    const { storage } = requireFirebase();
    await deleteObject(ref(storage, downloadUrl));
  } catch {
    /* object may already be gone — non-fatal */
  }
}

export const STORAGE_PATHS = {
  teamLogos: "team-logos",
  tournamentImages: "tournament-images",
  documents: "documents",
  media: "media",
} as const;
