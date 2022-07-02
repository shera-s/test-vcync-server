const Sequelize = require("sequelize-cockroachdb")
const bcrypt = require("bcryptjs")
// const jwt = require('jsonwebtoken')

const sequelize = require("../db/connection")

const UserInfo = sequelize.define("userss",{
    id:{
        type:Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey:true
    },
    name:{
        type:Sequelize.TEXT
    },
    email:{
        type:Sequelize.TEXT
    },
    phoneNumber:{
        type:Sequelize.INTEGER
    },
    password:{
        type:Sequelize.TEXT
    },
    verified:{
        type:Sequelize.BOOLEAN
    }


})

UserInfo.beforeCreate(async (newUser, options) => {
    const hashedPassword = await bcrypt.hash(newUser.password,12);
    newUser.password = hashedPassword;
});


module.exports = UserInfo
