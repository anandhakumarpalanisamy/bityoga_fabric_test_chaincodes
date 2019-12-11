/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
const shim = require('fabric-shim');
// const { Contract } = require('fabric-contract-api');
const { ClientIdentity } = require('fabric-shim');
const assert = require('assert');
const { CarAsset } = require('./carAsset');
const { OfferAsset } = require('./offerAsset');
const { TravelAsset } = require('./travelAsset');
const { UserAsset } = require('./userAsset');
// const { User } = require('./user');
const util = require('./util');

let carAsset = new CarAsset();
let offerAsset = new OfferAsset();
let travelAsset = new TravelAsset();
let userAsset = new UserAsset();
//let user = new User();

let myContract;


class MyContract {

    async Init(stub) {
        myContract = new MyContract();

        try {
            return shim.success();
        } catch (e) {
            return shim.error(e);
        }
    }

    async Invoke(stub) {
        let ret = stub.getFunctionAndParameters();

        let method = this[ret.fcn];
        if (!method) {
            console.log('no function of name:' + ret.fcn + ' found');
            throw new Error('Received unknown function ' + ret.fcn + ' invocation');
        }

        try {
            let payload = await method(stub, ret.params);
            return shim.success(payload);
        } catch (err) {
            console.log(err);
            return shim.error(err);
        }
    }


    async createUser(stub, args) {
        let [userId] = args;

        let asset = await userAsset.create(userId);

        let buffer = Buffer.from(JSON.stringify(asset));
        await stub.putState(userId, buffer);

        return buffer;
    }

    // // CAR ------------------------------------------------------------------------------

    async createCar(stub, args) {
        let [carLicensePlate, brand, model, colour, seats, yearOfEnrollment, observations] = args;
        const exists = await myContract.assetExists(stub, carLicensePlate);
        if (exists) {
            let car = await myContract.readAsset(stub, carLicensePlate);
            if (car.notDeleted == true) {
                throw new Error(`The my asset ${carLicensePlate} exist`);
            }
        }

        let cid = new ClientIdentity(stub);
        let ownerId = cid.getID();

        let asset = await carAsset.create(carLicensePlate, brand, model, colour, seats, yearOfEnrollment, observations, ownerId);
        let buffer = Buffer.from(JSON.stringify(asset));
        await stub.putState(carLicensePlate, buffer);


        return buffer;
    }

    async updateCar(stub, args) {
        let [carLicensePlate, brand, model, colour, seats, yearOfEnrollment, observations] = args;
        
        const exists = await myContract.assetExists(stub, carLicensePlate);
        if (!exists) {
            throw new Error(`The my asset ${carLicensePlate} does not exist`);
        }
        const car = await myContract.readAsset(stub, carLicensePlate)
        if (car.notDeleted == false) {
            throw new Error(`You can not edit a car that is deleted`)
        }
        const notDeleted = car.notDeleted

        let cid = new ClientIdentity(stub);
        let ownerId = cid.getID();

        assert.equal(car.ownerId, ownerId, 'You can not edit this car');

        const asset = await carAsset.edit(carLicensePlate, brand, model, colour, seats, yearOfEnrollment, observations, ownerId, notDeleted);

        const buffer = Buffer.from(JSON.stringify(asset));
        await stub.putState(carLicensePlate, buffer);

        return buffer;
    }

    async deleteCar(stub, args) {
        let [carLicensePlate] = args;
        let cid = new ClientIdentity(stub);
        let clientID = cid.getID();
        const car = await myContract.readAsset(stub, carLicensePlate)
        assert.equal(car.ownerId, clientID, 'You cannot delete a car you dont own')

        let queryString = {};
        queryString.selector = {};
        queryString.selector.docType = 'offer';
        queryString.selector.notDeleted = true;
        queryString.selector.car = {};
        queryString.selector.car.carLicensePlate = carLicensePlate;

        const buffer = await myContract.getQueryResultForQueryString(stub, JSON.stringify(queryString));
        let offers = JSON.parse(buffer.toString());

        assert.equal(offers.length, 0, 'You cannot delete a car within a Offer')

        const asset = await carAsset.deleteCar(car, "false");

        await myContract.saveAssetState(stub, carLicensePlate, asset);
        let bufferCar = Buffer.from(JSON.stringify(asset));

        return bufferCar;
    }

