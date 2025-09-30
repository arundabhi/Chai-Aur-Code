import { Router } from "express";
import upload from "../middlewares/multer.middlewares.js";
import { 
  getVideoById, 
  publishAVideo, 
  updateVideo, 
  deleteVideo, 
  getAllVideos, 
  togglePublishStatus 
} from "../controllers/video.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Upload video
router.post(
  '/upload-video', 
  upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  verifyJWT,
  publishAVideo
);

// Get single video
router.get('/:videoId', getVideoById);

// Update video
router.post('/update-video/:videoId', verifyJWT, upload.single('thumbnail'), updateVideo);

// Delete video
router.delete('/:videoId', verifyJWT, deleteVideo);

// Get all videos
router.get('/', getAllVideos);

// Toggle publish status
router.patch('/toggle-publish/:videoId', verifyJWT, togglePublishStatus);

export default router;
