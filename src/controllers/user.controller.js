import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();

        const refreshToken = user.generateRefreshToken();
        console.log(accessToken, refreshToken);
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        return { error: new ApiError(500, "Something went wrong while generating Access or Refresh Token") };
    }
};

const loginUser = asyncHandler(async (req, res) => {
    const { email, mobileNo, password } = req.body;

    console.log(email, mobileNo);

    if (!email && !mobileNo) {
        return res.status(400).json(new ApiError(400, "Email or mobile number is required"));
    }

    // const user = await User.findOne({
    //     $or: [{ email, mobileNo }],
    // });

    const user = await User.findOne({
        $or: [{ email }, { mobileNo }],
    });



    if (!user) {
        return res.status(404).json(new ApiError(404, "User does not exist"));

    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        return res.status(404).json(new ApiError(404, "Email or password is incorrect"));
    }

    const tokenResult = await generateAccessAndRefreshTokens(user._id);

    if (tokenResult.error) {
        return res.status(tokenResult.error.statusCode).json(tokenResult.error);
    }

    const { accessToken, refreshToken } = tokenResult;

    const loggedUser = await User.findById(user._id).select(
        "-password -refreshToken",
    );

    const options = {
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedUser, accessToken, refreshToken },
                "User logged in successfully",
            ),
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        },
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken")
        .json(new ApiResponse(200, {}, "User logged Out"));
});

const registerUser = asyncHandler(async (req, res) => {
    const {
        password,
        mobileNo,
        email,
        firstName,
        lastName
    } = req.body;

    if (
        [
            firstName,
            lastName,
            email,
            mobileNo,
            password,
        ].some((field) => typeof field === "string" && field.trim() === "")
    ) {
        return res.status(400).json(new ApiError(400, "All fields are required"));
    }

    const existedUser = await User.findOne({
        $or: [{ mobileNo }, { email }],
    });
    console.log(existedUser);

    if (existedUser) {
        return res.status(409).json(new ApiError(409, "User Already Exists"));
    }

    const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        mobileNo,
        "userType": "admin"
    });

    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken")

    if (!createdUser) {
        return res.status(500).json(new ApiError(500, "Something Went Wrong while registrating the user"));
    }
    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "User regestered successfully"));
});

const currentUser = asyncHandler(async (req, res) => {
    console.log(req.user);
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "current user fetched Successfully"));
});


export {
    loginUser,
    logoutUser,
    currentUser,
    generateAccessAndRefreshTokens,
    registerUser
};
