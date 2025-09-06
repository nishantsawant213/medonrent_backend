import { Router } from "express";
import {
    addDevice,
    updateDevice,
    deleteDevice,
    getDevice,
    getAllDevices
} from "../controllers/device.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();
router.route("/all/").get(verifyJWT, getAllDevices);
router.route("").post(verifyJWT, addDevice);
router.route("/:id").get(verifyJWT, getDevice);
router.route("/:id").put(verifyJWT, updateDevice);
router.route("/:id").delete(verifyJWT, deleteDevice);

export default router;
