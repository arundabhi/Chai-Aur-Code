import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadCloudinary} from "../utils/cloudinary.js"
import upload from "../middlewares/multer.middlewares.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, userId } = req.query;

    let match = { isPublished: true };

    if (query) {
    match.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
        ];
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    match.owner = mongoose.Types.ObjectId(userId);
    }

    const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { createdAt: -1 },
    populate: { path: "owner", select: "username email avatar" },
    
    };

    const result = await Video.aggregatePaginate([{ $match: match }], options);

    return res.status(200).json(
    new ApiResponse(200, result, "Videos fetched successfully")
    );

    
})

const publishAVideo = asyncHandler(async (req, res) => {
    const title = req.body?.title;
    const description = req.body?.description;
    const videoFile = req.files?.videoFile?.[0]?.path;
    const thumbnail = req.files?.thumbnail?.[0]?.path;

    if(!title || !thumbnail || !videoFile || !description ){
        throw new ApiError(401,'All fields are required')
    }

    const uploadVideo = await uploadCloudinary(videoFile)
    const duration = uploadVideo.duration
    const uploadThumbnail = await uploadCloudinary(thumbnail)
    const videoFilePublicId = uploadVideo.public_id;
    const thumbnailPublicId = uploadThumbnail.public_id;

    const newVideo = new Video({
        title,
        description,
        videoFile:uploadVideo.url,
        thumbnail:uploadThumbnail.url,
        duration,
        owner:req.user._id,
        isPublished:true,
        videoFilePublicId,
        thumbnailPublicId
    })
    await newVideo.save();

    if(!newVideo){
        throw new ApiError(401,"failed to upload video")
    }

    return res.status(200).json(
        new ApiResponse(200,newVideo,'Video uploaded succesfully')
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(404,'something went wrong while passing vide ID')
    }
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400,"Invalid Id")
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,'Video not found')
    }
    res.status(200).json(
        new ApiResponse(200,video,'video Fetched succesfully')
    )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400,"Invalid Id")
    }

    const existingVideo = await Video.findById(videoId);
    if (!existingVideo) {
        throw new ApiError(404, "Video not found");
    }

    const title = req.body.title;
    const description = req.body.description;
    const thumbnailPath = req.file?.path; // works if using upload.single("thumbnail")

    let uploadThumbnail, thumbnailPublicId;

    if (thumbnailPath) {
        // Delete old thumbnail from Cloudinary if exists
        if (existingVideo.thumbnailPublicId) {
        await cloudinary.uploader.destroy(existingVideo.thumbnailPublicId);
        }

        // Upload new thumbnail
        uploadThumbnail = await uploadCloudinary(thumbnailPath);
        thumbnailPublicId = uploadThumbnail.public_id;
    }


    const newVideo = await Video.findByIdAndUpdate(videoId,{
        title,
        description,
        thumbnail:uploadThumbnail.url,
        thumbnailPublicId
    },{new:true})

    return res.status(200).json(
        new ApiResponse(200,newVideo,'Video details upadated succesfully')
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const video = await Video.findByIdAndDelete(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.thumbnailPublicId) {
    await cloudinary.uploader.destroy(video.thumbnailPublicId);
  }
  if (video.videoFilePublicId) {
    await cloudinary.uploader.destroy(video.videoFilePublicId, { resource_type: "video" });
  }

  res.status(200).json(
    new ApiResponse(200,true,'video deleted succesfully')
  );
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }
  const video = await Video.findById(videoId);
   if (!video) {
      throw new ApiError(404, "Video not found");
   }

  if(video.owner.toString() !== req.user._id.toString()){
    throw new ApiError(403,'You are not authorized')
  }

  video.isPublished = !video.isPublished
  await video.save();

  return res
      .status(200)
      .json(new ApiResponse(200, "Video publish status toggled", video));
    
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}