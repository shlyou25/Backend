const mongoose = require('mongoose');

const userSchema=mongoose.Schema({
    _id:mongoose.Types.ObjectId,
    name:{type:String,required:false},
    email:{type:String,required:true},
    password:{type:String,required:true},
    phoneNumber:{type:String,required:false},
    activeToken:{type:String,required:false},
    isEmailVerified:{type:Boolean,required:false},
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    // Reference to the Plan schema
   plans: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Plan" }
    ]
})

module.exports=mongoose.model('Users',userSchema)