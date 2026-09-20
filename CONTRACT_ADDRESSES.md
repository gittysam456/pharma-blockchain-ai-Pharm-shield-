# Deployed Contract Addresses

## PharmaSupplyChain.sol — Polygon Amoy Testnet

| Version | Contract Address | Network | Features |
|---------|-----------------|---------|----------|
| v2.0 | 0xBA9FD3EAafB01208704a028e488a995CC332e0Fb | Polygon Amoy Testnet | GPS tracking, Recall, AI Risk Score, 6 Roles |

## Explorer Links
- Contract: https://amoy.polygonscan.com/address/0xBA9FD3EAafB01208704a028e488a995CC332e0Fb

## Contract Functions
- createDrug(drugID, name, batchNumber, expiryDate)
- transferDrug(drugID, newOwner, lat, lng) — GPS coordinates as int256 * 1e6
- recallDrug(drugID)
- updateRiskScore(drugID, riskScore)
- assignRole(address, role) — roles: 0=None,1=Admin,2=Manufacturer,3=Distributor,4=Pharmacy,5=Consumer
- getDrug(drugID)
- getDrugStatus(drugID) — returns 0=Active,1=Recalled,2=Expired
- getTransferHistory(drugID)
- getTransferCount(drugID)

## Role Enum Values
| Role | Value |
|------|-------|
| None | 0 |
| Admin | 1 |
| Manufacturer | 2 |
| Distributor | 3 |
| Pharmacy | 4 |
| Consumer | 5 |
