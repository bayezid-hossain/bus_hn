const ErrorHandler = require('../utils/errorhandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const formidable = require('formidable');
const { isFileValid, deleteFile } = require('../utils/fileOperations');
const { uploadFile } = require('../utils/awsS3');
const path = require('path');
const { v4: uuid } = require('uuid');
const BusRoute = require('../models/busRouteModel');
const BusModel = require('../models/busModel');
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

//Register a bus

exports.registerBus = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  var form = new formidable.IncomingForm();
  form.multiples = true;
  form.maxFileSize = 5 * 1024 * 1024; // 5MB
  form
    .parse(req, async (err, fields, files) => {
      if (err) {
        profiler.done({
          message: err,
          level: 'error',
          actionBy: fields.owner,
        });

        return res.status(400).json({
          status: 'Fail',
          message: 'There was an error parsing the files',
          error: err,
        });
      }
      const {
        busName,
        busLicenseNumber,
        engineNumber,
        seatLayout,
        routeId,
        seatNumber,
        ac,
        owner,
        ownerName,
      } = fields;
      const { routePermit, busLicenseDoc } = files;

      try {
        isRouteValid = await checkValidRoute(routeId, owner);
        if (!isRouteValid) {
          profiler.done({
            message: 'Invalid route id' + routeId + ' given ',
            level: 'error',
            actionBy: owner,
          });
          return next(new ErrorHandler('Invalid route id ' + routeId));
        }
        isBusAdded = await busAlreadyExists(engineNumber, busLicenseNumber);
        if (isBusAdded) {
          profiler.done({
            message:
              'Bus with engine number ' +
              engineNumber +
              ' and license number ' +
              busLicenseNumber +
              ' already Added ',
            level: 'error',
            actionBy: owner,
          });
          return next(
            new ErrorHandler('Bus with this information already added')
          );
        }
        const validBusPayload = {
          busNo: busLicenseNumber,
          engNo: engineNumber,
          ownerName: ownerName,
        };

        const busValidity = await axios
          .post(
            'http://44.202.73.200:8006/api/v1/crosscheck/bus',
            validBusPayload
          )
          .catch(function (error) {
            profiler.done({
              message: error,
              level: 'error',
              actionBy: owner,
            });
            return next(new ErrorHandler('Validation Service not Responding'));
          });
        if (busValidity.data.result == true) {
          const bus = await BusModel.create({
            busName: busName,
            busLicenseDoc: 'tempUrl',
            busLicenseNumber: busLicenseNumber,
            engineNumber: engineNumber,
            ac: ac ? ac : false,
            seatNumber: seatNumber,
            seatLayout: seatLayout,
            routeId: routeId,
            owner: owner,
            routePermit: 'tempUrl',
          });
          if (bus) {
            const resultOfRoutePermitUpload = await uploadFile(routePermit);

            const resultOfBusLicenseDocUpload = await uploadFile(busLicenseDoc);
            bus.routePermit = resultOfRoutePermitUpload.Key;
            bus.busLicenseDoc = resultOfBusLicenseDocUpload.Key;

            await bus.save({ validateBeforeSave: false });
            res.status(200).json({
              success: true,
              message: 'Bus Account created successfully',
              bus,
            });
            profiler.done({
              message: `Created Bus ${bus.id} by Authority ${owner}`,
            });
          }
        } else {
          profiler.done({
            message: busValidity.data.message,
            level: 'error',
            actionBy: owner,
          });
          res
            .status(400)
            .json({ success: false, message: busValidity.data.message });
        }
      } catch (error) {
        profiler.done({
          message: error,
          level: 'error',
          actionBy: owner,
        });
        return next(new ErrorHandler(error));
      } finally {
        try {
          deleteFile(routePermit.filepath);
          deleteFile(busLicenseDoc.filepath);
        } catch (error) {}
      }
    })
    .on('fileBegin', function (name, file) {
      file.newFilename = uuid();
      file.filepath =
        path.join(__dirname, '../') +
        Date.now() +
        file.newFilename +
        '.' +
        file.mimetype.split('/').pop();
    })
    .on('file', function (name, file) {});
});

//check valid route
const checkValidRoute = async (routeId, authorityId) => {
  let route;
  try {
    route = await BusRoute.findById(routeId).select('authorityId');
  } catch (error) {
    return false;
  }

  if (route && route.authorityId == authorityId) return true;
  else return false;
};
const busAlreadyExists = async (engineNumber, busLicenseNumber) => {
  let bus;
  try {
    bus = await BusModel.findOne({
      engineNumber: engineNumber,
      busLicenseNumber: busLicenseNumber,
    });
  } catch (error) {
    return false;
  }

  if (bus) return true;
  else return false;
};
