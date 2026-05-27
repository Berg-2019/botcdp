import path from "path";
import multer, { Options } from "multer";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

const ALLOWED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".mp4", ".webm", ".ogg", ".mp3", ".opus",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".txt", ".csv"
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const multerConfig: Options & { directory: string } = {
  directory: publicFolder,

  storage: multer.diskStorage({
    destination: publicFolder,
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const fileName = new Date().getTime() + ext;

      return cb(null, fileName);
    }
  }),

  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error(`File type not allowed: ${ext}`));
  },

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5
  }
};

export default multerConfig;
