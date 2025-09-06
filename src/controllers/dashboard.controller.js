import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Patient } from "../models/patient.model.js";
import { Device } from "../models/device.model.js";
import { RentSession } from "../models/rentSession.model.js";

const getDashboardStats = asyncHandler(async (req, res) => {
    // Get current date for filtering
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Parallel execution for better performance
    const [
        patientStats,
        deviceStats,
        rentSessionStats,
        recentSessions,
        monthlyRevenue,
        deviceTypeStats,
        paymentStats
    ] = await Promise.all([
        // Patient Statistics
        Promise.all([
            Patient.countDocuments(),
            Patient.countDocuments({ createdAt: { $gte: startOfMonth } }),
            Patient.countDocuments({ createdAt: { $gte: startOfYear } })
        ]),

        // Device Statistics
        Promise.all([
            Device.countDocuments(),
            Device.countDocuments({ status: 'available' }),
            Device.countDocuments({ status: 'rented' }),
            Device.countDocuments({ status: 'maintenance' }),
            Device.countDocuments({ createdAt: { $gte: startOfMonth } })
        ]),

        // Rent Session Statistics
        Promise.all([
            RentSession.countDocuments({ isDeleted: false }),
            RentSession.countDocuments({ isDeleted: false, createdAt: { $gte: startOfMonth } }),
            RentSession.countDocuments({ isDeleted: false, installationStatus: 'completed' }),
            RentSession.countDocuments({ isDeleted: false, installationStatus: 'pending' }),
            RentSession.countDocuments({ isDeleted: false, installationStatus: 'cancelled' })
        ]),

        // Recent Sessions (last 10)
        RentSession.find({ isDeleted: false })
            .populate('patient', 'patientName')
            .populate('device', 'name deviceId')
            .sort({ createdAt: -1 })
            .limit(10)
            .select('patient device dateFrom dateTo totalHours installationStatus createdAt'),

        // Monthly Revenue & Profit
        RentSession.aggregate([
            {
                $match: {
                    isDeleted: false,
                    createdAt: { $gte: startOfMonth },
                    'billing.totalCharges': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$billing.totalCharges' },
                    totalDiscount: { $sum: { $ifNull: ['$billing.discountAmount', 0] } },
                    totalGST: { $sum: { $ifNull: ['$billing.gst', 0] } },
                    totalDoctorCommission: { $sum: { $ifNull: ['$billing.doctorCommission', 0] } },
                    count: { $sum: 1 }
                }
            }
        ]),

        // Device Type Statistics
        Device.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    available: {
                        $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
                    },
                    rented: {
                        $sum: { $cond: [{ $eq: ['$status', 'rented'] }, 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]),

        // Payment Statistics
        RentSession.aggregate([
            {
                $match: {
                    isDeleted: false,
                    'billing.paymentStatus': { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$billing.paymentStatus',
                    count: { $sum: 1 },
                    totalAmount: { $sum: { $ifNull: ['$billing.totalCharges', 0] } }
                }
            }
        ])
    ]);

    // Calculate totals
    const totalRevenue = monthlyRevenue[0]?.totalRevenue || 0;
    const totalDiscount = monthlyRevenue[0]?.totalDiscount || 0;
    const totalGST = monthlyRevenue[0]?.totalGST || 0;
    const totalDoctorCommission = monthlyRevenue[0]?.totalDoctorCommission || 0;

    // Business calculations
    const revenue = totalRevenue - totalDiscount + totalGST; // Total collected from customers
    const profit = totalRevenue - totalDiscount - totalGST - totalDoctorCommission; // Net profit after expenses

    // Structure the response
    const dashboardData = {
        overview: {
            totalPatients: patientStats[0],
            totalDevices: deviceStats[0],
            totalRentSessions: rentSessionStats[0],
            monthlyRevenue: revenue,
            monthlyProfit: profit,
            availableDevices: deviceStats[1]
        },

        patientStats: {
            totalPatients: patientStats[0],
            newPatientsThisMonth: patientStats[1],
            newPatientsThisYear: patientStats[2]
        },

        deviceStats: {
            totalDevices: deviceStats[0],
            availableDevices: deviceStats[1],
            rentedDevices: deviceStats[2],
            maintenanceDevices: deviceStats[3],
            newDevicesThisMonth: deviceStats[4],
            utilizationRate: deviceStats[0] > 0 ?
                Math.round(((deviceStats[2] / deviceStats[0]) * 100) * 100) / 100 : 0
        },

        rentSessionStats: {
            totalSessions: rentSessionStats[0],
            newSessionsThisMonth: rentSessionStats[1],
            completedSessions: rentSessionStats[2],
            pendingSessions: rentSessionStats[3],
            cancelledSessions: rentSessionStats[4],
            completionRate: rentSessionStats[0] > 0 ?
                Math.round(((rentSessionStats[2] / rentSessionStats[0]) * 100) * 100) / 100 : 0
        },

        financialStats: {
            monthlyRevenue: revenue,
            monthlyProfit: profit,
            totalCharges: totalRevenue,
            totalDiscount: totalDiscount,
            totalGST: totalGST,
            totalDoctorCommission: totalDoctorCommission,
            sessionsThisMonth: monthlyRevenue[0]?.count || 0,
            averageRevenuePerSession: monthlyRevenue[0]?.count > 0 ?
                Math.round((revenue / monthlyRevenue[0].count) * 100) / 100 : 0,
            averageProfitPerSession: monthlyRevenue[0]?.count > 0 ?
                Math.round((profit / monthlyRevenue[0].count) * 100) / 100 : 0,
            profitMargin: revenue > 0 ?
                Math.round((profit / revenue) * 100 * 100) / 100 : 0
        },

        deviceTypeBreakdown: deviceTypeStats,

        paymentStats: paymentStats.reduce((acc, stat) => {
            acc[stat._id] = {
                count: stat.count,
                totalAmount: stat.totalAmount
            };
            return acc;
        }, {}),

        recentActivity: recentSessions.map(session => ({
            id: session._id,
            patientName: session.patient?.patientName || 'N/A',
            deviceName: session.device?.name || 'N/A',
            deviceId: session.device?.deviceId || 'N/A',
            dateFrom: session.dateFrom,
            dateTo: session.dateTo,
            totalHours: session.totalHours,
            status: session.installationStatus,
            createdAt: session.createdAt
        })),

        charts: {
            deviceStatusDistribution: [
                { name: 'Available', value: deviceStats[1], color: '#10B981' },
                { name: 'Rented', value: deviceStats[2], color: '#3B82F6' },
                { name: 'Maintenance', value: deviceStats[3], color: '#F59E0B' },
                { name: 'Inactive', value: deviceStats[0] - deviceStats[1] - deviceStats[2] - deviceStats[3], color: '#EF4444' }
            ],

            sessionStatusDistribution: [
                { name: 'Completed', value: rentSessionStats[2], color: '#10B981' },
                { name: 'Pending', value: rentSessionStats[3], color: '#F59E0B' },
                { name: 'Cancelled', value: rentSessionStats[4], color: '#EF4444' }
            ],

            monthlyTrends: {
                patients: patientStats[1],
                devices: deviceStats[4],
                sessions: rentSessionStats[1],
                revenue: revenue,
                profit: profit
            }
        }
    };

    return res.status(200).json(
        new ApiResponse(200, dashboardData, "Dashboard statistics retrieved successfully")
    );
});

export { getDashboardStats };