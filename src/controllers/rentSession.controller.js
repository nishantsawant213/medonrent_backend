import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { RentSession } from "../models/rentSession.model.js";
import { Patient } from "../models/patient.model.js";
import { Device } from "../models/device.model.js";
import { generateRentSessionID } from "../utils/generateIds.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const addRentSession = asyncHandler(async (req, res) => {
    let {
        patient,
        device,
        dateFrom,
        dateTo,
        totalHours,
        installerName,
        installTime,
        uninstallTime,
        installationStatus,
        report,
        referenceDoctorName,
        patientFeedback,
        billing,
        remarks,
        patientConsentFilePath,
        cancelReason,
    } = req.body;

    // Trim whitespace from string fields, especially IDs
    patient = patient?.trim();
    device = device?.trim();
    installerName = installerName?.trim();
    referenceDoctorName = referenceDoctorName?.trim();
    patientFeedback = patientFeedback?.trim();
    remarks = remarks?.trim();
    cancelReason = cancelReason?.trim();

    // Calculate totalHours based on dates and times
    if (dateFrom && dateTo && installTime && uninstallTime) {
        try {
            const startDateTime = new Date(`${dateFrom}T${installTime}`);
            const endDateTime = new Date(`${dateTo}T${uninstallTime}`);
            const diffMs = endDateTime - startDateTime;
            totalHours = Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
        } catch (error) {
            // If calculation fails, keep the provided totalHours or set to 0
            totalHours = totalHours || 0;
        }
    }

    // Set paymentStatus based on paymentType and paymentDate

    // Parse billing if it's a JSON string (from form-data)
    if (typeof billing === 'string') {
        try {
            billing = JSON.parse(billing);
        } catch (error) {
            return res.status(400).json(new ApiError(400, "Invalid billing data format."));
        }
    }

    // Parse report if it's a JSON string (from form-data)
    if (typeof report === 'string') {
        try {
            report = JSON.parse(report);
        } catch (error) {
            // If parsing fails, treat as plain string or set to null
            report = null;
        }
    }

    if (billing && billing.paymentType && billing.paymentDate) {
        billing.paymentStatus = "paid";
    }
    // Handle file uploads
    let reportFilePath = null;
    let patientConsentFilePathFromUpload = null;

    if (req.files) {
        if (req.files.reportFile && req.files.reportFile[0]) {
            reportFilePath = req.files.reportFile[0].path;
        }
        if (req.files.patientConsentFile && req.files.patientConsentFile[0]) {
            patientConsentFilePathFromUpload = req.files.patientConsentFile[0].path;
        }
    }

    // Validate required fields
    if (!patient) {
        return res.status(400).json(new ApiError(400, "Missing required fields: patient, device, dates, or totalHours."));
    }


    if (billing && (!billing?.totalCharges || !billing?.paymentType)) {
        return res.status(400).json(new ApiError(400, "Billing must include totalCharges and paymentType."));
    }


    // Optional: validate billing essentials


    // Validate patient
    const existingPatient = await Patient.findById(patient);
    if (!existingPatient) {
        return res.status(404).json(new ApiError(404, "Patient not found."));
    }

    // Validate device and its status
    const existingDevice = await Device.findById(device);
    if (!existingDevice) {
        return res.status(404).json(new ApiError(404, "Device not found."));
    }

    if (existingDevice.status !== "available") {
        return res.status(400).json(new ApiError(400, `Device is not available (current status: ${existingDevice.status}).`));
    }

    // Check for existing rent session with same device, patient, and overlapping dates
    const existingRentSession = await RentSession.findOne({
        patient: patient,
        device: device,
        isDeleted: false,
        $or: [
            // Check if dateFrom falls within existing session date range
            {
                dateFrom: { $lte: new Date(dateFrom) },
                dateTo: { $gte: new Date(dateFrom) }
            },
            // Check if dateTo falls within existing session date range
            {
                dateFrom: { $lte: new Date(dateTo) },
                dateTo: { $gte: new Date(dateTo) }
            },
            // Check if new session completely encompasses existing session
            {
                dateFrom: { $gte: new Date(dateFrom) },
                dateTo: { $lte: new Date(dateTo) }
            }
        ]
    });

    if (existingRentSession) {
        return res.status(409).json(new ApiError(409, "A rent session already exists for this patient, device, and date range."));
    }

    const rentSessionId = await generateRentSessionID();

    // Create rent session
    const rentSession = await RentSession.create({
        rentSessionId,
        patient,
        device,
        dateFrom,
        dateTo,
        totalHours,
        installerName,
        installTime,
        uninstallTime,
        installationStatus,
        report: reportFilePath ? { path: reportFilePath, generatedDate: new Date() } : report,
        referenceDoctorName,
        patientFeedback,
        billing,
        remarks,
        patientConsentFilePath: patientConsentFilePathFromUpload || patientConsentFilePath,
        cancelReason,
        createdBy: req.user?._id || null, // use auth user ID if available
    });

    // Update device status to rented
    //   existingDevice.status = "rented";
    //   await existingDevice.save();

    return res
        .status(201)
        .json(new ApiResponse(201, rentSession, "Rent session created successfully."));
});

