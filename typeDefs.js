const { gql } = require("apollo-server-express")

const typeDefs = gql`

    type User{
        id: ID
        name: String
        email: String
        phoneNumber: String
        password: String
        verified: Boolean
    }

    type Otp{
        user_id: String
        otp: String
        createdAt: String
        expiresAt: String
    }

    type ExtraInfo{
        extraInfo : String
    }
    type SocialData{
        platform: String
        username: String
    }

    type UserDetails{
        user_id:String
        firstName:String
        lastName:String
        workEmail:String
        workPhone:String
        organization:String
        title:String
        birthday:String
        url:String
        note:String
        photo:String
    }
    type Profile{
        user_id: String
        qrCode: String
        extraInfo: [ExtraInfo]
        socialData: [SocialData]
        userDetails: [UserDetails]
        enable: Boolean
        profiletype:String
    }

    type vcffile{
        firstName:String
        file:String
    }
    
    type Query{
        getUsers: [User]
        getUserbyId(id : ID): User
        getOtp:[Otp]
        getAllProfile: [Profile]
        getProfilebyId(id: ID): Profile
        generatevcffile(id:ID) : vcffile
    }

    input UserInput{
        name: String
        email: String
        phoneNumber: String
        password: String
    }

    input otpInput{
        user_id: String
        otp: String
    }

    input resendOtp{
        id: String
        phoneNumber: String
    }

    input forgotPass{
        phoneNumber: String
    }

    input updatePass{
        user_id:String
        password:String
    }
    input ExtraInput{
        extraInfo: String
    }
    input SocialInput{
        platform: String
        username: String
    }
    input userdetailsInput{
        user_id:String
        firstName:String
        lastName:String
        workEmail:String
        workPhone:String
        organization:String
        title:String
        birthday:String
        url:String
        note:String
        photo:String
    }
    input profileInput{
        user_id: String
        qrCode: String
        extraInfo: [ExtraInput]
        socialData: [SocialInput]
        userDetails: [userdetailsInput]
        enable: Boolean
        profiletype: String
    }


    type Mutation{
        signUp(user:UserInput) : User
        deleteUser(id : ID) : String
        updateUser(id:ID,user:UserInput) : User
        login(user:UserInput) : User
        verifyOtp(otp:otpInput) : User
        loginOtp(otp:otpInput) : User
        resendOtp(user:resendOtp) : String
        forgotPass(user:forgotPass): User
        forgotOtp(otp:otpInput) : [Otp]
        updatePass(user:updatePass) : User

        Profile(profile: profileInput) : Profile
        enableProfile(id : ID) : Profile
        disableProfile(id : ID) : Profile
    }
`

module.exports = typeDefs