    async findAllCarsByOwner(stub) {
        let clientLogged = await myContract.getClientLogged(stub);
        clientLogged = JSON.parse(clientLogged.toString());

        let queryString = {};
        queryString.selector = {};
        queryString.selector.docType = 'car';
        queryString.selector.ownerId = clientLogged;
        queryString.selector.notDeleted = true;

        const buffer = await myContract.getQueryResultForQueryString(stub, JSON.stringify(queryString));

        return buffer;
    }

    async findOneCar(stub, args) {
        let [carLicensePlate] = args;

        let asset = await myContract.readAsset(stub, carLicensePlate);
        assert.equal(asset.docType, 'car', 'Car not found');
        let buffer = Buffer.from(JSON.stringify(asset));

        return buffer;
    }

    async listCars(stub) {
        let queryString = {};
        queryString.selector = {};
        queryString.selector.docType = 'car';

        const buffer = await myContract.getQueryResultForQueryString(stub, JSON.stringify(queryString));
        const asset = JSON.parse(buffer.toString());


        return buffer;
    }

    // // OFFERS ---------------------------------------------------------------------------

    async findOneOffer(stub, args) {
        let [offerId] = args;

        let offer = await offerAsset.findOne(stub, offerId);
        let buffer = Buffer.from(JSON.stringify(offer));

        return buffer;
    }

    async createOffer(stub, args) {
        let [carLicensePlate, priceForKm, priceForTime, startDate, endDate, deposit, startPlace, 
            endPlaces] = args;
        // Check if car exists
        let car = await myContract.readAsset(stub, carLicensePlate);

        let cid = new ClientIdentity(stub);
        let clientID = cid.getID();

        assert.equal(car.notDeleted, true, 'You cannot create an offer with a deleted car')
        assert.equal(clientID, car.ownerId, 'You must be the car owner to add it to an offer');

        let asset = await offerAsset.create(car, priceForKm, priceForTime, startDate, endDate,
            deposit, startPlace, endPlaces);


        let buffer = Buffer.from(JSON.stringify(asset));
        await stub.putState(asset.id, buffer);

        return buffer;
    }

    async updateOffer(stub, args) {
        let [id, carLicensePlate, priceForKm, priceForTime, startDate, endDate, deposit, 
            startPlace, endPlaces, notDeleted] = args;

        // Check if assets exists

        let car = await myContract.readAsset(stub, carLicensePlate);
        let offer = await myContract.readAsset(stub, id);

        let cid = new ClientIdentity(stub);
        let clientID = cid.getID();

        assert.equal(clientID, car.ownerId, 'You must be the car owner to add it to an offer');
        assert.equal(clientID, offer.car.ownerId, 'You must be the car owner to add it to an offer');

        const asset = await offerAsset.edit(id, car, priceForKm, priceForTime, startDate, endDate,
            deposit, startPlace, endPlaces, notDeleted);

        const buffer = Buffer.from(JSON.stringify(asset));
        await stub.putState(id, buffer);

        return buffer;
    }

    async listOffers(stub, args) {
        let [seats, startCoordinates, limitKm, endCoordinates] = args;
        let queryString = {};
        queryString.selector = {};
        queryString.selector.docType = 'offer';
        // queryString.selector.notDeleted = true;

        if (parseInt(seats)) {
            queryString.selector.car = {};
            queryString.selector.car.seats = { $gte: parseInt(seats) };
        }

        let buffer = await myContract.getQueryResultForQueryString(stub, JSON.stringify(queryString));
        let offers = JSON.parse(buffer.toString());

        if ((startCoordinates || endCoordinates) && limitKm) {
            offers = await offerAsset.filterByLimit(offers, startCoordinates, endCoordinates, limitKm);
            buffer = Buffer.from(JSON.stringify(offers));
        }

        return buffer;
    }


    // ----------------------------------TRAVELS-----------------------------------------

    async editAvailabilityOffer(stub, args) {
        let [offerId, available] = args;

        let offer = await offerAsset.editAvailability(stub, offerId, available);
        let buffer = Buffer.from(JSON.stringify(offer));

        return buffer;
    }

