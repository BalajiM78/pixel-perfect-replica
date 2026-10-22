import { appConfig } from "./config";

export interface PickedFile {
  file: File;
  filename: string;
  contentBase64: string;
  sizeBytes: number;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

/** Validate and convert a picked document to the backend's Base64 JSON payload. */
export async function pickDocument(
  file: File,
  acceptedExtensions: string[] = appConfig.acceptedResumeTypes
): Promise<PickedFile> {
  const lower = file.name.toLowerCase();
  const okType = acceptedExtensions.some((ext) => lower.endsWith(ext));
  if (!okType) {
    throw new Error(`Unsupported file type. Accepted: ${acceptedExtensions.join(", ")}`);
  }
  if (file.size > appConfig.uploadMaxBytes) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Limit is 10 MB.`);
  }
  if (file.size === 0) {
    throw new Error("The file is empty.");
  }
  const contentBase64 = await fileToBase64(file);
  return { file, filename: file.name, contentBase64, sizeBytes: file.size };
}
