import { Router } from "express";
import { loginUser, logOutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar } from "../controllers/user.controllers.js";
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
router.route('/update-user-avatar').post(verifyJWT,
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        }
    ]),updateUserAvatar)
router.route('/update-user-details').post(verifyJWT,updateAccountDetails)
router.route('/logout').post(
    verifyJWT,
    logOutUser)


export default router;