const { FileSystemWallet, X509WalletMixin, Gateway } = require('fabric-network');
const Fabric_Client = require('fabric-client');
const Fabric_CA_Client = require('fabric-ca-client');

const fs = require('fs');
const path = require('path');
const assert = require('assert');


class User {

    async create(userId, rol) {

        let fabric_client = new Fabric_Client();
        let fabric_ca_client = null;
        let admin_user = null;
        let member_user = null;
        // let store_path = path.resolve('wallets/' + userId);
        var store_path = path.join(__dirname, "../../../../../.hfc-key-store")

        // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
        Fabric_Client.newDefaultKeyValueStore({
            path: store_path
        }).then(async (state_store) => {
            // assign the store to the fabric client
            fabric_client.setStateStore(state_store);

            let crypto_suite = Fabric_Client.newCryptoSuite();
            // use the same location for the state store (where the users' certificate are kept)
            // and the crypto store (where the users' keys are kept)
            let crypto_store = Fabric_Client.newCryptoKeyStore({ path: store_path });
            crypto_suite.setCryptoKeyStore(crypto_store);
            fabric_client.setCryptoSuite(crypto_suite);
            var tlsOptions = {
                trustedRoots: [],
                verify: true
            };
            // be sure to change the http to https when the CA is running TLS enabled
            fabric_ca_client = new Fabric_CA_Client('http://localhost:17054', null, '', crypto_suite);

            // first check to see if the admin is already enrolled

            // return fabric_client.getUserContext('admin', true);
            return await this.getAdmin();


        }).then((user_from_store) => {
            console.log('user_from_store: ', user_from_store);
            if (user_from_store && user_from_store.isEnrolled()) {
                console.log('Successfully loaded admin from persistence');
                admin_user = user_from_store;
            } else {
                throw new Error('Failed to get admin.... run enrollAdmin.js');
            }

            // at this point we should have the admin user
            // first need to register the user with the CA server
            return fabric_ca_client.register({ enrollmentID: userId, affiliation: '', role: rol }, admin_user);
        }).then((secret) => {
            // next we need to enroll the user with CA server
            console.log('Successfully registered ' + userId + ' - secret:' + secret);

            return fabric_ca_client.enroll({ enrollmentID: userId, enrollmentSecret: secret });
        }).then((enrollment) => {
            console.log('Successfully enrolled member user ' + userId);
            return fabric_client.createUser(
                {
                    username: userId,
                    mspid: 'Org1MSP',
                    cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
                });
        }).then((user) => {
            member_user = user;

            return fabric_client.setUserContext(member_user);
        }).then(async () => {
            let userCtx1 = fabric_client.getUserContext();

            let userCtx = await fabric_client.getUserContext();
            console.log(userId + ' was successfully registered and enrolled and is ready to intreact with the fabric network');

        }).catch((err) => {
            console.error('Failed to register: ' + err);
            if (err.toString().indexOf('Authorization') > -1) {
                console.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
                    'Try again after deleting the contents of the store directory ' + store_path);
            }
        });
    }

    async getAdmin() {
        let ccpPath = path.join(process.cwd(), '/network/runtime/gateways/local_fabric.json');
        const ccpJSON = fs.readFileSync(ccpPath);
        const ccp = JSON.parse(ccpJSON);

        let walletPathAdmin = path.join(process.cwd(), '/network/local_fabric_wallet');
        const wallet = new FileSystemWallet(walletPathAdmin);
        console.log('Wallet path admin: ', walletPathAdmin);

        const adminExists = await wallet.exists('admin');
        assert(adminExists, 'An identity for the admin user "admin" does not exist in the wallet');

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: false } });
        //const ca = gateway.getClient().getCertificateAuthority();
        const adminIdentity = await gateway.getCurrentIdentity();
        return adminIdentity;
    };

    async createIdentityAndWallet(userId) {
        console.info('------------------process.cwd(): ', process.cwd());
        var ca2 = new FabricCAServices("http://localhost:17054")

        let ccpPath = path.join(process.cwd(), '/network/runtime/gateways/local_fabric.json');
        const ccpJSON = fs.readFileSync(ccpPath);
        const ccp = JSON.parse(ccpJSON);

        let walletPathAdmin = path.join(process.cwd(), '/network/local_fabric_wallet');
        const wallet = new FileSystemWallet(walletPathAdmin);
        console.log('Wallet path admin: ', walletPathAdmin);

        let walletPathUser = path.join(process.cwd(), '/wallets/local_fabric_wallet_' + userId);
        const wallet2 = new FileSystemWallet(walletPathUser);
        console.log('Wallet path user: ', walletPathUser);

        const adminExists = await wallet.exists('admin');
        assert(adminExists, 'An identity for the admin user "admin" does not exist in the wallet');

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: false } })
            .then(async function () {
                const ca = gateway.getClient().getCertificateAuthority();
                const adminIdentity = gateway.getCurrentIdentity();
                console.info('CA and adminIdentity created');

                const userExists = await wallet2.exists(userId);
                if (userExists) {
                    console.log('An identity for the user ' + userId + ' already exists in the wallet');
                }
                else {
                    console.log(userId + ' no exist');
                    console.log('................', ca2);
                    console.log('----------------', ca);

                    let secret2 = await ca2.register({ affiliation: 'org1.department1', enrollmentID: userId, role: 'client' }, adminIdentity);
                    console.log('Secret2: ', secret);

                    let secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: userId, role: 'client' }, adminIdentity);
                    console.log('Secret: ', secret);

                    let enrollment = await ca.enroll({ enrollmentID: userId, enrollmentSecret: secret });
                    console.log('Enrollment: ', enrollment);

                    const userIdentity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
                    console.log('UserIdentity: ', userIdentity);

                    await wallet2.import(userId, userIdentity);
                    console.log('Successfully registered and enrolled admin user ' + userId + ' and imported it into the wallet');

                    return userId;
                }
            });
    };
}

module.exports = {
    User
};
