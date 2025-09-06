import { Router } from "express";
import {
    addRentSession, updateRentSession, deleteRentSession, getAllRentSessions, getRentSessionById, generateInvoice
} from "../controllers/rentSession.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { uploadRentSessionFiles } from "../middlewares/upload.middleware.js";
const router = Router();
router.route("/all/").get(verifyJWT, getAllRentSessions);
router.route("").post(verifyJWT, uploadRentSessionFiles, addRentSession);
router.route("/:id").get(verifyJWT, getRentSessionById);
router.route("/:id").put(verifyJWT, uploadRentSessionFiles, updateRentSession);
router.route("/:id").delete(verifyJWT, deleteRentSession);
router.route("/:id/invoice").get(verifyJWT, generateInvoice);

export default router;
