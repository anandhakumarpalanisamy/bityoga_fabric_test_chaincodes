#!/bin/bash
set -x #echo on

export CORE_PEER_ADDRESS="peer2:7051"
export CORE_PEER_MSPCONFIGPATH="/root/admin/msp"
export CORE_PEER_TLS_ROOTCERT_FILE="/root/${PEER2_HOST}/tls-msp/tlscacerts/tls-${TLSCA_HOST}-7054.pem"
export CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS
export CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH
export CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE


peer chaincode invoke -C appchannel -n carcc -c '{"Args":["createCar","NO9276","Opel","Corsa","Blue","5","2019","1"]}' --tls --cafile ${CORE_PEER_TLS_ROOTCERT_FILE} &&
peer chaincode invoke -C appchannel -n carcc -c '{"Args":["createCar","NO9277","Jaguar","ftype","Black","5","2019","1"]}' --tls --cafile ${CORE_PEER_TLS_ROOTCERT_FILE} &&
peer chaincode invoke -C appchannel -n carcc -c '{"Args":["createCar","NO9278","Dacia","Duster","Green","5","2019","1"]}' --tls --cafile ${CORE_PEER_TLS_ROOTCERT_FILE} &&
peer chaincode invoke -C appchannel -n carcc -c '{"Args":["createCar","NO9279","Volvo","V90","White","5","2019","1"]}' --tls --cafile ${CORE_PEER_TLS_ROOTCERT_FILE}
