const { Sequelize } = require("sequelize-cockroachdb")

const sequelize = require("../db/connection")


const Profile = sequelize.define("Profile", {
    user_id: {
        type: Sequelize.TEXT,
    },
    qrCode: {
        type: Sequelize.TEXT
    },
    extraInfo:{
        type:Sequelize.ARRAY(Sequelize.STRING),
        get() {
            const storedValue = this.getDataValue('extraInfo').map((v,i)=>{
             return JSON.parse(v)

            })
            return storedValue
        }, 
        set(val) {
            // console.log(val)
            return this.setDataValue('extraInfo', val);
        }
    },
    socialData: {
        type:  Sequelize.ARRAY(Sequelize.TEXT),
        get() {
            const storedValue = this.getDataValue('socialData').map((v,i)=>{
             return JSON.parse(v)

            })
            return storedValue
        }, 
        set(val) {
            // console.log(val)
            return this.setDataValue('socialData', val);
        }
    },
    userDetails:{
        type:  Sequelize.ARRAY(Sequelize.TEXT),
        get() {
            const storedValue = this.getDataValue('userDetails').map((v,i)=>{
             return JSON.parse(v)

            })
            return storedValue
        }, 
        set(val) {
            // console.log(val)
            return this.setDataValue('userDetails', val);
        }
    },
    enable:{
        type:Sequelize.BOOLEAN
    },
    profiletype:{
        type: Sequelize.TEXT
    }

})

module.exports = Profile