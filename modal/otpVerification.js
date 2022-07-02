const Sequelize = require("sequelize-cockroachdb")

const sequelize = require("../db/connection")


const otpVerify = sequelize.define("otpVerify", {
    user_id: {
        type: Sequelize.TEXT,
    },
    otp: {
        type: Sequelize.TEXT,
    },
    createdAt: {
        type: Sequelize.DATE
    },
    expiresAt: {
        type: Sequelize.DATE
    },

})

module.exports = otpVerify
