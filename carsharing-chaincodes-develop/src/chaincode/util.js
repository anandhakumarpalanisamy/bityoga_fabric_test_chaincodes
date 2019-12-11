const { ClientIdentity } = require('fabric-shim');
const assert = require('assert');


async function saveAsset(stub, id, asset) {
    let buffer = Buffer.from(JSON.stringify(asset));
    await stub.putState(id, buffer);
}

async function getUserLogged(stub) {
    let cid = new ClientIdentity(stub);
    let clientLogged = cid.getID();

    let buffer = Buffer.from(JSON.stringify(clientLogged));
    return buffer;
}

async function assetExists(stub, assetId) {
    let buffer = await stub.getState(assetId);
    return (!!buffer && buffer.length > 0);
}

async function readAsset(stub, assetId) {
    let exists = await assetExists(stub, assetId);
    assert.equal(exists, true, 'Asset not found');

    let buffer = await stub.getState(assetId);
    let asset = JSON.parse(buffer.toString());

    return asset;
}

async function deleteAsset(stub, assetId) {
    await stub.deleteState(assetId);
}

async function getQueryResultForQueryString(stub, queryString) {
    let resultsIterator = await stub.getQueryResult(queryString);
    let results = await getAllResults(resultsIterator, false);

    return results;
}

async function getAllResults(iterator, isHistory) {
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
            await iterator.close();
            return allResults;
        }
    }
}

async function validateCoordinate(coordinate) {
    assert.notEqual(coordinate, undefined, 'Location not must be undefined');
    assert.notEqual(coordinate.latitude, undefined, 'Latitude not must be undefined');
    assert.notEqual(coordinate.longitude, undefined, 'Longitude not must be undefined');

    // Validate latitude
    assert.equal(isNaN(coordinate.latitude), false, 'Latitude must be a number');
    assert.ok(coordinate.latitude >= -90, 'Latitude must be greater than -90');
    assert.ok(coordinate.latitude <= 90, 'Latitude  must be less than 90');

    // Validate longitude
    assert.equal(isNaN(coordinate.longitude), false, 'Longitude must be a number');
    assert.ok(coordinate.longitude >= -180, 'Longitude must be greater than -180');
    assert.ok(coordinate.longitude <= 180, 'Longitude  must be less than 180');
}

module.exports = {
    saveAsset,
    getUserLogged,
    assetExists,
    deleteAsset,
    readAsset,
    getQueryResultForQueryString,
    validateCoordinate
};