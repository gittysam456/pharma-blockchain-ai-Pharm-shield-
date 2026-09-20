# Deployed Contract Addresses

This document tracks the deployed smart contracts for the PharmaShield anti-counterfeit system.

## PharmaSupplyChain.sol — Polygon Amoy Testnet

| Version | Address | Network | Explorer |
|---------|---------|---------|----------|
| v2.0 (GPS + Recall + AI Risk) | `[YOUR_CONTRACT_ADDRESS_HERE]` | Polygon Amoy | https://amoy.polygonscan.com/address/[YOUR_CONTRACT_ADDRESS_HERE] |

> **⚠️ Note**: Replace `[YOUR_CONTRACT_ADDRESS_HERE]` with the actual `CONTRACT_ADDRESS` from your `.env` file before committing to the repository.

## Contract Features

**PharmaSupplyChain v2.0** includes the following capabilities:

### Core Features
- **Drug Registration**: Create drugs with unique ID, batch number, and expiry date
- **GPS-Tracked Transfers**: Record custody changes with precise latitude/longitude coordinates (stored as int256 * 1e6)
- **AI Risk Assessment**: Update and track risk scores (0-100) for each drug
- **Drug Recall System**: Admin can recall drugs from circulation
- **Role-Based Access Control**: 6 roles with different permissions

### Roles
- **None** (0): No permissions
- **Admin** (1): Full access, can assign roles and recall drugs
- **Manufacturer** (2): Can create drugs
- **Distributor** (3): Can transfer drugs
- **Pharmacy** (4): Can transfer drugs to consumers
- **Consumer** (5): Final recipient, can view drug history

### Blockchain Events
The contract emits the following events, which are captured by the event listener service:

1. **DrugCreated** — Drug registration by manufacturer
2. **DrugTransferred** — Custody change with GPS tracking
3. **RiskScoreUpdated** — AI risk score update
4. **DrugRecalled** — Admin recall action
5. **RoleAssigned** — Role assignment to wallet address

### On-Chain Data
- Full transfer history stored on-chain
- GPS coordinates for each transfer (int256 format)
- Risk score per drug (0-100 scale)
- Recall status and timestamps
- Role assignments per wallet address

## Deployment Information

**Network**: Polygon Amoy Testnet  
**Chain ID**: 80002  
**RPC URL**: https://rpc-amoy.polygon.technology  
**Block Explorer**: https://amoy.polygonscan.com  

## Event Listener

The backend service automatically listens to all contract events and persists them to MongoDB for:
- Real-time dashboard updates
- Event history tracking
- Analytics and reporting
- Audit trail

**Monitored Events**: All 5 contract events (DrugCreated, DrugTransferred, RiskScoreUpdated, DrugRecalled, RoleAssigned)  
**Storage**: MongoDB EventLog collection  
**API**: GET /api/events with filtering and pagination

## Integration Guide

To integrate with this contract:

1. Set environment variables in `.env`:
   ```
   RPC_URL=https://rpc-amoy.polygon.technology
   CONTRACT_ADDRESS=[your deployed address]
   PRIVATE_KEY=[your wallet private key]
   ```

2. The backend automatically connects on MongoDB connection success

3. Access events via REST API: `GET /api/events?limit=20`

4. View real-time events in Admin Dashboard at `/admin`

## Version History

### v2.0 - Current
- GPS tracking for transfers
- Drug recall functionality
- AI risk score integration
- Role-based access control
- Full event emission for off-chain monitoring

---

**Last Updated**: [Current Date]  
**Maintained By**: PharmaShield Development Team
