import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;

// Garante que o diretorio de uploads exista no boot.
const absoluteUploadDir = path.resolve(UPLOAD_DIR);
if (!fs.existsSync(absoluteUploadDir)) {
  fs.mkdirSync(absoluteUploadDir, { recursive: true });
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, absoluteUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo invalido. Apenas imagens sao permitidas (jpeg, png, webp, gif).'));
  }
}

/**
 * Middleware multer configurado para upload de fotos de produtos.
 * - Maximo 5MB por arquivo.
 * - Apenas imagens (jpeg, png, webp, gif).
 * - Salva em disco na pasta de uploads.
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

/**
 * Resolve o caminho absoluto de um arquivo de upload pelo nome.
 */
export function resolveUploadPath(filename: string): string {
  return path.join(absoluteUploadDir, filename);
}

/**
 * Constroi a URL publica relativa de um arquivo de upload.
 */
export function buildPublicUrl(filename: string): string {
  return `/uploads/${filename}`;
}

/**
 * Remove um arquivo de upload do disco, silenciando erro se nao existir.
 */
export function deleteUploadFile(filename: string): void {
  const filePath = resolveUploadPath(filename);
  fs.promises.unlink(filePath).catch(() => {
    /* arquivo ja inexistente — ignora */
  });
}

export { UPLOAD_DIR, absoluteUploadDir };
