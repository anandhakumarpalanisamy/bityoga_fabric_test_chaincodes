'use strict';

const assert = require('assert');
const geodist = require('geodist');
const util = require('./util');
const { TravelAsset } = require('./travelAsset');

let offer = {
    docType: String,
    id: String,
    car: Object,
    priceForKm: Number,
    priceForTime: Number,
    startDate: Number,
    deposit: Number,
    startPlace: String,
    endPlaces: [],
    available: Boolean
};

// TODO: Add status to the car or offer. Make an assert to check if the status is "checking/pending";


/*
    Once the travel is finished the status of the car's offer will be "checking/pending"
    While the offer is in that status, anyone cannot make a trip with that offer;
*/

class OfferAsset {

    /**
     * @description This function create a new offer to a car
     * @param {Object} car
     * @param {Number} priceForKm Price per kilometer
     * @param {Number} priceForTime Price per time
     * @param {Number} startDate Start date of the offer (in milliseconds)
     * @param {Number} endDate End date of the offer (in milliseconds)
     * @param {Number} deposit
     * @param {String} startPlace Coordinates of the place where is the car
     * @param {String[]} endPlaces
     */
    async create(car, priceForKm, priceForTime, startDate, endDate, deposit, startPlace, endPlaces) {
        assert(car, 'Car not must be undefined');
        assert((priceForKm || priceForTime), 'Price not must be undefined');
        assert(startDate, 'Start date not must be undefined');
        assert(endDate, 'End date not must be undefined');
        assert(deposit, 'Deposit not must be undefined');
        assert(startPlace, 'Start place not must be undefined');

        assert.equal(isNaN(priceForKm), false, 'Price for km must be a number');
        assert.equal(isNaN(priceForTime), false, 'Price for time must be a number');
        assert.equal(isNaN(startDate), false, 'Start date must be a number');
        assert.equal(isNaN(endDate), false, 'Start date must be a number');
        assert.equal(isNaN(deposit), false, 'Deposit must be a number');

        assert(parseInt(deposit) > 0, '');
        assert(parseInt(startDate) < parseInt(endDate), 'End date must be later than start date');
        assert(parseInt(startDate) >= new Date().getTime(), 'Start date must be later than now');


        offer.docType = 'offer';
        offer.id = await this.generateId(car.carLicensePlate);
        offer.car = car;
        if (priceForKm) {
            assert(parseInt(priceForKm) > 0, '');
            offer.priceForKm = parseInt(priceForKm);
        }
        if (priceForTime) {
            assert(parseInt(priceForTime) > 0, '');
            offer.priceForTime = parseInt(priceForTime);
        }
        offer.startDate = parseInt(startDate);
        offer.endDate = parseInt(endDate);
        offer.deposit = parseInt(deposit);
        offer.startPlace = startPlace;
        offer.endPlaces = [];
        if (endPlaces) {
            offer.endPlaces = endPlaces.split(',');
        }
        offer.available = true;

        return offer;
    }


    /**
     * @description This function edit a offer object
     * @param {String} id Offer ID to edit
     * @param {Object} car
     * @param {Number} priceForKm
     * @param {Number} priceForTime
     * @param {Number} startDate
     * @param {Number} endDate
     * @param {Number} deposit
     * @param {String} startPlace
     * @param {String[]} endPlaces
     */
    async edit(id, car, priceForKm, priceForTime, startDate, endDate, deposit, startPlace, endPlaces, available) {

        assert(id, 'ID not must be undefined');
        assert((priceForKm || priceForTime), 'Price not must be undefined');
        assert(startDate, 'Start date not must be undefined');
        assert(endDate, 'End date not must be undefined');
        assert(deposit, 'Deposit not must be undefined');
        assert(startPlace, 'Start place not must be undefined');

        assert.equal(isNaN(priceForKm), false, 'Price for km must be a number');
        assert.equal(isNaN(priceForTime), false, 'Price for time must be a number');
        assert.equal(isNaN(startDate), false, 'Start date must be a number');
        assert.equal(isNaN(deposit), false, 'Deposit must be a number');

        offer.docType = 'offer';
        offer.id = id;
        offer.car = car;

        if (priceForKm) {
            offer.priceForKm = parseInt(priceForKm);
        }
        if (priceForTime) {
            offer.priceForTime = parseInt(priceForTime);
        }
        offer.startDate = parseInt(startDate);
        offer.endDate = parseInt(endDate);
        offer.deposit = parseInt(deposit);
        offer.startPlace = startPlace;
        if (endPlaces) {
            offer.endPlaces = endPlaces.split(',');
        }
        offer.available = Boolean(available);

        return offer;
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

    async filterByLimit(offersArrray, startCoordinate, endCoordinate, limit) {
        let result = [];
        let resultStart = [];
        let resultEnd = [];

        if (startCoordinate && limit) {

            await offersArrray.forEach(offer => {
                this.isInTheLimit(startCoordinate, offer.Record.startPlace, limit).then(isInLimitStart => {
                    if (isInLimitStart) {
                        resultStart.push(offer);
                    }
                })
            });
        }

        if (endCoordinate && limit) {

            await offersArrray.forEach(offer => {
                if (offer.Record.endPlaces) {

                    offer.Record.endPlaces.forEach(endPlace => {
                        this.isInTheLimit(endCoordinate, endPlace, limit).then(isInLimitEnd => {
                            if (isInLimitEnd) {
                                console.info('Esta en el inicio y en el fin: ' + offer.Record.startPlace + ' - ' + offer.Record.endPlaces);
                                resultEnd.push(offer);
                            }
                        })
                    })
                }
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

    async findOne(stub, offerId) {
        let asset = await this.readOffer(stub, offerId);
        assert.equal(asset.docType, 'offer', 'Offer not found');

        return asset;
    }

    async offerExists(stub, offerId) {
        let buffer = await stub.getState(offerId);
        return (!!buffer && buffer.length > 0);
    }

    async readOffer(stub, offerId) {
        let exists = await this.offerExists(stub, offerId);
        assert.equal(exists, true, 'Offer not found');

        let buffer = await stub.getState(offerId);
        let offer = JSON.parse(buffer.toString());

        return offer;
    }

    async editAvailability(stub, offerId, available) {
        let travelAsset = new TravelAsset();
        let userLogged = await util.getUserLogged(stub);
        userLogged = JSON.parse(userLogged.toString());

        let asset = await this.readOffer(stub, offerId);
        assert.equal(asset.docType, 'offer', 'Offer not found');
        assert.equal(asset.car.ownerId, userLogged, 'You cannot edit the availability of this offer');
        
        let travels = await travelAsset.findAllByOffer(stub, offerId);
        travels = await travels.filter(travel => travel.Record.realFinalDate == undefined);
        assert.equal(travels.length, 0, 'You cannot edit the availability of an offer with pending travels');

        asset.available = available.toLowerCase() == 'true' ? true : false;
        let buffer = Buffer.from(JSON.stringify(asset));
        await stub.putState(asset.id, buffer);
        
        return asset;
    }

}

module.exports = {
    OfferAsset
};