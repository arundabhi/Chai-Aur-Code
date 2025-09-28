import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
const options = {
  httpOnly: true,
  secure: true,
};

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { userName, fullName, email, password } = req.body;

  if (
    [userName, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { userName }] });
  if (existingUser) {
    throw new ApiError(409, "User already exists with this email, try login");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverLocalPath = req.files?.coverImage?.[0]?.path;
  console.log(avatarLocalPath, coverLocalPath);

  if (!avatarLocalPath || !coverLocalPath) {
    throw new ApiError(400, "Avatar and Cover image are required");
  }

  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = await uploadCloudinary(coverLocalPath);

  const user = await User.create({
    userName: userName.toLowerCase(),
    fullName,
    email,
    password,
    avatar: avatar?.secure_url,
    coverImage: coverImage?.secure_url,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -__v -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "User registration failed, try again");
  }

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;

  if (!(email || userName)) {
    throw new ApiError(400, "Email and Username required");
  }
  const user = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exits");
  }

  const matchPassword = await user.matchPassword(password);

  if (!matchPassword) {
    throw new ApiError(401, "Invalid user credinates");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          refreshToken,
          accessToken,
        },
        "User logged in Successfully"
      )
    );
});

const logOutUser = asyncHandler((req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  return res
    .status(200)
    .clearCookie("accesToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async(req,res)=>{
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken){
            throw new ApiError(401,"Unauthorized Request")
        }
    
        const decodedRefreshtoken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedRefreshtoken._id);
    
        if(!user){
            throw new ApiError(401,'Invalid refreshToken')
        }
        if(incomingRefreshToken!=user?.refreshToken){
            throw new ApiError(401,'Refreshed token is expired or used')
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("refreshToken", newRefreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
          new ApiResponse(
            200,
            {
              refreshToken:newRefreshToken,
              accessToken,
            },
            "Acces token refreshed"
          )
        );
    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid refresh token")
    }
})

const changePassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body;
    const user = await User.findById(req.user?._id);
    const isOldPassword = await user.matchPassword(oldPassword);

    if(!isOldPassword){
        throw new ApiError(400,"Invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false});
    
    return res.status(200).json(new ApiError(200,{},"Password changed succesfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(200,req.user,"Current user fetched succesfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body;
    if(!(fullName||email)){
        throw new ApiError(400,'All field are required')
    }

    const user =await User.findByIdAndUpdate(req.user?._id,{
        fullName:fullName,
        email:email
    },{new:true}).select('-password')

    return res.status(200).json(new ApiResponse(200,{user},'details updated succesfully'))

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = await req.files?.avatar?.[0]?.path;
    console.log('req.user:', req.user);

    console.log(avatarLocalPath)

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar doesnt exits")
    }
    const avatar = await uploadCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(401,"Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        avatar:avatar.url
    },{new:true}).select('-password')
    return res.status(200).json(new ApiResponse(200,{user},'avatar updated succesfully'))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage doesnt exits")
    }
    const coverImage = await uploadCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(401,"Error while uploading Cover image")
    }

    const user = User.findByIdAndUpdate(req.user?._id,{
        coverImage:coverImage.url
    },{new:true}).select('-password')

    return res.status(200).json(new ApiError(200,user,'CoverImage updated succesfully'))
})
export { loginUser, registerUser, logOutUser,refreshAccessToken ,changePassword,getCurrentUser,updateAccountDetails,updateUserCoverImage,updateUserAvatar};
