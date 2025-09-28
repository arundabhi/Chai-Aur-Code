import mongoose,{Schema} from "mongoose";
import bcrpyt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    userName:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        index:true,
        lowercase:true,
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true,
    },
   
    avatar:{
        type:String,
        required:true
    },
    coverImage:{
        type:String,
        required:true
    },
    watchHistory:[{
        type:Schema.Types.ObjectId,
        ref:'Video'
    }],
    password:{
        type:String,
        required:[true,"Password is required"],
    },
    refreshToken:{
        type:String,
        default:""
    }
},{timestamps:true})

userSchema.pre('save', async function (next) {
    if(!this.isModified('password')){
        return next();
    }   
    const salt = await bcrpyt.genSalt(10);
    this.password = await bcrpyt.hash(this.password,salt);
    next();
})

userSchema.methods.matchPassword = async function (password) {
    return await bcrpyt.compare(password,this.password);
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {   _id:this._id,
            userName:this.userName,
            email:this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:process.env.ACCESS_TOKEN_EXPIRES}
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {userId:this._id},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:process.env.REFRESH_TOKEN_EXPIRES}
    )
}

export const User = mongoose.model('User',userSchema)