    async createTravel(stub, args) {
        let [offerId, initTime, finishTime, passengers, destination, rentForTime, observations] = args;
        let clientLogged = await myContract.getClientLogged(stub);
        clientLogged = JSON.parse(clientLogged.toString());
        clientLogged = await myContract.readAsset(stub, clientLogged);

        let offer = await myContract.readAsset(stub, offerId);

        let cid = new ClientIdentity(stub);
        let clientID = cid.getID();

        let asset = await travelAsset.create(offer, initTime, finishTime, clientID, passengers,
            destination, rentForTime, observations);

        [clientLogged, asset] = await userAsset.transfer(clientLogged, asset, asset.totalPrice, "balance", "priceBalance");
        await myContract.saveAssetState(stub, clientLogged.id, clientLogged);
        await myContract.saveAssetState(stub, asset.id, asset);

        [clientLogged, asset] = await userAsset.transfer(clientLogged, asset, offer.deposit, "balance", "depositBalance");
        await myContract.saveAssetState(stub, clientLogged.id, clientLogged);
        await myContract.saveAssetState(stub, asset.id, asset);
        let buffer = Buffer.from(JSON.stringify(asset));

        return buffer;
    }

    // // 0 = Ok, 1 = NotOk, 2 = NotChecked
    async checkCar(stub, args) {
        let [carLicensePlate, status] = args;
        // Query all travels with car license plate equals to carLicensePlate and status not checked
        let queryString = {};
        queryString.selector = {};
        queryString.selector.docType = 'travel';
        queryString.selector.carLicensePlate = carLicensePlate;
        queryString.selector.carStatus = 2;

        let bufferQuery = await myContract.getQueryResultForQueryString(stub, JSON.stringify(queryString));
        let travels = JSON.parse(bufferQuery.toString());
        let sortedTravels = travels.sort((a, b) => (a.Record.initTime - b.Record.initTime));
        assert.equal(sortedTravels.length, 2, "You can not check this car");

        let travelToCheck = sortedTravels[0].Record;
        let nextTravel = sortedTravels[1].Record;

        let clientLogged = await myContract.getClientLogged(stub);
        clientLogged = JSON.parse(clientLogged.toString());
        clientLogged = await myContract.readAsset(stub, clientLogged);

        let containsUser = nextTravel.users.filter(function (user) { return user.clientId === clientLogged.id });
        assert.equal(containsUser.length, 1, "You must be part of the next travel to check the car");

        let statusInt = await parseInt(status);
        let asset = await travelAsset.checkCar(travelToCheck, statusInt);
        // await this.saveAssetState(ctx, asset.id, asset)

        let response = await myContract.resolveTravel(stub, asset);
        let buffer = Buffer.from(JSON.stringify(response));

        return buffer;
    }

    async finishTravel(stub, args) {
        let [ travelId, location ] = args;
        let asset = await travelAsset.finish(stub, travelId, location);

        const buffer = Buffer.from(JSON.stringify(asset));
        return buffer;
    }

    async updateTravel(stub, args) {
        let [travelId, suggestedDestinations, observations, realDestination, kmTraveled] = args;
        let travel = await myContract.readAsset(stub, travelId);

        let asset = await travelAsset.edit(travel, suggestedDestinations, observations, realDestination, kmTraveled);

        const buffer = Buffer.from(JSON.stringify(asset));
        await stub.putState(asset.id, buffer);

        return buffer;
    }

