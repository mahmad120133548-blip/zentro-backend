import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported image type: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
});

export default upload;