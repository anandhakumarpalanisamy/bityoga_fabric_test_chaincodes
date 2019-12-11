'use strict';

const assert = require('assert');
const util = require('./util');

let user = {
    docType: String,
    id: String,
    balance: Number
};

class UserAsset {

    async create(id) {
        assert(id, 'ID not must be undefined');

        user.docType = 'user';
        user.id = id;
        user.balance = 0;

        return user;
    }

    async balanceOf(user) {
        assert(user, 'User not must be undefinied');

        return user.balance;
    }

    async transfer(fromAccount, toAccount, amount, fromBalance, toBalance) {
        assert(fromAccount, 'Origin wallet not must be undefinied');
        assert(toAccount, 'Destination wallet not must be undefinied');
        assert(fromBalance, 'Origin not must be undefinied');
        assert(toBalance, 'Destination not must be undefinied');

        assert(!isNaN(amount), 'Amount must be a number');
        let amountNumber = parseFloat(amount);

        if (amountNumber > 0) {
            assert(fromAccount[fromBalance] >= amountNumber, 'Balance must be greater than amount');

            fromAccount[fromBalance] -= amountNumber;
            toAccount[toBalance] += amountNumber;
        }

        return [fromAccount, toAccount];
    }

    async transferTo(to, amount, balanceName) {
        assert(to, 'Destination wallet not must be undefinied');
        assert(balanceName, 'Balance name not must be undefinied');

        assert(!isNaN(amount), 'Amount must be a number');
        let amountNumber = parseFloat(amount);

        if (amountNumber > 0) { 
            to[balanceName] += amountNumber;
        }

        return to;
    }

    async buyCscoin(stub, to, amount) {
        assert.notEqual(to, undefined, 'Destination wallet cannot be undefined');
        assert.notEqual(amount, undefined, 'Amount cannot be undefined');
        assert.equal(isNaN(amount), false, 'Amount must be a number');

        amount = parseFloat(amount);
        assert.ok(amount > 0, 'Amount to transfer must be greather than zero');

        let destinationUser = await util.readAsset(stub, to);
        assert.equal(destinationUser.docType, 'user', 'Destination user not found');

        destinationUser = await this.transferTo(destinationUser, amount, "balance");

        await util.saveAsset(stub, destinationUser.id, destinationUser);

        return destinationUser;
    }

    async deleteBalanceTo(to, amount, balanceName) {
        assert(to, 'Destination wallet not must be undefinied');
        assert(balanceName, 'Balance name not must be undefinied');

        assert(!isNaN(amount), 'Amount must be a number');
        let amountNumber = parseFloat(amount);

        if (amountNumber > 0) { 
            to[balanceName] -= amountNumber;
        }

        return to;
    }

}


module.exports = {
    UserAsset
};