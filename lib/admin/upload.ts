/** Max image upload size for admin media (1 MB). */
export const MAX_IMAGE_UPLOAD_BYTES = 1_048_576;

export function assertImageWithinLimit(file: File): void {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image must be 1 MB or smaller.");
  }
}