    async addUsersToTravel(stub, args) {
        let [travelId, numPassengers] = args;
        let cid = new ClientIdentity(stub);
        let clientID = cid.getID();

        let travel = await myContract.readAsset(stub, travelId);
        let offer = await myContract.readAsset(stub, travel.offerId);

        let oldTotalNumPassengers = offer.car.seats - travel.seats;
        let oldPriceTravelPerPassenger = travel.priceBalance / oldTotalNumPassengers;
        let oldPriceDepositPerPassenger = travel.depositBalance / oldTotalNumPassengers;

        travel = await travelAsset.addUsers(travel, clientID, numPassengers);

        let newTotalNumPassengers = offer.car.seats - travel.seats;
        let newPriceTravelPerPassenger = travel.priceBalance / newTotalNumPassengers;
        let newPriceDepositPerPassenger = travel.depositBalance / newTotalNumPassengers;

        for (let user of travel.users) {
            let clientTravel = await myContract.readAsset(stub, user.clientId);

            if (user.clientId == clientID) {
                let payByTravel = (newPriceTravelPerPassenger * user.passengers);
                [clientTravel, travel] = await userAsset.transfer(clientTravel, travel, payByTravel, "balance", "priceBalance");

                let payByDeposit = (newPriceDepositPerPassenger * user.passengers);
                [clientTravel, travel] = await userAsset.transfer(clientTravel, travel, payByDeposit, "balance", "depositBalance");
            }
            else {
                let paidByTravel = oldPriceTravelPerPassenger * user.passengers;
                let returnByTravel = paidByTravel - (newPriceTravelPerPassenger * user.passengers);
                [travel, clientTravel] = await userAsset.transfer(travel, clientTravel, returnByTravel, "priceBalance", "balance");

                let paidByDeposit = oldPriceDepositPerPassenger * user.passengers;
                let returnByDeposit = paidByDeposit - (newPriceDepositPerPassenger * user.passengers);
                [travel, clientTravel] = await userAsset.transfer(travel, clientTravel, returnByDeposit, "depositBalance", "balance");
            }

            await myContract.saveAssetState(stub, clientTravel.id, clientTravel);
            await myContract.saveAssetState(stub, travel.id, travel);
        }
        let buffer = Buffer.from(JSON.stringify(travel));

        return buffer;
    }

    async listTravels(stub, args) {
        let [seats, startCoordinates, limitKm, endCoordinates] = args;
        let queryString = {};
        queryString.selector = {};
        queryString.selector.docType = 'travel';

        queryString.selector.rentForTime = false;
        if (parseInt(seats)) {
            queryString.selector.seats = { $gte: parseInt(seats) };
        }

        let buffer = await myContract.getQueryResultForQueryString(stub, JSON.stringify(queryString));
        let travels = JSON.parse(buffer.toString());

        if ((startCoordinates || endCoordinates) && limitKm) {
            travels = await travelAsset.filterByLimit(travels, startCoordinates, endCoordinates, limitKm);
            buffer = Buffer.from(JSON.stringify(travels));
        }

        return buffer;
    }

    async addSuggestedLocationToTravel(stub, args) {
        let [travelId, location, reward] = args;
        assert(travelId, 'Travel cannot be undefined');
        let travel = await myContract.readAsset(stub, travelId);
        let offer = await myContract.readAsset(stub, travel.offerId);
        let ownerCarClient = await myContract.readAsset(stub, offer.car.ownerId);

        travel = await travelAsset.addSuggestedLocation(stub, travel, location, reward, ownerCarClient);
        await myContract.saveAssetState(stub, travel.id, travel);

    }


    // // TRANSFERS ------------------------------------------------------------------------

    async buyCscoin(stub, args) {
        let [to, amount] = args;

        let asset = await userAsset.buyCscoin(stub, to, amount);
        const buffer = Buffer.from(JSON.stringify(asset));

        return buffer;
    }

