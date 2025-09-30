import mongoose,{Schema} from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";

const playlistSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    discription:{
        type:String,
        required:true
    },
    video:[{
        type:Schema.Types.ObjectId,
        ref:'Video',
    }],
    owner:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,
    }
},{timestamps:true})

playlistSchema.plugin(aggregatePaginate);

export const Playlist = mongoose.model('Playlist',playlistSchema)

