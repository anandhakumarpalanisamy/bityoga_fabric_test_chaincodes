// TODO: Edit the asset to use it as we speak.
const geodist = require('geodist');
const assert = require('assert');
const { ClientIdentity } = require('fabric-shim');
const util = require('./util');
const { UserAsset } = require('./userAsset');
let userAsset = new UserAsset();

var travel = {
    docType: String,
    id: String,
    carLicensePlate: String,
    users: [{
        userId: String,
        passengers: Number
    }],
    offerId: String,
    origin: String,
    destination: String,
    initTime: Number,
    finishTime: Number,
    suggestedDestinations: [],
    rentForTime: Boolean,
    seats: Number,
    totalPrice: Number,
    observations: String,
    finished: [],
    realDestination: String,
    realFinalDate: Number,
    kmTraveled: Number,
    priceBalance: Number,
    depositBalance: Number,
    rewardBalance: Number,
    carStatus: Number
};

// asdasd ad 
class TravelAsset {

    /**
     * 
     * @param {Object} offer 
     * @param {Date} initTime 
     * @param {Date} finishTime (?)
     * @param {String} clientId 
     * @param {number} passengers 
     * @param {number} destination 
     * @param {Boolean} rentForTime 
     * @param {String} observations 
     * When you create a travel, the offer related to it is edited to "Not avalible"
     */
    async create(offer, initTime, finishTime, clientId, passengers, destination, rentForTime, observations) {
        assert.notEqual(offer, undefined, 'Offer cannot be undefined');
        assert.notEqual(initTime, undefined, 'Init time cannot be undefined');
        assert.notEqual(finishTime, undefined, 'Init time cannot be undefined');
        assert.notEqual(passengers, 'Number of passanger cannot be undefined');
        assert.notEqual(rentForTime, 'Rent for time cannot be undefined');

        initTime = parseInt(initTime);
        finishTime = parseInt(finishTime);
        let now = new Date().getTime();
        
        assert.ok(initTime >= offer.startDate, 'Init time must be equals or greater than start date of the offer');
        assert.ok(initTime >= now, 'Init time must be equals or greater than now')
        assert.ok(finishTime <= offer.endDate, 'Finish time must be equal or lower than end date of the offer');
        assert.ok(initTime < finishTime, 'Init time must be lower than finish time');
        assert.equal(isNaN(passengers), false, 'Number of passengers should be a number');

        let totalPrice = 0;

        if (rentForTime == "true") {
            assert.notEqual(offer.priceForTime, null, 'To create a travel, the offer must have a price for time');
            totalPrice = ((finishTime - initTime) / 1000 / 60 / 60) * offer.priceForTime;
            travel.rentForTime = true;
        } else {
            assert.notEqual(offer.priceForKm, null, 'To create a travel, the offer must have a price for km');
            assert.notEqual(destination, undefined, 'Destination cannot be undefined');
            totalPrice = (geodist(offer.startPlace.split(';'), destination.split(';'), { unit: 'km' })) * offer.priceForKm;
            travel.rentForTime = false;
        }

        passengers = parseInt(passengers);
        assert.ok(passengers <= offer.car.seats, 'There are no seats for all passengers');

        travel.docType = 'travel';
        travel.id = await this.generateId(offer.car.carLicensePlate);
        travel.totalPrice = totalPrice;
        travel.seats = offer.car.seats - passengers;
        travel.offerId = offer.id;
        travel.initTime = initTime;
        travel.carLicensePlate = offer.car.carLicensePlate;
        travel.finishTime = finishTime;
        travel.users = [];
        travel.users.push({ clientId: clientId, passengers: passengers })
        travel.origin = offer.startPlace;
        travel.destination = destination;
        travel.observations = observations;
        travel.suggestedDestinations = [];
        travel.finished = [];
        travel.priceBalance = 0;
        travel.depositBalance = 0;
        travel.rewardBalance = 0;
        travel.carStatus = 2;

        return travel;
    }

    // ["1234ABC1561547330049", "1701385500000", "1703890200000", "1", "45.2564;75.5885", "false", "[]"] 
    // "1234ABC1559897298956", "46.2555;76.5876", "", "46.8762;77.5876", "1703890500000", "348"

    async edit(travelObject, suggestedDestination, observations, realDestination, kmTraveled) {

        assert(travelObject, 'Travel cannot be undefined');
        assert.equal(isNaN(kmTraveled), false, 'Kilometer traveled should be a number');

        travelObject.suggestedDestinations.push(suggestedDestination);
        travelObject.observations = observations;
        travelObject.realDestination = realDestination;
        travelObject.kmTraveled = kmTraveled;

        return travelObject;
    }

