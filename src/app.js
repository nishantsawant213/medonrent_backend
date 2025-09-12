import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();



app.use(cors({
    // origin: "http://localhost:5173", // Specify the frontend's URL
    origin: "http://103.194.228.99:5173", // Specify the frontend's URL
    credentials: true,  // Allow credentials (cookies, authorization headers, etc.)
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Authorization"
}));
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes
import userRouter from './routes/user.router.js';
import patientRouter from './routes/patient.router.js';
import deviceRouter from './routes/device.router.js';
import rentSessionRouter from './routes/rentSession.router.js';
import uploadsRouter from './routes/uplods.router.js';
import dashboardRouter from './routes/dashboard.router.js';
// import metaRouter from './routes/metaData.router.js';

//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/patient", patientRouter)
app.use("/api/v1/device", deviceRouter)
app.use("/api/v1/rentsession", rentSessionRouter)
app.use('/api/v1/uploads', uploadsRouter)
app.use('/api/v1/dashboard', dashboardRouter)
// app.use("/api/v1/metadata", metaRouter)
app.get('/', (req, res) => {
    res.send('Hello, World!');
});

  

export { app }