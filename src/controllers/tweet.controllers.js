import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    const user = req.user?._id;
    
    if(!user){
        throw new ApiError(404,'you are not uthorized')
    }

    if (content.length > 280) {
        throw new ApiError(400, "Content exceeds maximum length of 280 characters");
    }

    if(!content){
        throw new ApiError(400,'PLease provide content')
    }

    const tweet = await new Tweet({
        content,
        owner:user
    })
    await tweet.save()

    res.status(200).json(
        new ApiResponse(200,tweet,"succesfully created tweet")
    )
    //TODO: create tweet
    
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const userId = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid tweet ID");
    } 

    const tweets = await Tweet.find({ owner: userId }).sort({ createdAt: -1 });

    res.status(200).json(
        new ApiResponse(200, tweets, "Successfully fetched user tweets")
    );
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}