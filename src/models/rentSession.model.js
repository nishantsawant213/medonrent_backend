import mongoose, { Schema } from "mongoose";

const rentSessionSchema = new Schema({
    rentSessionId: { type: String, required: true, unique: true },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
    },
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
    },
    dateFrom: {
        type: Date,

    },
    dateTo: {
        type: Date,
    },
    totalHours: {
        type: Number,
    },

    installerName: {
        type: String,
        trim: true,
    },
    installTime: {
        type: String,
    },
    uninstallTime: {
        type: String,
    },
    installationStatus: {
        type: String,
        enum: ["pending", "completed", "cancelled"],
        default: "pending",
    },

    report: {
        path: { type: String },
        generatedDate: { type: Date },
    },

    referenceDoctorName: {
        type: String,
        trim: true,
    },

    patientFeedback: {
        type: String,
        trim: true,
    },

    billing: {
        totalCharges: { type: Number, },
        discountAmount: { type: Number, default: 0 },
        doctorCommission: { type: Number, default: 0 },
        gst: { type: Number, default: 0 },
        paymentType: {
            type: String,
            enum: ["cash", "upi", "card", "bank-transfer", "other"],
        },
        paymentDate: { type: Date },
        paymentStatus: {
            type: String,
            enum: ["paid", "unpaid", "partial", "pending"],
            default: "unpaid",
        },
        finalAmountPaid: { type: Number }, // Optional derived field
        invoiceFilePath: { type: String },
    },

    remarks: {
        type: String,
        trim: true,
    },

    patientConsentFilePath: {
        type: String,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    isDeleted: {
        type: Boolean,
        default: false,
    },

    cancelReason: {
        type: String,
        default: "",
        trim: true,
    }

}, { timestamps: true });


export const RentSession = mongoose.model("RentSession", rentSessionSchema);
