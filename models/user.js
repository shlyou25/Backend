const mongoose = require('mongoose');

const userSchema=mongoose.Schema({
    _id:mongoose.Types.ObjectId,
    name:{type:String,require:true},
    email:{type:String,require:true},
    password:{type:String,require:true},
    activeToken:{type:String,require:false}

})

module.exports=mongoose.model('Users',userSchema)