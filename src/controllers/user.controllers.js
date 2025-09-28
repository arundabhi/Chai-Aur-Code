import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const options = {
    httpOnly: true,
    secure: true
}


const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { userName, fullName, email, password } = req.body;

    if ([userName, fullName, email, password].some(field => field?.trim() === '')) {
        throw new ApiError(400, 'All fields are required');
    }

    const existingUser = await User.findOne({ $or: [{ email }, { userName }] });
    if (existingUser) {
        throw new ApiError(409, 'User already exists with this email, try login');
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverLocalPath = req.files?.coverImage?.[0]?.path;
    console.log(avatarLocalPath, coverLocalPath);

    if (!avatarLocalPath || !coverLocalPath) {
        throw new ApiError(400, 'Avatar and Cover image are required');
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

    const createdUser = await User.findById(user._id).select('-password -__v -refreshToken');
    if (!createdUser) {
        throw new ApiError(500, 'User registration failed, try again');
    }

    res.status(201).json(new ApiResponse(201, createdUser, 'User Registered Successfully'));
});

const loginUser = asyncHandler(async(req,res)=>{
    const {email,userName,password} = req.body;

    if(!(email || userName)){
        throw new ApiError(400,'Email and Username required')
    }
    const user = await User.findOne({
        $or:[{email},{userName}]
    })
    if(!user){
        throw new ApiError(404,"User does not exits")
    }

    const matchPassword = await user.matchPassword(password);

    if(!matchPassword){
        throw new ApiError(401,'Invalid user credinates')
    }
    
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser  = await User.findById(user._id).select('-password -refreshToken')


    return res.status(200)
    .cookie('refreshToken',refreshToken,options)
    .cookie('accessToken',accessToken,options)
    .json(new ApiResponse(200,{
        user:loggedInUser,refreshToken,accessToken

    },'User logged in Successfully'))


})

const logOutUser = asyncHandler((req,res)=>{
    User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken:undefined
        }
    },{
        new:true
    }
)
 return res.status(200).clearCookie("accesToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User logged Out"))

})

export { 
    loginUser,
    registerUser,
    logOutUser
};
