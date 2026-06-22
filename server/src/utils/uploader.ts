import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.resolve(__dirname, "../../../uploads");

export interface UploadResult {
  filePath: string;
  publicUrl: string;
}

/**
 * Saves a base64 encoded file to the uploads directory.
 * @param fileData Base64 data URL string (e.g. "data:image/png;base64,...")
 * @param prefix Prefix for the unique filename (e.g. "lab-tk" or "submission")
 * @param fileName Original name of the file
 * @returns UploadResult containing the absolute path and the public URL
 */
export function saveBase64File(fileData: string, prefix: string, fileName: string): UploadResult {
  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Parse matches
  const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 file data.");
  }

  const base64Buffer = Buffer.from(matches[2], "base64");
  const uniqueFileName = `${prefix}-${Date.now()}-${fileName}`;
  const filePath = path.join(UPLOADS_DIR, uniqueFileName);

  // Write file
  fs.writeFileSync(filePath, base64Buffer);
  const publicUrl = `/uploads/${uniqueFileName}`;

  return {
    filePath,
    publicUrl,
  };
}
