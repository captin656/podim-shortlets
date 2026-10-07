// File storage. Production uses Vercel Blob (set BLOB_READ_WRITE_TOKEN). Local development without a
// token writes into /public/uploads so the admin photo uploader still works end to end.

import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ApiError } from "./api";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const PROOF_TYPES = [...IMAGE_TYPES, "application/pdf"];
const MAX_BYTES = 8 * 1024 * 1024;

export async function storeFile(file: File, folder: "apartments" | "proofs", kind: "image" | "proof" = "image"): Promise<string> {
  const allowed = kind === "image" ? IMAGE_TYPES : PROOF_TYPES;
  if (!allowed.includes(file.type)) throw new ApiError(400, kind === "image" ? "Upload a JPG, PNG or WebP image." : "Upload a JPG, PNG, WebP or PDF file.");
  if (file.size > MAX_BYTES) throw new ApiError(400, "That file is larger than 8 MB.");

  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
  const name = `${folder}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, file, { access: "public", addRandomSuffix: false });
    return blob.url;
  }
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(503, "File storage is not set up. Add BLOB_READ_WRITE_TOKEN in your Vercel project settings.");
  }
  const dest = path.join(process.cwd(), "public", "uploads", name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}