    async finish(stub, travelId, coordinate) {
        assert.notEqual(travelId, undefined, 'Travel ID cannot be undefined');
        assert.notEqual(coordinate, undefined, 'Coordinate cannot be undefined');

        let asset = await util.readAsset(stub, travelId);
        assert.equal(asset.docType, 'travel', 'Travel not found');

        let userLogged = await util.getUserLogged(stub);
        userLogged = JSON.parse(userLogged.toString());

        let loggedUserIsAddedToUsers = await asset.users.filter(user => user.clientId == userLogged);
        assert.equal(loggedUserIsAddedToUsers.length, 1, 'You cannot finish this travel');

        let loggedUserAddedToFinished = await asset.finished.filter(finish => finish.user == userLogged);
        assert.equal(loggedUserAddedToFinished.length, 0, 'You have already finished this travel');

        let realFinalDate = new Date().getTime();
        coordinate = JSON.parse(coordinate);
        await util.validateCoordinate(coordinate);

        asset.finished.push({
            user: userLogged,
            moment: realFinalDate,
            coordinate: coordinate
        });

        await util.saveAsset(stub, travelId, asset);

        return asset;
    }

    async addUsers(travelObject, clientId, passengers) {
        assert(travelObject, 'Travel cannot be undefined');
        assert(clientId, 'Client cannot be undefined');
        assert(passengers, 'Number of passengers cannot be undefined');

        assert.equal(isNaN(passengers), false, 'Number of passengers should be a number');
        let numPassengers = parseInt(passengers);
        assert(numPassengers > 0, 'The number of passengers must be greater than zero');
        assert(travelObject.seats >= numPassengers, 'You cannot add all the passengers to the travel');

        let clientAddedBefore = await travelObject.users.filter(user => user.clientId == clientId);
        assert.equal(clientAddedBefore.length, 0, 'The client was already added to this travel');

        travelObject.seats = travelObject.seats - numPassengers;
        travelObject.users.push({ clientId: clientId, passengers: numPassengers });

        return travelObject;
    }

    async deleteUsers(travelObject, clientId) {
        assert(travelObject, 'Travel cannot be undefined');
        assert(clientId, 'Client cannot be undefined');

        let clientAddedBefore = await travelObject.users.filter(user => user.clientId == clientId);
        assert.equal(clientAddedBefore.length, 1, 'The client was already added to this travel');

        travelObject.seats = travelObject.seats + clientAddedBefore[0].passengers;

        var index = travelObject.users.indexOf(clientAddedBefore[0]);
        if (index > -1) {
            travelObject.users.splice(index, 1);
            // delete travelObject.users[index];
        }

        return travelObject;
    }

    async checkCar(travelObject, status) {
        assert.notEqual(status, undefined, 'Status cannot be undefined');
        assert(travelObject, 'Travel cannot be undefined');

        travelObject.carStatus = status;

        return travelObject;
    }

    async generateId(carLicensePlate) {
        let now = new Date().getTime();
        let id = carLicensePlate + now;

        return id;
    }

    async isInTheLimit(startCoordinate, endCoordinate, limit) {
        let startCoordinateArray = startCoordinate.split(';');
        let endCoordinateArray = endCoordinate.split(';');

        let isInTheLimit = geodist(startCoordinateArray, endCoordinateArray, { limit: parseInt(limit), unit: 'km' });

        return isInTheLimit;
    }

    async filterByLimit(travelsArray, startCoordinate, endCoordinate, limit) {
        let result = [];
        let resultStart = [];
        let resultEnd = [];

        if (startCoordinate && limit) {
            // "","45.2554;75.5875","2000","45.2554;75.5875"
            await travelsArray.forEach(travel => {
                this.isInTheLimit(startCoordinate, travel.Record.origin, limit).then(isInLimitStart => {
                    if (isInLimitStart) {
                        resultStart.push(travel);
                    }
                })
            });
        }

        if (endCoordinate && limit) {

            await travelsArray.forEach(travel => {
                this.isInTheLimit(endCoordinate, travel.Record.destination, limit).then(isInLimitEnd => {
                    if (isInLimitEnd) {
                        resultEnd.push(travel);
                    }
                })
            });
        }

        if (startCoordinate && endCoordinate && limit) {
            result = resultStart.filter(value => -1 !== resultEnd.indexOf(value));
        }
        else if (startCoordinate && !endCoordinate && limit) {
            result = resultStart;
        } else if (!startCoordinate && endCoordinate && limit) {
            result = resultEnd;
        }

        return result;
    }

    async isPenalizedByTime(travel) {
        let isPenalized = false;

        assert(travel, "Travel not must be undefined");

        if (travel.realFinalDate > travel.finishTime) {
            isPenalized = true;
        }

        return isPenalized;
    }