    async cancelTravel(stub, args) {
        let [travelId] = args;
        try {
            let cid = new ClientIdentity(stub);
            let clientID = cid.getID();
            let loggedClient = await myContract.readAsset(stub, clientID);

            let travel = await myContract.readAsset(stub, travelId);
            let offer = await myContract.readAsset(stub, travel.offerId);
            let clientCarOwner = await myContract.readAsset(stub, offer.car.ownerId);
            let loggedClientIncludedInTravel = await travel.users.filter(user => user.clientId == loggedClient.id);
            assert.equal(loggedClientIncludedInTravel.length, 1, 'You can only cancel your trips');

            let now = new Date().getTime();
            let timeUntilBeginTravel = travel.initTime - now;

            let oldTotalNumPassengers = offer.car.seats - travel.seats;
            let oldPriceTravelPerPassenger = travel.priceBalance / oldTotalNumPassengers;
            let oldPriceDepositPerPassenger = travel.depositBalance / oldTotalNumPassengers;

            travel = await travelAsset.deleteUsers(travel, clientID);
            let newTotalNumPassengers = offer.car.seats - travel.seats;
            let newPriceTravelPerPassenger = travel.priceBalance / newTotalNumPassengers;
            let newPriceDepositPerPassenger = travel.depositBalance / newTotalNumPassengers;

            let transerByTravel = oldPriceTravelPerPassenger * loggedClientIncludedInTravel[0].passengers;
            let transferByDeposit = oldPriceDepositPerPassenger * loggedClientIncludedInTravel[0].passengers;


            if (timeUntilBeginTravel >= 900000) {
                // Cancel a trip until 15 minutes before it starts

                // Return price by travel to client
                [travel, loggedClient] = await userAsset.transfer(travel, loggedClient, transerByTravel, "priceBalance", "balance");
                await myContract.saveAssetState(stub, travel.id, travel);
                await myContract.saveAssetState(stub, loggedClient.id, loggedClient);

                // Return price by deposit to client
                [travel, loggedClient] = await userAsset.transfer(travel, loggedClient, transferByDeposit, "depositBalance", "balance");
                await myContract.saveAssetState(stub, travel.id, travel);
                await myContract.saveAssetState(stub, loggedClient.id, loggedClient);

                for (let user of travel.users) {
                    let paidByTravel = oldPriceTravelPerPassenger * user.passengers;
                    let paidByDeposit = oldPriceDepositPerPassenger * user.passengers;

                    let payByTravel = (newPriceTravelPerPassenger * user.passengers) - paidByTravel;
                    let payByDeposit = (newPriceDepositPerPassenger * user.passengers) - paidByDeposit;

                    let clientTravel = await myContract.readAsset(stub, user.clientId);

                    [clientTravel, travel] = await userAsset.transfer(clientTravel, travel, payByTravel, "balance", "priceBalance");
                    await myContract.saveAssetState(stub, clientTravel.id, clientTravel);
                    await myContract.saveAssetState(stub, travel.id, travel);

                    [clientTravel, travel] = await userAsset.transfer(clientTravel, travel, payByDeposit, "balance", "depositBalance");
                    await myContract.saveAssetState(stub, clientTravel.id, clientTravel);
                    await myContract.saveAssetState(stub, travel.id, travel);
                }
            }
            else if (timeUntilBeginTravel >= 60000) {
                // Cancel a trip between 15 and 1 minutes before it starts

                // Return price by travel to client
                [travel, loggedClient] = await userAsset.transfer(travel, loggedClient, transerByTravel, "priceBalance", "balance");
                await myContract.saveAssetState(stub, travel.id, travel);
                await myContract.saveAssetState(stub, loggedClient.id, loggedClient);

                // Return price by deposit to owner car
                [travel, clientCarOwner] = await userAsset.transfer(travel, clientCarOwner, transferByDeposit, "depositBalance", "balance");
                await myContract.saveAssetState(stub, travel.id, travel);
                await myContract.saveAssetState(stub, clientCarOwner.id, clientCarOwner);

                for (let user of travel.users) {
                    let paidByTravel = oldPriceTravelPerPassenger * user.passengers;
                    let payByTravel = (newPriceTravelPerPassenger * user.passengers) - paidByTravel;

                    let clientTravel = await myContract.readAsset(stub, user.clientId);

                    [clientTravel, travel] = await userAsset.transfer(clientTravel, travel, payByTravel, "balance", "priceBalance");
                    await myContract.saveAssetState(stub, clientTravel.id, clientTravel);
                    await myContract.saveAssetState(stub, travel.id, travel);
                };
            }
            else {
                // Cancel a trip after it starts

                // Return price by travel to owner car
                [travel, clientCarOwner] = await userAsset.transfer(travel, clientCarOwner, transerByTravel, "priceBalance", "balance");
                await myContract.saveAssetState(stub, travel.id, travel);
                await myContract.saveAssetState(stub, clientCarOwner.id, clientCarOwner);

                // Return price by deposit to owner car
                [travel, clientCarOwner] = await userAsset.transfer(travel, clientCarOwner, transferByDeposit, "depositBalance", "balance");
                await myContract.saveAssetState(stub, travel.id, travel);
                await myContract.saveAssetState(stub, clientCarOwner.id, clientCarOwner);
            }

            if (travel.users.length == 0 && travel.priceBalance == 0 && travel.depositBalance == 0 && travel.rewardBalance == 0) {
                travel.deleted = true;
                await myContract.saveAssetState(stub, travel.id, travel);
            }
        }
        catch (err) {
            if (err.message == "Balance must be greater than amount") {
                await myContract.cancelTravelForAll(stub, travelId);
            }
        }
    }

