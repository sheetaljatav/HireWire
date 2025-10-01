
import multer from "multer";
import fs from "fs";
import path from "path";

const useCloudinary = Boolean(process.env.CLOUD_NAME && process.env.API_KEY && process.env.API_SECRET);

// Use memory storage for Cloudinary, disk storage as a fallback
const diskDir = path.resolve(process.cwd(), 'uploads');
if (!useCloudinary) {
  try { fs.mkdirSync(diskDir, { recursive: true }); } catch {}
}

const storage = useCloudinary
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_, __, cb) => cb(null, diskDir),
      filename: (_, file, cb) => {
        const safe = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
        cb(null, safe);
      },
    });

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed!"), false);
};

export const singleUpload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).single("file");
