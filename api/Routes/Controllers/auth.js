const validator=require('validator');
const bcrypt=require('bcryptjs')
const jwt = require('jsonwebtoken');
const mongoose=require('mongoose');
const userScheme=require('../../../models/user')

exports.register= async(req,res,next)=>{
    try { 
        const {name,email,password}=req.body;
        const passwordRegex=/^(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if(!name || !email || !password || !validator.isEmail(email) || !passwordRegex.test(password)) return res.status(400).json({status:false,message:"Invalid Credentials"});
        const user=await userScheme.findOne({email});
        if(user) return res.status(400).json({status:false,message:"Email Already Exists"});
        const salt=await bcrypt.genSalt(10);
        const hashedPassword=await bcrypt.hash(password,salt);
        const newUser=new userScheme({_id:new mongoose.Types.ObjectId,name,password:hashedPassword,email:email})
        newUser.save();
        res.status(201).json({status:true,message:"User Successfully Registered"});
    } catch (error) {
        return res.status(401).json({status:false,message:"Failed to Register"})
    }
}

exports.login=async(req,res,next)=>{
    try {
        const {email,password}=req.body;
        if(!email || !password || !validator.isEmail(email)) return res.status(400).json({status:true,message:"Invalid Credientials"});
        const user=await userScheme.findOne({email});
        if(!user || !(await bcrypt.compare(password,user.password))){
            return res.status(401).json({status:false,message:'Invalid email or password'});
        }
        const token = jwt.sign({userId:user._id,email:user.email,name:user.name},process.env.JWT_SECRET_KEY, { expiresIn: '1h' })
        user.activeToken=token;
        await user.save();
        res.status(200).json({status:true,message:'Successfully Logged In',token})
    } catch (error) {
        return res.status(401).json({status:false,message:"Failed to Login"})
    }
}