    async cancelTravelForAll(stub, travelId) {
        let travel = await myContract.readAsset(stub, travelId);
        let offer = await myContract.readAsset(stub, travel.offerId);
        let clientCarOwner = await myContract.readAsset(stub, offer.car.ownerId);

        let now = new Date().getTime();
        let timeUntilBeginTravel = travel.initTime - now;

        let totalNumPassengers = offer.car.seats - travel.seats;
        let priceTravelPerPassenger = travel.priceBalance / totalNumPassengers;
        let priceDepositPerPassenger = travel.depositBalance / totalNumPassengers;

        if (timeUntilBeginTravel >= 900000) {
            // Cancel a trip until 15 minutes before it starts

            for (let user of travel.users) {
                let paidByTravel = priceTravelPerPassenger * user.passengers;
                let paidByDeposit = priceDepositPerPassenger * user.passengers;
                let clientTravel = await myContract.readAsset(stub, user.clientId);

                [travel, clientTravel] = await userAsset.transfer(travel, clientTravel, paidByTravel, "priceBalance", "balance");
                [travel, clientTravel] = await userAsset.transfer(travel, clientTravel, paidByDeposit, "depositBalance", "balance");
                await myContract.saveAssetState(stub, clientTravel.id, clientTravel);
                await myContract.saveAssetState(stub, travel.id, travel);
            }
        }
        else if (timeUntilBeginTravel >= 60000) {
            // Cancel a trip between 15 and 1 minutes before it starts

            // Return price by deposit to owner car
            [travel, clientCarOwner] = await userAsset.transfer(travel, clientCarOwner, travel.depositBalance, "depositBalance", "balance");
            await myContract.saveAssetState(stub, travel.id, travel);
            await myContract.saveAssetState(stub, clientCarOwner.id, clientCarOwner);

            for (let user of travel.users) {
                let paidByTravel = priceTravelPerPassenger * user.passengers;
                let clientTravel = await myContract.readAsset(stub, user.clientId);

                [travel, clientTravel] = await userAsset.transfer(travel, clientTravel, paidByTravel, "priceBalance", "balance");
                await myContract.saveAssetState(stub, clientTravel.id, clientTravel);
                await myContract.saveAssetState(stub, travel.id, travel);
            };
        }
        else {
            // Cancel a trip after it starts

            // Return price and deposit to owner car
            [travel, clientCarOwner] = await userAsset.transfer(travel, clientCarOwner, travel.priceBalance, "priceBalance", "balance");
            [travel, clientCarOwner] = await userAsset.transfer(travel, clientCarOwner, travel.depositBalance, "depositBalance", "balance");
            await myContract.saveAssetState(stub, travel.id, travel);
            await myContract.saveAssetState(stub, clientCarOwner.id, clientCarOwner);
        }

        travel.deleted = true;
        await myContract.saveAssetState(stub, travel.id, travel);

        return travel;
    }

