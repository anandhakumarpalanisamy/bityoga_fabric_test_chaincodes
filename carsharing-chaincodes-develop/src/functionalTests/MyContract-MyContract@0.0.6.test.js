/*
* Use this file for functional testing of your smart contract.
* Fill out the arguments and return values for a function and
* use the CodeLens links above the transaction blocks to
* invoke/submit transactions.
* All transactions defined in your smart contract are used here
* to generate tests, including those functions that would
* normally only be used on instantiate and upgrade operations.
* This basic test file can also be used as the basis for building
* further functional tests to run as part of a continuous
* integration pipeline, or for debugging locally deployed smart
* contracts by invoking/submitting individual transactions.
*/
/*
* Generating this test file will also trigger an npm install
* in the smart contract project directory. This installs any
* package dependencies, including fabric-network, which are
* required for this test file to be run locally.
*/

'use strict';

const assert = require('assert');
const fabricNetwork = require('fabric-network');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const URL = require('url');
const os = require('os');
const path = require('path');


describe('MyContract-MyContract@0.0.6', () => {

    const homedir = os.homedir();
    const walletPath = path.resolve('network', 'local_fabric_wallet');
    //const walletPath = path.join(homedir, '.fabric-vscode', 'local_fabric_wallet');
    const gateway = new fabricNetwork.Gateway();
    const wallet = new fabricNetwork.FileSystemWallet(walletPath);
    const identityName = 'admin';
    let connectionProfile;

    before(async () => {
        const connectionProfilePath = path.join(homedir, '.fabric-vscode', 'runtime', 'gateways', 'local_fabric.json');
        const connectionProfileContents = await fs.readFile(connectionProfilePath, 'utf8');
        if (connectionProfilePath.endsWith('.json')) {
            connectionProfile = JSON.parse(connectionProfileContents);
        } else if (connectionProfilePath.endsWith('.yaml') || connectionProfilePath.endsWith('.yml')) {
            connectionProfile = yaml.safeLoad(connectionProfileContents);
        }
    });

    beforeEach(async () => {

        const discoveryAsLocalhost = hasLocalhostURLs(connectionProfile);
        const discoveryEnabled = true;

        const options = {
            wallet: wallet,
            identity: identityName,
            discovery: {
                asLocalhost: discoveryAsLocalhost,
                enabled: discoveryEnabled
            }
        };

        await gateway.connect(connectionProfile, options);
    });

    afterEach(async () => {
        gateway.disconnect();
    });

    it('createUser', async () => {
        const args = ['userNew1'];
        const response = await submitTransaction('createUser', args);
        let jsonResponse = await JSON.parse(response.toString());

        assert.equal(jsonResponse.id, 'userNew1');
        assert.equal(jsonResponse.balance, 0);

        const argsDelete = ['userNew1'];
        await submitTransaction('deleteAsset', argsDelete);
    }).timeout(10000);

    it('createCar', async () => {
        const argsDelete1 = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete1);

        const args = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        const response = await submitTransaction('createCar', args); // Returns buffer of transaction return value
        let jsonResponse = await JSON.parse(response.toString());

        assert.equal(jsonResponse.carLicensePlate, '1234ABC');
        assert.equal(jsonResponse.brand, 'Brand1');
        assert.equal(jsonResponse.model, 'Model1');
        assert.equal(jsonResponse.colour, 'Colour1');
        assert.equal(jsonResponse.seats, 10);
        assert.equal(jsonResponse.yearOfEnrollment, 2018);

        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);
    }).timeout(10000);

    it('createCar - Negative: Create a car with number as string', async () => {
        let response;

        try {
            const args = ['1234ABC', 'Brand1', 'Model1', 'Colour1', 'dos', '2018'];
            response = await submitTransaction('createCar', args); // Returns buffer of transaction return value
            let jsonResponse = await JSON.parse(response.toString());
        }
        catch (err) {
            let error = err.message;
        }

        assert.equal(response, undefined);

    }).timeout(10000);

    it('readCar', async () => {
        const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        await submitTransaction('createCar', argsCreate);

        const args = ['1234ABC'];
        const response = await submitTransaction('readAsset', args); // Returns buffer of transaction return value
        let jsonResponse = JSON.parse(response.toString());

        assert.equal(jsonResponse.brand, 'Brand1');
        assert.equal(jsonResponse.model, 'Model1');
        assert.equal(jsonResponse.colour, 'Colour1');
        assert.equal(jsonResponse.seats, 10);
        assert.equal(jsonResponse.yearOfEnrollment, 2018);

        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);
    }).timeout(19000);

    it('carExists', async () => {
        const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        await submitTransaction('createCar', argsCreate);

        const args = ['1234ABC'];
        const response = await submitTransaction('assetExists', args); // Returns buffer of transaction return value
        assert.equal(response.toString(), 'true');

        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);
    }).timeout(15000);

    it('updateCar', async () => {
        const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        await submitTransaction('createCar', argsCreate);

        const args = ['1234ABC', 'Brand2', 'Model2', 'Colour2', '50', '2018'];
        const response = await submitTransaction('updateCar', args); // Returns buffer of transaction return value
        let jsonResponse = JSON.parse(response.toString());

        assert.equal(jsonResponse.carLicensePlate, '1234ABC');
        assert.equal(jsonResponse.brand, 'Brand2');
        assert.equal(jsonResponse.model, 'Model2');
        assert.equal(jsonResponse.colour, 'Colour2');
        assert.equal(jsonResponse.seats, 50);
        assert.equal(jsonResponse.yearOfEnrollment, 2018);

        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);
    }).timeout(20000);

    it('updateCar - Negative: Update a car with number as string', async () => {
        let response;

        try {
            const args = ['1234ABC', 'Brand1', 'Model1', 'Colour1', 'dos', '2018'];
            response = await submitTransaction('updateCar', args);
            let jsonResponse = await JSON.parse(response.toString());
        }
        catch (err) {
            let error = err.message;
        }

        assert.equal(response, undefined);

    }).timeout(20000);

    it('listAllCars', async () => {
        let argsDelete1 = ['5678ABC'];
        await submitTransaction('deleteAsset', argsDelete1);

        const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        await submitTransaction('createCar', argsCreate);

        const argsCreate2 = ['5678ABC', 'Brand2', 'Model2', 'Colour2', '10', '2018'];
        await submitTransaction('createCar', argsCreate2);

        const response = await submitTransaction('listCars', []);
        let jsonResponse = JSON.parse(response.toString());

        assert.equal(jsonResponse.length, 2);


        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);

        const argsDelete2 = ['5678ABC'];
        await submitTransaction('deleteAsset', argsDelete2);
    }).timeout(20000);

    it('createOffer', async () => {
        const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        await submitTransaction('createCar', argsCreate);

        const args = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
        const response = await submitTransaction('createOffer', args);
        let jsonResponse = await JSON.parse(response.toString());

        assert.equal(jsonResponse.car.carLicensePlate, '1234ABC');
        assert.equal(jsonResponse.car.brand, 'Brand1');
        assert.equal(jsonResponse.car.model, 'Model1');
        assert.equal(jsonResponse.car.colour, 'Colour1');
        assert.equal(jsonResponse.car.seats, 10);
        assert.equal(jsonResponse.car.yearOfEnrollment, 2018);
        assert.equal(jsonResponse.priceForKm, 10);
        assert.equal(jsonResponse.priceForTime, 12);
        assert.equal(jsonResponse.startDate, '1701385200000');
        assert.equal(jsonResponse.endDate, '1703890800000');
        assert.equal(jsonResponse.deposit, 100);
        assert.equal(jsonResponse.startPlace, '45.2554;75.5875');
        assert.equal(jsonResponse.endPlaces, '[]');
        assert.equal(jsonResponse.notDeleted, true);


        // TODO: Delete offer

        let argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);
    }).timeout(30000);

    it('createOffer - Negative: Create a offer with not created car', async () => {
        let response;

        try {
            const args = ['0000AAA', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
            const response = await submitTransaction('createOffer', args);
            let jsonResponse = await JSON.parse(response.toString());
        }
        catch (err) {
            let error = err.message;
        }

        assert.equal(response, undefined);
    }).timeout(10000);

    it('createOffer - Negative: Create a offer with number as string', async () => {
        let response;

        try {
            const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
            await submitTransaction('createCar', argsCreate);

            const args = ['1234ABC', 'diez', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
            const response = await submitTransaction('createOffer', args);
            let jsonResponse = await JSON.parse(response.toString());
        }
        catch (err) {
            let error = err.message;
        }

        assert.equal(response, undefined);

        let argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);
    }).timeout(10000);

    it('offerExists', async () => {
        const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        await submitTransaction('createCar', argsCreate);

        const args = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
        const response = await submitTransaction('createOffer', args);
        let jsonResponse = await JSON.parse(response.toString());

        const argsExists = [jsonResponse.id];
        const responseExists = await submitTransaction('assetExists', argsExists);
        assert.equal(responseExists.toString(), 'true');

        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);
    }).timeout(25000);

    it('updateOffer', async () => {
        let argsCar = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        await submitTransaction('createCar', argsCar);

        let args = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
        let response = await submitTransaction('createOffer', args);
        let jsonResponse = await JSON.parse(response.toString());

        args = [jsonResponse.id, '1234ABC', '8', '10', '1701385200000', '1703890800000', '100', '-35.224555;120.545454', '[]', 'true'];
        response = await submitTransaction('updateOffer', args);
        jsonResponse = JSON.parse(response.toString());

        assert.equal(jsonResponse.car.carLicensePlate, '1234ABC');
        assert.equal(jsonResponse.car.brand, 'Brand1');
        assert.equal(jsonResponse.car.model, 'Model1');
        assert.equal(jsonResponse.car.colour, 'Colour1');
        assert.equal(jsonResponse.car.seats, 10);
        assert.equal(jsonResponse.car.yearOfEnrollment, 2018);
        assert.equal(jsonResponse.priceForKm, 8);
        assert.equal(jsonResponse.priceForTime, 10);
        assert.equal(jsonResponse.startDate, 1701385200000);
        assert.equal(jsonResponse.endDate, 1703890800000);
        assert.equal(jsonResponse.deposit, 100);
        assert.equal(jsonResponse.startPlace, '-35.224555;120.545454');
        assert.equal(jsonResponse.endPlaces, '[]');
        assert.equal(jsonResponse.deleted, true);

        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);
    }).timeout(20000);

    it('updateOffer - Negative: Update a offer without car', async () => {
        let response;

        try {
            const args = ['10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
            let response = await submitTransaction('createOffer', args);
            let jsonResponse = await JSON.parse(response.toString());
        }
        catch (err) {
            let error = err.message;
        }

        assert.equal(response, undefined);
    }).timeout(10000);

    it('listAllOffers', async () => {
        let response = await submitTransaction('listOffers', []);
        let jsonResponse = JSON.parse(response.toString());
        let numOffers = jsonResponse.length;

        let argsCreateCar = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '5', '2018'];
        await submitTransaction('createCar', argsCreateCar);

        argsCreateCar = ['5678ABC', 'Brand2', 'Model2', 'Colour2', '10', '2018'];
        await submitTransaction('createCar', argsCreateCar);

        let argsCreateOffer = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
        await submitTransaction('createOffer', argsCreateOffer);

        argsCreateOffer = ['5678ABC', '8', '14', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
        await submitTransaction('createOffer', argsCreateOffer);

        response = await submitTransaction('listOffers', []);
        jsonResponse = JSON.parse(response.toString());

        assert.equal(numOffers + 2, jsonResponse.length);


        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);

        const argsDelete2 = ['5678ABC'];
        await submitTransaction('deleteAsset', argsDelete2);
    }).timeout(25000);

    it('listAllOffersFilteringBySeats', async () => {
        const argsDelete11 = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete11);

        const argsDelete22 = ['5678ABC'];
        await submitTransaction('deleteAsset', argsDelete22);

        let response = await submitTransaction('listOffers', ["6"]);
        let jsonResponse = JSON.parse(response.toString());
        let numOffers = jsonResponse.length;

        let argsCreateCar = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '5', '2018'];
        await submitTransaction('createCar', argsCreateCar);

        argsCreateCar = ['5678ABC', 'Brand2', 'Model2', 'Colour2', '10', '2018'];
        await submitTransaction('createCar', argsCreateCar);

        let argsCreateOffer = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
        await submitTransaction('createOffer', argsCreateOffer);

        argsCreateOffer = ['5678ABC', '8', '14', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
        await submitTransaction('createOffer', argsCreateOffer);

        response = await submitTransaction('listOffers', ["6"]);
        jsonResponse = JSON.parse(response.toString());

        assert.equal(numOffers + 1, jsonResponse.length);


        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);

        const argsDelete2 = ['5678ABC'];
        await submitTransaction('deleteAsset', argsDelete2);
    }).timeout(30000);

    it('listAllOffersFilteringByProximity', async () => {
        const argsDelete11 = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete11);

        const argsDelete22 = ['5678ABC'];
        await submitTransaction('deleteAsset', argsDelete22);

        let response = await submitTransaction('listOffers', ["", "44.56875;101", "100"]);
        let jsonResponse = JSON.parse(response.toString());
        let numOffers = jsonResponse.length;

        let argsCreateCar = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '5', '2018'];
        await submitTransaction('createCar', argsCreateCar);

        argsCreateCar = ['5678ABC', 'Brand2', 'Model2', 'Colour2', '10', '2018'];
        await submitTransaction('createCar', argsCreateCar);

        let argsCreateOffer = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45;100', '[]'];
        await submitTransaction('createOffer', argsCreateOffer);

        argsCreateOffer = ['5678ABC', '10', '12', '1701385200000', '1703890800000', '100', '50;20', '[]'];
        await submitTransaction('createOffer', argsCreateOffer);

        response = await submitTransaction('listOffers', ["", "44.56875;101", "100"]);
        jsonResponse = JSON.parse(response.toString());

        assert.equal(numOffers + 1, jsonResponse.length);

        const argsDelete = ['1234ABC'];
        await submitTransaction('deleteAsset', argsDelete);

        const argsDelete2 = ['5678ABC'];
        await submitTransaction('deleteAsset', argsDelete2);
    }).timeout(40000);


    // The tests have been commented until the user creation work properly:

    // it('createTravel', async () => {
    //     const argsDelete = ['1234ABC'];
    //     await submitTransaction('deleteCar', argsDelete);

    //     const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
    //     await submitTransaction('createCar', argsCreate);

    //     const args = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
    //     const response = await submitTransaction('createOffer', args);
    //     let jsonResponse = await JSON.parse(response.toString());
    //     let offerID = jsonResponse.id;

    //     // "1234ABC1559715709203", "1701385200001", "1703890700000", "4", "45.2555;75.5876", "true", ""
    //     // ["1234ABC1559681186266", "1701385200001", "1703890700000", "4", "45.2555;75.5876", "false", ""]

    //     const argsTravel = [offerID, '1701385200001', '1703890700000', '4', '45.2559;75.5879', 'true', '']
    //     const responseTravel = await submitTransaction('createTravel', argsTravel);
    //     let jsonResponseTravel = await JSON.parse(response.toString());
    // }).timeout(40000);

    // TODO: Create test add users to travel

    // it('updateTravel', async () => {
    //     const argsDelete = ['1234ABC'];
    //     await submitTransaction('deleteCar', argsDelete);

    //     const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
    //     await submitTransaction('createCar', argsCreate);

    //     const argsOffer = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
    //     const responseOffer = await submitTransaction('createOffer', argsOffer);
    //     let jsonResponseOffer = await JSON.parse(responseOffer.toString());

    //     let offerID = jsonResponseOffer.id;

    //     const argsTravel = [offerID, '1701385200001', '1703890700000', '4', '45.3424;75.8461', 'true', '']
    //     const responseTravel = await submitTransaction('createTravel', argsTravel);
    //     let jsonResponseTravel = await JSON.parse(responseTravel.toString());

    //     let travelID = jsonResponseTravel.id;

    //     const argsTravelUpdate = [travelID, '46.2555;77.5876', 'Observacion', '46.2324;77.5861', '1703890100000', '847']
    //     const responseTravelUpdate = await submitTransaction('updateTravel', argsTravelUpdate);
    //     let jsonResponseTravelUpdate = await JSON.parse(responseTravelUpdate.toString());


    //     const argsDeleteOffer = [offerID];
    //     await submitTransaction('deleteAsset', argsDeleteOffer);


    // }).timeout(40000);

    // it('updateTravelWithoutID', async () => {
    //     let response;

    //     try {
    //         const argsTravel = ['1701385200001', '1703890700000', '4', '46.2555;77.5876', 'true', '']
    //         const responseTravel = await submitTransaction('updateTravel', argsTravel);
    //         let jsonResponseTravel = await JSON.parse(response.toString());
    //     }
    //     catch (err) {
    //         let error = err.message;
    //     }

    //     assert.equal(response, undefined);

    // }).timeout(15000);


    // The test have been commented until the user creation work properly:
    // - addToWallet
    // - addToWallet - Negative: Add from client
    // - transferToWallet
    // - transferToWallet - Negative: Transfer from admin

    // it('addToWallet', async () => {
    //     // Disconnect Admin identity 
    //     await gateway.disconnect();

    //     let discoveryAsLocalhost = hasLocalhostURLs(connectionProfile);
    //     let discoveryEnabled = true;
    //     let optionsConnection = {
    //         wallet: wallet,
    //         identity: 'userAdmin',
    //         discovery: {
    //             asLocalhost: discoveryAsLocalhost,
    //             enabled: discoveryEnabled
    //         }
    //     };

    //     // Connect with userAdmin identity
    //     await gateway.connect(connectionProfile, optionsConnection);

    //     let args = ["x509::/OU=client/CN=client2::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com"]
    //     let response = await submitTransaction('readAsset', args);
    //     let asset = await JSON.parse(response.toString());

    //     args = ["x509::/OU=client/CN=client2::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "50"]
    //     response = await submitTransaction('addToWallet', args);
    //     let jsonResponse = await JSON.parse(response.toString());

    //     assert.equal(jsonResponse.balance, asset.balance + 50);
    // }).timeout(100000);

    // it('addToWallet - Negative: Add from client', async () => {
    //     try {
    //         let args = ["x509::/OU=client/CN=client2::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com"]
    //         let response = await submitTransaction('readAsset', args);
    //         let asset = await JSON.parse(response.toString());

    //         args = ["x509::/OU=client/CN=client2::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "50"]
    //         response = await submitTransaction('addToWallet', args);
    //         let jsonResponse = await JSON.parse(response.toString());

    //         assert.equal(jsonResponse.balance, asset.balance + 50);
    //     }
    //     catch (err) {
    //         assert(err);
    //     }
    // }).timeout(100000);

    // it('transferToWallet', async () => {
    //     // Disconnect Admin identity 
    //     await gateway.disconnect();

    //     let discoveryAsLocalhost = hasLocalhostURLs(connectionProfile);
    //     let discoveryEnabled = true;
    //     let optionsConnection = {
    //         wallet: wallet,
    //         identity: 'client2',
    //         discovery: {
    //             asLocalhost: discoveryAsLocalhost,
    //             enabled: discoveryEnabled
    //         }
    //     };

    //     // Connect with userAdmin identity
    //     await gateway.connect(connectionProfile, optionsConnection);

    //     let argsClient2 = ["x509::/OU=client/CN=client2::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com"]
    //     let response = await submitTransaction('readAsset', argsClient2);
    //     let client2 = await JSON.parse(response.toString());

    //     let argsClient3 = ["x509::/OU=client/CN=client3::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com"]
    //     response = await submitTransaction('readAsset', argsClient3);
    //     let client3 = await JSON.parse(response.toString());

    //     let args = ["x509::/OU=client/CN=client3::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "5"]
    //     await submitTransaction('transferToWallet', args);

    //     response = await submitTransaction('readAsset', argsClient2);
    //     let client2After = await JSON.parse(response.toString());

    //     response = await submitTransaction('readAsset', argsClient3);
    //     let client3After = await JSON.parse(response.toString());

    //     assert.equal(client2.balance, client2After.balance + 5);
    //     assert.equal(client3.balance, client3After.balance - 5);

    // }).timeout(100000);

    // it('transferToWallet - Negative: Transfer from admin', async () => {

    //     try {
    //         // Disconnect Admin identity 
    //         await gateway.disconnect();

    //         let discoveryAsLocalhost = hasLocalhostURLs(connectionProfile);
    //         let discoveryEnabled = true;
    //         let optionsConnection = {
    //             wallet: wallet,
    //             identity: 'userAdmin',
    //             discovery: {
    //                 asLocalhost: discoveryAsLocalhost,
    //                 enabled: discoveryEnabled
    //             }
    //         };

    //         // Connect with userAdmin identity
    //         await gateway.connect(connectionProfile, optionsConnection);

    //         let argsClient2 = ["x509::/OU=client/CN=client2::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com"]
    //         let response = await submitTransaction('readAsset', argsClient2);
    //         let client2 = await JSON.parse(response.toString());

    //         let argsClient3 = ["x509::/OU=client/CN=client3::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com"]
    //         response = await submitTransaction('readAsset', argsClient3);
    //         let client3 = await JSON.parse(response.toString());

    //         let args = ["x509::/OU=client/CN=client3::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "5"]
    //         await submitTransaction('transferToWallet', args);

    //         response = await submitTransaction('readAsset', argsClient2);
    //         let client2After = await JSON.parse(response.toString());

    //         response = await submitTransaction('readAsset', argsClient3);
    //         let client3After = await JSON.parse(response.toString());

    //         assert.equal(client2.balance, client2After.balance + 5);
    //         assert.equal(client3.balance, client3After.balance - 5);
    //     }
    //     catch (err) {
    //         assert(err);
    //         let error = err.message;
    //     }

    // }).timeout(10000);
    
    // The test have been commented until the user creation work properly:
    // it('cancelTravel', async () => {
    //     let argsCar = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
    //     await submitTransaction('createCar', argsCar);

    //     let argsOffer = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
    //     let responseOffer = await submitTransaction('createOffer', argsOffer);
    //     let jsonResponseOffer = await JSON.parse(responseOffer.toString());
    //     let offerID = jsonResponseOffer.id;

    //     let argsTravel = [offerID, '1701385200001', '1703890700000', '4', '45.2555;75.5876', 'true', '']
    //     const responseTravel = await submitTransaction('createTravel', argsTravel);
    //     let jsonResponseTravel = await JSON.parse(responseTravel.toString());
    //     let travelID = jsonResponseTravel.id;

    //     console.log(jsonResponseTravel);

    //     let args = [travelID];
    //     let response = await submitTransaction('assetExists', args);
    //     assert.equal(response.toString(), 'true');

    //     await submitTransaction('cancelTravel', args);
        
    //     response = await submitTransaction('assetExists', args);
    //     assert.equal(response.toString(), 'false');
    // }).timeout(100000);

    // TODO: Create test cancel travel with one user
    // TODO: Create test cancel travel with many users
    // TODO: Create test cancel travel with user without money
    // TODO: Travel cancellation test in which you do not participate 

    // it('resolveTravel', async () => {
    //     // TODO: This test must be terminated when Checking the vehicle state is completed 
    //     // and save balance in a trip is completed
    //     const argsDelete = ['1234ABC'];
    //     await submitTransaction('deleteCar', argsDelete);

    //     const argsCreate = ['1234ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
    //     await submitTransaction('createCar', argsCreate);

    //     const args = ['1234ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
    //     const response = await submitTransaction('createOffer', args);
    //     let jsonResponse = await JSON.parse(response.toString());
    //     let offerID = jsonResponse.id;

    //     const argsTravel = [offerID, '1701385200001', '1703890700000', '4', '45.2555;75.5876', 'true', '']
    //     const responseTravel = await submitTransaction('createTravel', argsTravel);
    //     let jsonResponseTravel = await JSON.parse(responseTravel.toString());
        
    //     let argsResolve = [jsonResponseTravel.id];
    //     let responseResolve = await submitTransaction('resolveTravel', argsResolve);
    //     let jsonResponseResolve = await JSON.parse(responseResolve.toString());

    // }).timeout(60000);


    it('deleteCarTest', async () => {
        const argsDeleteAsset = ['4444ABC']
        await submitTransaction('deleteAsset', argsDeleteAsset)

        const argsCreate = ['4444ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        await submitTransaction('createCar', argsCreate);

        const argsDelete = ['4444ABC'];
        const responseDeleteCar = await submitTransaction('deleteCar', argsDelete);

        let jsonResponse = await JSON.parse(responseDeleteCar.toString());
        
        return jsonResponse;

    }).timeout(60000);

    it('deleteCarWithinAnOfferTest', async () => {   
        const argsDeleteAsset = ['4444ABC']
        await submitTransaction('deleteAsset', argsDeleteAsset)
  
        const argsCreate = ['4444ABC', 'Brand1', 'Model1', 'Colour1', '10', '2018'];
        await submitTransaction('createCar', argsCreate);

        const argsOffer = ['4444ABC', '10', '12', '1701385200000', '1703890800000', '100', '45.2554;75.5875', '[]'];
        await submitTransaction('createOffer', argsOffer);

        try{
            const argsDelete = ['4444ABC'];
            const responseDeleteCar = await submitTransaction('deleteCar', argsDelete);

            let jsonResponse = await JSON.parse(responseDeleteCar.toString());

            return jsonResponse;
        }
        catch(err){
            let error = err.message;
        }

    }).timeout(30000);


    async function submitTransaction(functionName, args) {
        // Submit transaction
        const network = await gateway.getNetwork('mychannel');
        const contract = await network.getContract('MyContract', 'MyContract');
        const responseBuffer = await contract.submitTransaction(functionName, ...args);
        return responseBuffer;
    }

    // Checks if URL is localhost
    function isLocalhostURL(url) {
        const parsedURL = URL.parse(url);
        const localhosts = [
            'localhost',
            '127.0.0.1'
        ];
        return localhosts.indexOf(parsedURL.hostname) !== -1;
    }

    // Used for determining whether to use discovery
    function hasLocalhostURLs(connectionProfile) {
        const urls = [];
        for (const nodeType of ['orderers', 'peers', 'certificateAuthorities']) {
            if (!connectionProfile[nodeType]) {
                continue;
            }
            const nodes = connectionProfile[nodeType];
            for (const nodeName in nodes) {
                if (!nodes[nodeName].url) {
                    continue;
                }
                urls.push(nodes[nodeName].url);
            }
        }
        return urls.some((url) => isLocalhostURL(url));
    }

});