const updateRentSession = asyncHandler(async (req, res) => {
    const { id } = req.params;


    // Find existing session first
    const existingSession = await RentSession.findById(id);
    if (!existingSession) {
        return res.status(404).json(new ApiError(404, "Rent session not found"));
    }

    let updateData = { ...req.body };

    console.log("data to udpate");
    console.log(updateData);

    // Trim whitespace from string fields, especially IDs
    if (updateData.device) updateData.device = updateData.device.trim();
    if (updateData.patient) updateData.patient = updateData.patient.trim();
    if (updateData.installerName) updateData.installerName = updateData.installerName?.trim();
    if (updateData.referenceDoctorName) updateData.referenceDoctorName = updateData.referenceDoctorName?.trim();
    if (updateData.patientFeedback) updateData.patientFeedback = updateData.patientFeedback?.trim();
    if (updateData.remarks) updateData.remarks = updateData.remarks?.trim();
    if (updateData.cancelReason) updateData.cancelReason = updateData.cancelReason?.trim();


    if (req.files) {
        console.log('Files received:', Object.keys(req.files));
        if (req.files.reportFile && req.files.reportFile[0]) {
            console.log('Report file path:', req.files.reportFile[0].path);
            updateData.report = {
                path: req.files.reportFile[0].path,
                generatedDate: new Date()
            };
        }
        if (req.files.patientConsentFile && req.files.patientConsentFile[0]) {
            console.log('Consent file path:', req.files.patientConsentFile[0].path);
            updateData.patientConsentFilePath = req.files.patientConsentFile[0].path;
        }
    } else {
        console.log('No files received in request');
    }

    // Validate required fields if patient is being updated
    if (updateData.patient && !updateData.patient.trim()) {
        return res.status(400).json(new ApiError(400, "Patient ID is required."));
    }

    // Validate billing if it's being updated
    if (updateData.billing && (!updateData.billing?.totalCharges || !updateData.billing?.paymentType)) {
        return res.status(400).json(new ApiError(400, "Billing must include totalCharges and paymentType."));
    }

    // Validate patient if being updated
    if (updateData.patient) {
        const existingPatient = await Patient.findById(updateData.patient);
        if (!existingPatient) {
            return res.status(404).json(new ApiError(404, "Patient not found."));
        }
    }

    // Validate device if being updated
    if (updateData.device) {
        const existingDevice = await Device.findById(updateData.device);
        if (!existingDevice) {
            return res.status(404).json(new ApiError(404, "Device not found."));
        }

        if (existingDevice.status !== "available") {
            return res.status(400).json(new ApiError(400, `Device is not available (current status: ${existingDevice.status}).`));
        }
    }

    // Calculate totalHours based on dates and times if they are being updated
    const dateFrom = updateData.dateFrom || existingSession.dateFrom;
    const dateTo = updateData.dateTo || existingSession.dateTo;
    const installTime = updateData.installTime || existingSession.installTime;
    const uninstallTime = updateData.uninstallTime || existingSession.uninstallTime;

    if (dateFrom && dateTo && installTime && uninstallTime) {
        try {
            const startDateTime = new Date(`${dateFrom}T${installTime}`);
            const endDateTime = new Date(`${dateTo}T${uninstallTime}`);
            const diffMs = endDateTime - startDateTime;
            const calculatedHours = Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
            if (!isNaN(calculatedHours) && isFinite(calculatedHours)) {
                updateData.totalHours = calculatedHours;
            }
        } catch (error) {
            // If calculation fails, don't update totalHours
        }
    }

    // Set paymentStatus based on paymentType and paymentDate
    if (updateData.billing) {
        if (updateData.billing.paymentType && updateData.billing.paymentDate) {
            updateData.billing.paymentStatus = "paid";
        }
    } else if (existingSession.billing && existingSession.billing.paymentType && existingSession.billing.paymentDate) {
        // If billing is not being updated but existing billing has payment info, ensure status is set
        updateData.billing = { ...existingSession.billing };
        updateData.billing.paymentStatus = "paid";

        // Ensure number fields are properly typed when copying existing billing
        if (updateData.billing.totalCharges !== undefined) {
            updateData.billing.totalCharges = Number(updateData.billing.totalCharges);
        }
        if (updateData.billing.discountAmount !== undefined) {
            updateData.billing.discountAmount = Number(updateData.billing.discountAmount) || 0;
        }
        if (updateData.billing.doctorCommission !== undefined) {
            updateData.billing.doctorCommission = Number(updateData.billing.doctorCommission) || 0;
        }
        if (updateData.billing.gst !== undefined) {
            updateData.billing.gst = Number(updateData.billing.gst) || 0;
        }
        if (updateData.billing.finalAmountPaid !== undefined) {
            updateData.billing.finalAmountPaid = Number(updateData.billing.finalAmountPaid);
        }
    }

    // Parse billing if it's a JSON string (from form-data)
    if (typeof updateData.billing === 'string') {
        try {
            updateData.billing = JSON.parse(updateData.billing);
        } catch (error) {
            return res.status(400).json(new ApiError(400, "Invalid billing data format."));
        }
    }

    // Ensure billing number fields are properly typed
    if (updateData.billing) {
        if (updateData.billing.totalCharges !== undefined) {
            updateData.billing.totalCharges = Number(updateData.billing.totalCharges);
        }
        if (updateData.billing.discountAmount !== undefined) {
            updateData.billing.discountAmount = Number(updateData.billing.discountAmount) || 0;
        }
        if (updateData.billing.doctorCommission !== undefined) {
            updateData.billing.doctorCommission = Number(updateData.billing.doctorCommission) || 0;
        }
        if (updateData.billing.gst !== undefined) {
            updateData.billing.gst = Number(updateData.billing.gst) || 0;
        }
        if (updateData.billing.finalAmountPaid !== undefined) {
            updateData.billing.finalAmountPaid = Number(updateData.billing.finalAmountPaid);
        }
    }

    // Parse report if it's a JSON string (from form-data)
    if (typeof updateData.report === 'string') {
        try {
            updateData.report = JSON.parse(updateData.report);
        } catch (error) {
            // If parsing fails, treat as plain string or set to null
            updateData.report = null;
        }
    }

    // Handle file uploads
    if (req.files) {
        console.log('Files received:', Object.keys(req.files));
        if (req.files.reportFile && req.files.reportFile[0]) {
            console.log('Report file path:', req.files.reportFile[0].path);
            updateData.report = {
                path: req.files.reportFile[0].path,
                generatedDate: new Date()
            };
        }
        if (req.files.patientConsentFile && req.files.patientConsentFile[0]) {
            console.log('Consent file path:', req.files.patientConsentFile[0].path);
            updateData.patientConsentFilePath = req.files.patientConsentFile[0].path;
        }
    } else {
        console.log('No files received in request');
    }

    // Check for duplicate if device, patient, or dates are being updated
    if (updateData.device || updateData.patient || updateData.dateFrom || updateData.dateTo) {
        const checkData = {
            patient: updateData.patient || existingSession.patient,
            device: updateData.device || existingSession.device,
            dateFrom: updateData.dateFrom || existingSession.dateFrom,
            dateTo: updateData.dateTo || existingSession.dateTo
        };

        const existingRentSession = await RentSession.findOne({
            _id: { $ne: id }, // Exclude current session
            patient: checkData.patient,
            device: checkData.device,
            isDeleted: false,
            $or: [
                // Check if dateFrom falls within existing session date range
                {
                    dateFrom: { $lte: new Date(checkData.dateFrom) },
                    dateTo: { $gte: new Date(checkData.dateFrom) }
                },
                // Check if dateTo falls within existing session date range
                {
                    dateFrom: { $lte: new Date(checkData.dateTo) },
                    dateTo: { $gte: new Date(checkData.dateTo) }
                },
                // Check if new session completely encompasses existing session
                {
                    dateFrom: { $gte: new Date(checkData.dateFrom) },
                    dateTo: { $lte: new Date(checkData.dateTo) }
                }
            ]
        });

        if (existingRentSession) {
            return res.status(409).json(new ApiError(409, "A rent session already exists for this patient, device, and date range."));
        }
    }

    // Optional: Auto-set updatedBy
    if (req.user?._id) {
        updateData.updatedBy = req.user._id;
    }

    const restrictedFields = ['createdBy'];
    for (const field of restrictedFields) {
        if (field in updateData) {
            delete updateData[field]; // Remove them if present in req.body
        }
    }

    // Perform update
    console.log('Update data being saved:', JSON.stringify(updateData, null, 2));
    try {
        const updatedSession = await RentSession.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        console.log('Updated session result:', updatedSession ? 'Success' : 'Failed');
        if (updatedSession) {
            console.log('Report path in updated session:', updatedSession.report?.path);
            console.log('Consent file path in updated session:', updatedSession.patientConsentFilePath);
        } else {
            console.log('No session returned from update');
        }

        return res
            .status(200)
            .json(new ApiResponse(200, updatedSession, "Rent session updated successfully"));
    } catch (dbError) {
        console.error('Database update error:', dbError);
        return res.status(500).json(new ApiError(500, "Failed to update rent session"));
    }
});

