'use strict';

const assert = require('assert');

let car = {
    docType: String,
    carLicensePlate: String,
    brand: String,
    model: String,
    colour: String,
    seats: Number,
    yearOfEnrollment: Number,
    ownerId: String,
    notDeleted: Boolean,
    status: String,
    available: Boolean,
    observations: String
};

class CarAsset {

    // Car status: 0 = Ok, 1 = notOk, 2 = notChecked

    async create(carLicensePlate, brand, model, colour, seats, yearOfEnrollment, observations, ownerId) {
        assert(carLicensePlate, 'Car license plate not must be undefined');
        assert(brand, 'Brand not must be undefined');
        assert(model, 'Model not must be undefined');
        assert(colour, 'Colour not must be undefined');
        assert(seats, 'Seats not must be undefined');
        assert(yearOfEnrollment, 'Year of enrollment not must be undefined');
        assert(ownerId, 'Owner Id not must be undefined');
        assert.equal(isNaN(seats), false, 'Seats must be a number');
        assert.equal(isNaN(yearOfEnrollment), false, 'Year of enrollment must be a number');

        car.docType = 'car';
        car.carLicensePlate = carLicensePlate;
        car.brand = brand;
        car.model = model;
        car.colour = colour;
        car.seats = parseInt(seats);
        car.yearOfEnrollment = parseInt(yearOfEnrollment);
        car.ownerId = ownerId;
        car.notDeleted = true;
        car.status = 2;
        car.available = true;
        car.observations = observations;

        return car;
    }

    async edit(carLicensePlate, brand, model, colour, seats, yearOfEnrollment, observations, ownerId, notDeleted) {
        assert(carLicensePlate, 'Car license plate not must be undefined');
        assert(brand, 'Brand not must be undefined');
        assert(model, 'Model not must be undefined');
        assert(colour, 'Colour not must be undefined');
        assert(seats, 'Seats not must be undefined');
        assert(yearOfEnrollment, 'Year of enrollment not must be undefined');
        assert(ownerId, 'Owner Id not must be undefined');
        assert(notDeleted, false, 'The car do not exist')
        assert.equal(isNaN(seats), false, 'Seats must be a number');
        assert.equal(isNaN(yearOfEnrollment), false, 'Year of enrollment must be a number');
        
        car.docType = 'car';
        car.carLicensePlate = carLicensePlate;
        car.brand = brand;
        car.model = model;
        car.colour = colour;
        car.seats = parseInt(seats);
        car.yearOfEnrollment = parseInt(yearOfEnrollment);        
        car.ownerId = ownerId;
        car.notDeleted = true;
        car.observations = observations;
        
        return car;
    }

    async deleteCar(car, notDeleted){

        assert(car, 'Car cannot be undefined');
        assert(notDeleted, 'Not deleted state cannot be undefined');

        if(notDeleted == "true"){
            car.notDeleted = true;
        }else{
            car.notDeleted = false;
        }

        return car;
    }

}

module.exports = {
    CarAsset
};