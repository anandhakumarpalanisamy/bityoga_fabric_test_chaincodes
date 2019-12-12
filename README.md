# bityoga_fabric_test_chaincodes
Chaincodes to test bityoga hyperledger fabric environment


# Prerequisite
* Hyper ledger fabric should be up and running (https://github.com/achak1987/fabric_as_code.git)
 * ssh into the worker machine
   * **Example** - ssh root@165.22.198.81
 * Get into CLI container shell
   * **Command** - docker exec -it $(docker ps -qf "name=^CLI")  bash
 * cd /root/CLI/chaincodes
 * git clone https://github.com/anandhakumarpalanisamy/bityoga_fabric_test_chaincodes.git
 * cd /root/CLI/chaincodes/bityoga_fabric_test_chaincodes



# Instructions

* **cd CHAIN_CODE_DIR/shell_scripts**
  * **Example** - cd bank_chaincode/shell_scripts
 * **Install chaincode**  - bash install.sh
 * **Instantiate chaincode**  - bash instantiate.sh
 * **GET requeston on chaincode**  - bash get.sh
 * **PUT request on chaincode** - bash put.sh
 
