const express = require('express');
const router = express.Router();
const userSchema = require('../../../models/user')
const checkAuth = require('../../middlewares/authenticate')


exports.getallUsers=async(req,res) => {
    try {
        const user = await userSchema.find({}, 'name email').exec();
        if (user) {
            res.status(200).json({
                status: true,
                users: user,
                message: 'Users Information Fetched Successfull'
            })
        }
        else {
            res.status(404).json({
                status: false,
                message: 'No User Found'
            })
        }
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error in getting User Info'
        })
    }
}

// exports.authenticate = async (req, res) => {

exports.getuserbyid=async(req,res) => {
   try {
    const user = req.user; // Populated by authenticate middleware

    if (user) {
      res.status(200).json({
        status: true,
        user: {
          name: user.name,
          email: user.email
        },
        message: 'User Information Fetched Successfully'
      });
    } else {
      res.status(404).json({
        status: false,
        message: 'No Information Found'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error in getting User Info'
    });
  }
}
