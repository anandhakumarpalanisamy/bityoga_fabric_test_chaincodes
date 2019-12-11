#!/bin/bash
set -x #echo on

export CORE_PEER_ADDRESS="peer2:7051"
export CORE_PEER_MSPCONFIGPATH="/root/admin/msp"
export CORE_PEER_TLS_ROOTCERT_FILE="/root/${PEER2_HOST}/tls-msp/tlscacerts/tls-${TLSCA_HOST}-7054.pem"
export CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS
export CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH
export CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE

peer chaincode instantiate -C appchannel -n carcc -v 1.0 -c '{"Args":["init"]}' -o ${ORDERER_HOST}:7050 --tls --cafile ${CORE_PEER_TLS_ROOTCERT_FILE}
