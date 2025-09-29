import { Router } from "express";
import { changePassword, getChanelUserProfile, getCurrentUser, getWatchedhistory, loginUser, logOutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controllers.js";
import upload from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 5
        }
    ]),
    registerUser
);

router.route('/login').post(loginUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/update-user-avatar').patch(verifyJWT,upload.single('avatar'),updateUserAvatar)
router.route('/update-user-coverImage').patch(verifyJWT,upload.single('coverImage'),updateUserCoverImage)
router.route('/update-user-details').patch(verifyJWT,updateAccountDetails)
router.route('/update-user-password').post(verifyJWT,changePassword)
router.route('/current-user').get(verifyJWT,getCurrentUser)
router.route('/c/:userName').get(verifyJWT,getChanelUserProfile)
router.route('/history').get(verifyJWT,getWatchedhistory)
router.route('/logout').post(
    verifyJWT,
    logOutUser)


export default router;