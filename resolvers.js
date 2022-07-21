const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const UserInfo = require("./modal/authSchema");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const otpVerify = require("./modal/otpVerification");
const httpRequest = require("https");
const Profile = require("./modal/Profile");
const vCardsJS = require("vcards-js");
const { Template } = require("@walletpass/pass-js");
const path = require("path");
const Jimp = require("jimp");
const fs = require("fs");
const fspromises = require("fs/promises");
var ExtendedASCII = require('bfs-buffer/js/extended_ascii').default;
const cloudinary = require('./cloudinary');

dotenv.config();

const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
};

const resolvers = {
  Query: {
    getUsers: async () => {
      UserInfo.sync({
        force: false,
      });
      return await UserInfo.findAll();
    },
    getUserbyId: async (_parent, { id }, _context, _info) => {
      return await UserInfo.findOne({ where: { id } });
    },
    getOtp: async () => {
      otpVerify.sync({
        force: false,
      });
      return await otpVerify.findAll();
    },
    getAllProfile: async () => {
      await Profile.sync({
        force: false,
      });
      return await Profile.findAll();
    },
    getProfilebyId: async (_parent, { id }, _context, _info) => {
      await Profile.sync({
        force: false,
      });
      return await Profile.findOne({ where: { user_id: id } });
    },
    generatevcffile: async (parent, { id }, context, info) => {
      await Profile.sync({
        force: false,
      });
      const profile = await Profile.findOne({ where: { user_id: id } });
      const {
        firstName,
        lastName,
        workEmail,
        workPhone,
        organization,
        title,
        birthday,
        url,
        note,
        photo,
      } = profile.userDetails[0];

      var vCard = vCardsJS();
      vCard.firstName = firstName;
      vCard.lastName = lastName || '';
      vCard.workEmail = workEmail || '';
      vCard.workPhone = workPhone || '';
      vCard.organization = organization || '';
      vCard.title = title || '';
      vCard.birthday = new Date(birthday);
      vCard.url = url || '';
      vCard.note = note || '';
      if(photo.includes('data:image/png;base64')){

        vCard.photo.embedFromString(
          photo.split("data:image/png;base64,").pop(),
          "image/png"
          );
        }
      const data = {
        file: vCard.getFormattedString(),
        firstName,
      };
      return data;
    },
    generatepkpass: async (parent, { id }, context, info) => {
      await Profile.sync({
        force: false,
      });
      const profile = await Profile.findOne({ where: { user_id: id } });
      const {
        firstName,
        lastName,
        workEmail,
        workPhone,
        organization,
        title,
        birthday,
        url,
        note,
        photo,
      } = profile.userDetails[0];
      const template = await Template.load("./PassFolder", "123456", {
        allowHttp: true,
      });

      await template.loadCertificate(
        './PassFolder/com.example.passbook.pem',
        '123456'
      )

      const pass = template.createPass({
        serialNumber: id,
        description: "Vcync Personal Card",
        organizationName: firstName+' Vcync Card',
        barcodes: [{
          altText: "My Profile",
          message: process.env.FrontendURL+id,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
        }],
      });
      pass.primaryFields.add({ key: "name", label: "Name", value: firstName });
      pass.secondaryFields.add({
        key: "phone",
        label: "Phone Number",
        value: workPhone,
      });
      var base64Data = photo.replace(/^data:image\/png;base64,/, "");
      // console.log(base64Data)
      let d
      await fspromises.writeFile(
        __dirname+"/photo.png",
        base64Data,
        "base64").then(async()=>{
          await pass.images.add("icon", "./photo.png", "1x", "ru");
          await pass.images.add("icon", "./photo.png", "2x", "ru");
          await pass.images.add("thumbnail", "./photo.png", "2x", "ru");
          // console.log(pass);
          const buf = await pass.asBuffer();
          // console.log(buf)
          await fspromises.writeFile(__dirname+"/pathToPass.pkpass", buf).then( async(result) => {
              await cloudinary.v2.uploader.destroy(id)
              const file = await cloudinary.v2.uploader.upload(__dirname+'/pathToPass.pkpass',{
                folder:'pkpasses',
                public_id:id,
                resource_type:'raw'
              })
              const data = {
                file:file.secure_url,
                firstName,
              };
              // console.log(data)
              d = data;
            }).catch((err)=>console.log(err,'hoooooo'))
      }).catch((err)=>console.log(err,'hoooooo2'))
      // console.log(d)
      return d
    },
  },
  Mutation: {
    signUp: async (parent, args, context, info) => {
      UserInfo.sync({
        force: false,
      });

      const { name, email, phoneNumber, password } = args.user;

      try {
        const checkEmail = await UserInfo.findOne({ where: { email: email } });

        if (checkEmail) return new AuthenticationError("User already exits");

        const checkPhoneNumber = await UserInfo.findOne({
          where: { phoneNumber: phoneNumber },
        });

        if (checkPhoneNumber)
          return new AuthenticationError("User already exits");

        const userData = await UserInfo.create({
          name,
          email,
          phoneNumber,
          password,
          verified: false,
        });

        await sendOtp(userData);

        if (userData) return userData;
      } catch (error) {
        return new AuthenticationError(error);
      }
    },
    deleteUser: async (parent, args, context, info) => {
      const { id } = args;
      await UserInfo.destroy({
        where: { id },
      });
      return "User Deleted Sucessful";
    },
    updateUser: async (parent, args, context, info) => {
      const { id } = args;
      const { name, email } = args.user;
      const updates = {};
      if (name !== undefined) {
        updates.name = name;
      }
      if (email !== undefined) {
        updates.email = email;
      }
      const findUser = await UserInfo.findOne({ where: { id } });
      const user = findUser.update(updates);
      return user;
    },
    login: async (parent, args, context, info) => {
      UserInfo.sync({
        force: false,
      });

      const { phoneNumber, password } = args.user;

      try {
        const userData = await UserInfo.findOne({
          where: { phoneNumber: phoneNumber },
        });

        if (!userData) {
          return new AuthenticationError("Invalid Credentials");
        }

        if (userData) {
          const passMatch = await bcrypt.compare(password, userData.password);

          if (!passMatch) {
            return new AuthenticationError("Invalid credentials");
          } else {
            await sendOtp(userData);
            return userData;
          }
        } else {
          return new AuthenticationError("Invalid credentials");
        }
      } catch (error) {
        console.log(error);
      }
    },
    loginOtp: async (parent, args, context, info) => {
      otpVerify.sync({
        force: false,
      });

      try {
        const { user_id, otp } = args.otp;

        const findOtp = await otpVerify.findAll({
          where: { user_id: user_id },
        });
        const lastOtp = [findOtp[findOtp.length - 1]];

        if (findOtp.length <= 0) {
          return new UserInputError(
            "Account has been verified already.Please sign in"
          );
        } else {
          const { expiresAt } = lastOtp[0];
          const hashedOtp = lastOtp[0].otp;
          // console.log(hashedOtp,expiresAt);
          if (expiresAt < Date.now()) {
            await otpVerify.destroy({ where: { user_id: user_id } });
            return new UserInputError("Code has expired.Please try again");
          } else {
            const validOtp = await bcrypt.compare(otp, hashedOtp);

            if (!validOtp) {
              return new UserInputError("Invalid OTP");
            } else {
              const findUser = await UserInfo.findOne({
                where: { id: user_id },
              });
              console.log(findUser);

              await otpVerify.destroy({ where: { user_id: user_id } });
              return findUser;
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    },
    verifyOtp: async (parent, args, context, info) => {
      otpVerify.sync({
        force: false,
      });

      try {
        const { user_id, otp } = args.otp;

        const findOtp = await otpVerify.findAll({
          where: { user_id: user_id },
        });
        const lastOtp = [findOtp[findOtp.length - 1]];

        if (findOtp.length <= 0) {
          return new AuthenticationError(
            "Account has been verified already.Please sign in"
          );
        } else {
          const { expiresAt } = lastOtp[0];
          const hashedOtp = lastOtp[0].otp;
          // console.log(hashedOtp,expiresAt);
          if (expiresAt < Date.now()) {
            await otpVerify.destroy({ where: { user_id: user_id } });
            return new AuthenticationError("Code has expired.Please try again");
          } else {
            const validOtp = await bcrypt.compare(otp, hashedOtp);

            if (!validOtp) {
              return new AuthenticationError("Invalid OTP");
            } else {
              const findUser = await UserInfo.findOne({
                where: { id: user_id },
              });
              await findUser.update({ verified: true }),
                {
                  where: {
                    verified: false,
                  },
                };
              await otpVerify.destroy({ where: { user_id: user_id } });
              return findUser;
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    },
    resendOtp: async (parent, args, context, info) => {
      otpVerify.sync({
        force: false,
      });

      try {
        const { id, phoneNumber } = args.user;

        await otpVerify.destroy({ where: { user_id: id } });

        const userData = { id, phoneNumber };
        // console.log(userData)

        await sendOtp(userData);

        return "Otp send sucessfull";
      } catch (error) {
        return new AuthenticationError(error);
      }
    },
    forgotPass: async (parent, args, context, info) => {
      UserInfo.sync({
        force: false,
      });
      const { phoneNumber } = args.user;
      try {
        const findUser = await UserInfo.findOne({
          where: { phoneNumber: phoneNumber },
        });

        if (!findUser) {
          return new AuthenticationError("Invalid credentials");
        } else {
          await sendOtp(findUser);
          return findUser;
        }
      } catch (error) {
        return new AuthenticationError("User does not exists");
      }
    },
    forgotOtp: async (parent, args, context, info) => {
      otpVerify.sync({
        force: false,
      });

      try {
        const { user_id, otp } = args.otp;

        const findOtp = await otpVerify.findAll({
          where: { user_id: user_id },
        });
        const lastOtp = [findOtp[findOtp.length - 1]];
        // return lastOtp
        if (findOtp.length <= 0) {
          return new UserInputError(
            "Account has been verified already.Please sign in"
          );
        } else {
          const { expiresAt } = lastOtp[0];

          const hashedOtp = lastOtp[0].otp;

          // console.log("hashedOTP===><br/>",expiresAt,hashedOtp);

          if (expiresAt < Date.now()) {
            await otpVerify.destroy({ where: { user_id: lastOtp[0].user_id } });
            return new UserInputError("Code has expired.Please try again");
          } else {
            const validOtp = await bcrypt.compare(otp, hashedOtp);

            if (!validOtp) {
              return new UserInputError("Invalid OTP");
            } else {
              // const findUser = await UserInfo.findOne({ where: { id: user_id } })
              // console.log(findUser)

              await otpVerify.destroy({ where: { user_id: user_id } });
              return ["Verified"];
            }
          }
        }
      } catch (error) {
        return new UserInputError("Invalid OTP");
      }
    },
    updatePass: async (parent, args, context, info) => {
      UserInfo.sync({
        force: false,
      });
      const { user_id, password } = args.user;

      if (!password) return new AuthenticationError("Please enter pasword");

      const hashedPass = await bcrypt.hash(password, 12);
      // console.log("hashedPass==>",hashedPass)

      const findUser = await UserInfo.findOne({ where: { id: user_id } });
      // return findUser
      const updateUser = await findUser.update(
        { password: hashedPass },
        {
          where: {
            password: findUser.password,
          },
        }
      );
      return updateUser;
    },
    Profile: async (parent, args, context, info) => {
      await Profile.sync({
        force: false,
      });

      const {
        user_id,
        qrCode,
        extraInfo,
        socialData,
        userDetails,
        profiletype,
      } = args.profile;
      // return args.profile

      try {
        const profilealready = await Profile.findOne({
          where: { user_id: user_id },
        });

        if (profilealready) {
          await profilealready.destroy({
            where: { user_id },
          });
          // return new AuthenticationError("Profile esixts")
        }

        const profile = await Profile.create({
          user_id,
          qrCode,
          extraInfo,
          socialData,
          userDetails,
          profiletype,
          enable: true,
        });

        if (profile) return profile;
      } catch (error) {
        return new AuthenticationError(error);
      }
    },
    enableProfile: async (parent, args, context, info) => {
      await Profile.sync({
        force: false,
      });

      const { id } = args;

      try {
        const profile = await Profile.findOne({
          where: { user_id: id },
        });

        if (profile) {
          await profile.update(
            { enable: true },
            {
              where: {
                enable: false,
              },
            }
          );

          return profile;
        }
      } catch (error) {
        return new AuthenticationError(error);
      }
    },
    disableProfile: async (parent, args, context, info) => {
      await Profile.sync({
        force: false,
      });

      const { id } = args;

      try {
        const profile = await Profile.findOne({
          where: { user_id: id },
        });

        if (profile) {
          await profile.update(
            { enable: false },
            {
              where: {
                enable: true,
              },
            }
          );

          return profile;
        }
      } catch (error) {
        return new AuthenticationError(error);
      }
    },
  },
};

const sendOtp = async (userData) => {
  otpVerify.sync({
    force: false,
  });
  const { id, phoneNumber } = userData;

  try {
    // const otp = `${Math.floor(1000 + Math.random() * 9000)}`
    const otp = `0000`;

    const data = `{
            "userName": "ucync",
            "numbers": "${phoneNumber}",
            "userSender": "${process.env.USERSENDER}",
            "apiKey": "${process.env.API_KEY}",
            "msg": "Your OTP code is = ${otp}"
        }`;

    const hashedotp = await bcrypt.hash(otp, 10);
    // console.log("OTP==>", otp);

    const newOtp = await otpVerify.create({
      user_id: id,
      otp: hashedotp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    // const request = httpRequest.request('https://www.msegat.com/gw/sendsms.php', options, response => {
    //     console.log('Status', response.statusCode);
    //     console.log('Headers', response.headers);
    //     let responseData = '';

    //     response.on('data', dataChunk => {
    //         responseData += dataChunk;
    //     });
    //     response.on('end', () => {
    //         console.log('Response: ', responseData)
    //     });
    // });

    // request.on('error', error => console.log('ERROR', error));

    // request.write(data);
    // request.end();

    // console.log("User===>", newOtp);
  } catch (error) {
    console.log(error);
  }
};

module.exports = resolvers;
