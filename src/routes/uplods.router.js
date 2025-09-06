import { Router } from "express";
import { getFile } from "../controllers/uploads.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected route to get uploaded files - only accessible by file owner
router.route("/:filename").get(verifyJWT, getFile);

export default router;
