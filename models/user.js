const mongoose = require('mongoose');

const userSchema=mongoose.Schema({
    _id:mongoose.Types.ObjectId,
    name:{type:String,require:false},
    email:{type:String,require:true},
    password:{type:String,require:true},
    phoneNumber:{type:String,require:false},
    activeToken:{type:String,require:false},
    isEmailVerified:{type:String,require:false},
    // Reference to the Plan schema
   plans: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Plan" }
    ]
})

module.exports=mongoose.model('Users',userSchema)