    async isPenalizedByDestination(travel, ownerCarClient) {
        let isPenalized = true;
        let reward = 0;
        let rewardToOwner = 0;
        let rewardToSystem = 0;

        assert(travel, "Travel not must be undefined");

        if (travel.rentForTime == false) {
            let sortedSuggestedDestinations = await travel.suggestedDestinations.sort((a, b) => (b.reward - a.reward));

            for (let suggestedDestination of sortedSuggestedDestinations) {
                if (rewardToOwner == 0 && suggestedDestination.suggestedBy == ownerCarClient.id) {
                    rewardToOwner = suggestedDestination.reward;
                }
                else if (rewardToSystem == 0 && suggestedDestination.suggestedBy == "system") {
                    rewardToSystem = suggestedDestination.reward;
                }

                if (await this.isInDestination(suggestedDestination.destination, travel.realDestination)) {
                    isPenalized = false;
                    reward = suggestedDestination.reward;

                    if (suggestedDestination.suggestedBy == ownerCarClient.id) {
                        rewardToOwner -= reward;
                    }
                    else {
                        rewardToSystem -= reward;
                    }
                    break;
                }

            }

            if (await this.isInDestination(travel.destination, travel.realDestination)) {
                isPenalized = false;
            }
        }
        else {
            isPenalized = false;
        }

        return [isPenalized, reward, rewardToOwner, rewardToSystem];
    }

    async getRewards(travel) {
        let isPenalized = true;

        assert(travel, "Travel not must be undefined");

        if (travel.rentForTime == false) {
            // Example suggestedDestinations
            // [
            //     { destination: '45.62;78.3', reward: 10 },
            //     { destination: '67.2;24.7', reward: 5 }
            // ]
            for (let suggestedDestination of travel.suggestedDestinations) {
                if (await this.isInDestination(suggestedDestination.destination, travel.realDestination)) {
                    isPenalized = false;
                }
            }

            if (await this.isInDestination(travel.destination, travel.realDestination)) {
                isPenalized = false;
            }
        }
        else {
            isPenalized = false;
        }

        return isPenalized;
    }

    async isInDestination(destination, realDestination) {
        let destinationArray = destination.split(';');
        let realDestinationArray = realDestination.split(';');

        // TODO: Add range destination in config file
        let isInDestination = geodist(destinationArray, realDestinationArray, { limit: 1, unit: 'km' });

        return isInDestination;
    }

    async addSuggestedLocation(stub, travel, location, reward, ownerCarClient) {
        assert(travel, 'Travel cannot be undefined');
        assert(location, 'Location cannot be undefined');
        assert(reward, 'Reward cannot be undefined');
        assert.equal(isNaN(reward), false, 'Reward should be a number');

        let cid = new ClientIdentity(stub);
        let clientID = cid.getID();



        // TODO: Create certificate to system
        let arrayClients = [ownerCarClient.id, "system"];
        assert.notEqual(arrayClients.indexOf(clientID), -1, "You do not have permissions");

        let now = new Date().getTime();
        assert(travel.initTime < now, "You cannot add a suggested destination to a travel that has not started");

        reward = parseInt(reward);
        assert(reward > 0, 'Reward must be greater than zero');
        // TODO: Valid coordinates

        let locationAddedBefore = await travel.suggestedDestinations.filter(
            function (destination) { return destination.destination === location }
        );
        assert.equal(locationAddedBefore.length, 0, 'The suggested destination was already added to this travel');


        let suggestedDestinationsByClient = await travel.suggestedDestinations.filter(function (destination) { return destination.suggestedBy === clientID });
        let sortedSuggestedDestinations = suggestedDestinationsByClient.sort((a, b) => (b.reward - a.reward));

        let diff = reward;

        if (sortedSuggestedDestinations.length > 0) {
            diff -= sortedSuggestedDestinations[0].reward;
        }

        if (diff > 0) {
            if (clientID == "system") {
                travel = await userAsset.transferTo(travel, diff, "rewardBalance");
            }
            else {
                [ownerCarClient, travel] = await userAsset.transfer(ownerCarClient, travel, diff, "balance", "rewardBalance");

                let buffer = Buffer.from(JSON.stringify(ownerCarClient));
                await stub.putState(ownerCarClient.id, buffer);
            }

            let buffer = Buffer.from(JSON.stringify(travel));
            await stub.putState(travel.id, buffer);
        }

        travel.suggestedDestinations.push({ destination: location, reward: reward, suggestedBy: clientID });

        return travel;
    }

    async findAllByOffer(stub, offerId) {
        let queryString = {};
        queryString.selector = {};
        queryString.selector.docType = 'travel';
        queryString.selector.offerId = offerId;

        let travels = await util.getQueryResultForQueryString(stub, JSON.stringify(queryString));
        
        return travels;
    }
 
}

module.exports = {
    TravelAsset
};
