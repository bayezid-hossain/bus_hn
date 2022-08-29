const ErrorHandler = require('../utils/errorhandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const User = require('../models/busOwnerModel');
const sendToken = require('../utils/jwtToken');
const formidable = require('formidable');
const { isFileValid, deleteFile } = require('../utils/fileOperations');
const { uploadFile } = require('../utils/awsS3');
const { generateOtp, sendOtp } = require('../utils/sendSms');
const path = require('path');
const Driver = require('../models/driverModel');
const BusRoute = require('../models/busRouteModel');
const { v4: uuid } = require('uuid');
const amqp = require('amqplib');
const axios = require('axios');
const logger = require('../logger/index');
let channel;
//rabbitmq queue creation
// async function connect() {
//   const amqpServer = process.env.RABBITMQ_URL;
//   const connection = await amqp.connect(amqpServer);
//   channel = await connection.createChannel();
//   await channel.assertQueue('ADDEDDRIVER');
// }
// connect();

//Register a busOwner

exports.registerBusOwner = catchAsyncErrors(async (req, res, next) => {
  const { name, phone, pin, email } = req.body;

  const user = await User.create({
    name,
    phone,
    email,
    pin,
    role: 'busOwner',
  });

  logger.warning(` ${user.name} : ${user.phone} (${user._id}) registered!`);
  res.redirect(307, '/api/v1/busowner/login');
  // sendToken(user, 201, res);
});