    async resolveTravel(stub, travel) {
        let offer = await myContract.readAsset(stub, travel.offerId);
        let ownerCarClient = await myContract.readAsset(stub, offer.car.ownerId);
        let totalNumPassengers = offer.car.seats - travel.seats;
        let priceDepositPerPassenger = travel.depositBalance / totalNumPassengers;

        assert(travel.priceBalance > 0, 'Unable to resolve a resolved travel');

        let isPenalizedByTime = await travelAsset.isPenalizedByTime(travel);
        let [isPenalizedByDestination, reward, rewardToOwner, rewardToSystem] = await travelAsset.isPenalizedByDestination(travel, ownerCarClient);
        let rewardByPerPassenger = reward / totalNumPassengers;

        [travel, ownerCarClient] = await userAsset.transfer(travel, ownerCarClient, rewardToOwner, "rewardBalance", "balance");
        await myContract.saveAssetState(stub, travel.id, travel);
        await myContract.saveAssetState(stub, ownerCarClient.id, ownerCarClient);

        travel = await userAsset.deleteBalanceTo(travel, rewardToSystem, "rewardBalance");
        await myContract.saveAssetState(stub, travel.id, travel);

        if (travel.carStatus == 0 && !isPenalizedByTime && !isPenalizedByDestination) {

            [travel, ownerCarClient] = await userAsset.transfer(travel, ownerCarClient, travel.priceBalance, "priceBalance", "balance");
            await myContract.saveAssetState(stub, travel.id, travel);
            await myContract.saveAssetState(stub, ownerCarClient.id, ownerCarClient);

            for (let user of travel.users) {
                let clientTravel = await myContract.readAsset(stub, user.clientId);

                let paidByDeposit = priceDepositPerPassenger * user.passengers;
                [travel, clientTravel] = await userAsset.transfer(travel, clientTravel, paidByDeposit, "depositBalance", "balance");

                let paidByReward = rewardByPerPassenger * user.passengers;
                [travel, clientTravel] = await userAsset.transfer(travel, clientTravel, paidByReward, "rewardBalance", "balance");

                await myContract.saveAssetState(stub, travel.id, travel);
                await myContract.saveAssetState(stub, clientTravel.id, clientTravel);
            };
        }
        else if (travel.carStatus == 1 || isPenalizedByTime || isPenalizedByDestination) {

            if (!isPenalizedByDestination && reward > 0) {
                for (let user of travel.users) {
                    let paidByReward = rewardByPerPassenger * user.passengers;
                    let clientTravel = await myContract.readAsset(stub, user.clientId);

                    [travel, clientTravel] = await userAsset.transfer(travel, clientTravel, paidByReward, "rewardBalance", "balance");
                    await myContract.saveAssetState(stub, travel.id, travel);
                    await myContract.saveAssetState(stub, clientTravel.id, clientTravel);
                };
            }

            [travel, ownerCarClient] = await userAsset.transfer(travel, ownerCarClient, travel.priceBalance, "priceBalance", "balance");
            [travel, ownerCarClient] = await userAsset.transfer(travel, ownerCarClient, travel.depositBalance, "depositBalance", "balance");

            await myContract.saveAssetState(stub, travel.id, travel);
            await myContract.saveAssetState(stub, ownerCarClient.id, ownerCarClient);
        }

        return travel;
    }



    // // OTHERS ---------------------------------------------------------------------------
    async saveAssetState(stub, id, asset) {
        let buffer = Buffer.from(JSON.stringify(asset));
        await stub.putState(id, buffer);
    }

    async getClientLogged(stub) {
        let cid = new ClientIdentity(stub);
        let clientLogged = cid.getID();

        // assert(clientLogged.includes('OU=client'), 'User logged must be a client');

        let buffer = Buffer.from(JSON.stringify(clientLogged));
        return buffer;
    }

    async getAdminLogged(stub) {
        let cid = new ClientIdentity(stub);
        let adminLogged = cid.getID();

        assert(adminLogged.includes('OU=admin'), 'User logged must be a admin');

        return adminLogged;
    }


    async assetExists(stub, assetId) {
        const buffer = await stub.getState(assetId);
        return (!!buffer && buffer.length > 0);
    }

    async readAsset(stub, assetId) {
        const exists = await myContract.assetExists(stub, assetId);
        if (!exists) {
            throw new Error(`The my asset ${assetId} does not exist`);
        }

        const buffer = await stub.getState(assetId);
        const asset = JSON.parse(buffer.toString());

        return asset;
    }

    async deleteAsset(stub, args) {
        let [assetId] = args;
        await util.deleteAsset(stub, assetId);
    }

    async getQueryResultForQueryString(stub, queryString) {

        let resultsIterator = await stub.getQueryResult(queryString);
        let results = await myContract.getAllResults(resultsIterator, false);

        return Buffer.from(JSON.stringify(results));
    }

    async getAllResults(iterator, isHistory) {
        let allResults = [];

        while (true) {
            let res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                let jsonRes = {};

                if (isHistory && isHistory === true) {
                    jsonRes.TxId = res.value.tx_id;
                    jsonRes.Timestamp = res.value.timestamp;
                    jsonRes.IsDelete = res.value.is_delete.toString();
                    try {
                        jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        console.log(err);
                        jsonRes.Value = res.value.value.toString('utf8');
                    }
                } else {
                    jsonRes.Key = res.value.key;
                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        console.log(err);
                        jsonRes.Record = res.value.value.toString('utf8');
                    }
                }
                allResults.push(jsonRes);
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return allResults;
            }
        }
    }

}

// module.exports = MyContract;
shim.start(new MyContract());