const deleteRentSession = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const session = await RentSession.findById(id);
    if (!session) {
        return res.status(404).json(new ApiError(404, "Rent session not found"));
    }

    if (session.isDeleted) {
        return res.status(400).json(new ApiError(400, "Rent session already deleted"));
    }

    session.isDeleted = true;
    session.updatedBy = req.user?._id || null;
    await session.save();

    return res
        .status(200)
        .json(new ApiResponse(200, session, "Rent session deleted (soft) successfully"));
});

const getRentSessionById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const session = await RentSession.findOne({ _id: id, isDeleted: false })
        .populate("patient", "-password -refreshToken")
        .populate("device");

    if (!session) {
        return res.status(404).json(new ApiError(404, "Rent session not found"));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, session, "Rent session fetched successfully"));
});


const getAllRentSessions = asyncHandler(async (req, res) => {
    const sessions = await RentSession.find({ isDeleted: false })
        .populate("patient", "patientName mobileNo email") // Minimal data
        .populate("device", "name deviceId type");

    return res
        .status(200)
        .json(new ApiResponse(200, sessions, "All rent sessions fetched successfully"));
});




const generateInvoice = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Find the rent session with populated data
    const rentSession = await RentSession.findById(id)
        .populate("patient", "patientName mobileNo email")
        .populate("device", "name deviceId type")
        .populate("createdBy", "firstName lastName");

    if (!rentSession) {
        return res.status(404).json(new ApiError(404, "Rent session not found"));
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${rentSession._id}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Invoice Header
    doc.fontSize(20).text('MEDICAL DEVICE RENTAL INVOICE', { align: 'center' });
    doc.moveDown();

    // Company Info
    doc.fontSize(12).text('MedOnRent Medical Services', { align: 'right' });
    doc.text('123 Medical Street, Health City', { align: 'right' });
    doc.text('Phone: +91-9876543210', { align: 'right' });
    doc.text('Email: info@medonrent.com', { align: 'right' });
    doc.moveDown();

    // Invoice Details
    doc.fontSize(14).text(`Invoice Number: INV-${rentSession._id.toString().slice(-8).toUpperCase()}`);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Rental Period: ${new Date(rentSession.dateFrom).toLocaleDateString()} to ${new Date(rentSession.dateTo).toLocaleDateString()}`);
    doc.moveDown();

    // Patient Information
    doc.fontSize(14).text('Patient Information:', { underline: true });
    doc.fontSize(12);
    doc.text(`Name: ${rentSession.patient.patientName}`);
    doc.text(`Mobile: ${rentSession.patient.mobileNo}`);
    doc.text(`Email: ${rentSession.patient.email}`);
    doc.moveDown();

    // Device Information
    doc.fontSize(14).text('Device Information:', { underline: true });
    doc.fontSize(12);
    doc.text(`Device Name: ${rentSession.device.name}`);
    doc.text(`Device ID: ${rentSession.device.deviceId}`);
    doc.text(`Type: ${rentSession.device.type}`);
    doc.moveDown();

    // Rental Details
    doc.fontSize(14).text('Rental Details:', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Hours: ${rentSession.totalHours}`);
    doc.text(`Installation Time: ${rentSession.installTime}`);
    doc.text(`Uninstallation Time: ${rentSession.uninstallTime}`);
    doc.text(`Installer: ${rentSession.installerName || 'N/A'}`);
    doc.text(`Reference Doctor: ${rentSession.referenceDoctorName || 'N/A'}`);
    doc.text(`Installation Status: ${rentSession.installationStatus}`);
    doc.moveDown();

    // Billing Information
    if (rentSession.billing) {
        doc.fontSize(14).text('Billing Information:', { underline: true });
        doc.fontSize(12);
        doc.text(`Total Charges: ₹${rentSession.billing.totalCharges || 0}`);
        doc.text(`Discount: ₹${rentSession.billing.discountAmount || 0}`);
        doc.text(`Doctor Commission: ₹${rentSession.billing.doctorCommission || 0}`);
        doc.text(`GST: ₹${rentSession.billing.gst || 0}`);

        const finalAmount = (rentSession.billing.totalCharges || 0) -
            (rentSession.billing.discountAmount || 0) +
            (rentSession.billing.gst || 0);

        doc.text(`Final Amount: ₹${finalAmount}`);
        doc.text(`Payment Type: ${rentSession.billing.paymentType || 'N/A'}`);
        doc.text(`Payment Status: ${rentSession.billing.paymentStatus || 'Pending'}`);
        if (rentSession.billing.paymentDate) {
            doc.text(`Payment Date: ${new Date(rentSession.billing.paymentDate).toLocaleDateString()}`);
        }
        doc.moveDown();
    }

    // Remarks
    if (rentSession.remarks) {
        doc.fontSize(14).text('Remarks:', { underline: true });
        doc.fontSize(12).text(rentSession.remarks);
        doc.moveDown();
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for choosing MedOnRent Medical Services!', { align: 'center' });
    doc.text('For any queries, please contact us at info@medonrent.com', { align: 'center' });

    // Finalize PDF
    doc.end();
});

export { addRentSession, updateRentSession, deleteRentSession, getAllRentSessions, getRentSessionById, generateInvoice };
