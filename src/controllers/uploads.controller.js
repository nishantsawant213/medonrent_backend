import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { RentSession } from "../models/rentSession.model.js";
import path from "path";
import fs from "fs";

const getFile = asyncHandler(async (req, res) => {
    const { filename } = req.params;

    if (!filename) {
        return res.status(400).json(new ApiError(400, "Filename is required"));
    }

    // Find the rent session that contains this file
    const rentSession = await RentSession.findOne({
        $or: [
            { "report.path": filename },
            { patientConsentFilePath: filename }
        ],
        isDeleted: false
    });

    if (!rentSession) {
        return res.status(404).json(new ApiError(404, "File not found"));
    }

    // Check if the current user is the owner (createdBy) of this rent session
    if (!rentSession.createdBy || rentSession.createdBy.toString() !== req.user?._id.toString()) {
        return res.status(403).json(new ApiError(403, "Access denied. You can only access files you uploaded."));
    }

    // Construct the full file path
    const filePath = path.join(process.cwd(), 'uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json(new ApiError(404, "File not found on server"));
    }

    // Get file stats for content type detection
    const stat = fs.statSync(filePath);

    // Set appropriate content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';

    switch (ext) {
        case '.pdf':
            contentType = 'application/pdf';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.doc':
            contentType = 'application/msword';
            break;
        case '.docx':
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Handle stream errors
    fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
            return res.status(500).json(new ApiError(500, "Error streaming file"));
        }
    });
});

export { getFile };