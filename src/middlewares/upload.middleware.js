import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ApiError } from '../utils/ApiError.js';

// Define storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Save files in 'uploads' directory relative to the project root
        const uploadDir = path.join(process.cwd(), 'uploads');

        // Ensure uploads directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Custom function to get relative path for storage
const getRelativePath = (absolutePath) => {
    // Simply return the filename from the absolute path
    // Since multer saves files directly to uploads directory, we just need the filename
    return path.basename(absolutePath);
};

// File filter to allow only certain file types (e.g., images, PDFs)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new ApiError(400, 'Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
};

// Create multer instance with configuration
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit per file
    fileFilter: fileFilter
});

// Middleware for handling rent session file uploads with relative paths
export const uploadRentSessionFiles = (req, res, next) => {
    const multerUpload = upload.fields([

        { name: 'reportFile', maxCount: 1 },
        { name: 'patientConsentFile', maxCount: 1 }
    ]);

    multerUpload(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return next(err);
        }

        // Convert absolute paths to relative paths for security
        if (req.files) {
            if (req.files.reportFile && req.files.reportFile[0]) {
                const originalPath = req.files.reportFile[0].path;
                const relativePath = getRelativePath(originalPath);
                console.log('Report file - Original path:', originalPath, 'Relative path:', relativePath);
                req.files.reportFile[0].path = relativePath;
            }
            if (req.files.patientConsentFile && req.files.patientConsentFile[0]) {
                const originalPath = req.files.patientConsentFile[0].path;
                const relativePath = getRelativePath(originalPath);
                console.log('Consent file - Original path:', originalPath, 'Relative path:', relativePath);
                req.files.patientConsentFile[0].path = relativePath;
            }
        }

        next();
    });
};