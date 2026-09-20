/**
 * Event Listener Service
 * Listens to blockchain events from PharmaSupplyChain.sol on Polygon Amoy testnet.
 * Uses ethers.js v6 to monitor contract events and persist them to MongoDB.
 * 
 * Features:
 *   - Real-time event capture for 5 contract events
 *   - BigInt → Number conversion for ethers v6 compatibility
 *   - GPS coordinate transformation (int256 * 1e6 → float)
 *   - Webhook alerting for critical failures
 *   - Graceful error handling
 */

require("dotenv").config();
const { ethers } = require("ethers");
const EventLog = require("../models/EventLog");
const contractABI = require("../abi/PharmaSupplyChain.json").abi;

let provider = null;
let contract = null;

/**
 * Send alert to external webhook on critical failures.
 * @param {string} errorMessage - Error description
 * @param {object} context - Additional context (optional)
 */
async function sendAlert(errorMessage, context = {}) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    // No webhook configured, skip alert
    return;
  }

  try {
    const fetch = (await import("node-fetch")).default;
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "blockchain-event-listener",
        error: errorMessage,
        timestamp: new Date().toISOString(),
        context
      }),
      timeout: 5000
    });
    console.log("Alert sent to webhook:", errorMessage);
  } catch (err) {
    console.error("Failed to send alert webhook:", err.message);
  }
}

/**
 * Start listening to blockchain events.
 * Connects to Polygon Amoy RPC and registers event handlers.
 */
function startListening() {
  // Validate environment variables
  if (!process.env.RPC_URL || !process.env.CONTRACT_ADDRESS) {
    console.warn("⚠️  EventListener: Missing RPC_URL or CONTRACT_ADDRESS — skipping blockchain event listener");
    return;
  }

  try {
    console.log("🔗 Initializing blockchain event listener...");

    // Initialize ethers.js v6 provider (NOT ethers.providers.JsonRpcProvider)
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // Create contract instance
    contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI,
      provider
    );

    // ────────────────────────────────────────────────────────────────────────
    // Event Handler: DrugCreated
    // ────────────────────────────────────────────────────────────────────────
    contract.on("DrugCreated", async (drugID, manufacturer, event) => {
      try {
        await EventLog.create({
          eventName: "DrugCreated",
          drugID,
          data: { manufacturer },
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber
        });
        console.log(`✅ Event saved: DrugCreated - ${drugID}`);
      } catch (err) {
        console.error("❌ EventLog save error (DrugCreated):", err.message);
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // Event Handler: DrugTransferred
    // ────────────────────────────────────────────────────────────────────────
    contract.on("DrugTransferred", async (drugID, from, to, lat, lng, timestamp, event) => {
      try {
        // Convert BigInt GPS coordinates (int256 * 1e6) to float
        const latFloat = Number(lat) / 1e6;
        const lngFloat = Number(lng) / 1e6;
        const timestampNum = Number(timestamp);

        await EventLog.create({
          eventName: "DrugTransferred",
          drugID,
          data: {
            from,
            to,
            lat: latFloat,
            lng: lngFloat,
            timestamp: timestampNum
          },
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber
        });
        console.log(`✅ Event saved: DrugTransferred - ${drugID} from ${from.slice(0, 8)}... to ${to.slice(0, 8)}...`);
      } catch (err) {
        console.error("❌ EventLog save error (DrugTransferred):", err.message);
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // Event Handler: RiskScoreUpdated
    // ────────────────────────────────────────────────────────────────────────
    contract.on("RiskScoreUpdated", async (drugID, riskScore, event) => {
      try {
        // Convert BigInt to Number
        const riskScoreNum = Number(riskScore);

        await EventLog.create({
          eventName: "RiskScoreUpdated",
          drugID,
          data: { riskScore: riskScoreNum },
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber
        });
        console.log(`✅ Event saved: RiskScoreUpdated - ${drugID} score=${riskScoreNum}`);
      } catch (err) {
        console.error("❌ EventLog save error (RiskScoreUpdated):", err.message);
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // Event Handler: DrugRecalled
    // ────────────────────────────────────────────────────────────────────────
    contract.on("DrugRecalled", async (drugID, timestamp, event) => {
      try {
        // Convert BigInt to Number
        const timestampNum = Number(timestamp);

        await EventLog.create({
          eventName: "DrugRecalled",
          drugID,
          data: { timestamp: timestampNum },
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber
        });
        console.log(`🚨 Event saved: DrugRecalled - ${drugID}`);
      } catch (err) {
        console.error("❌ EventLog save error (DrugRecalled):", err.message);
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // Event Handler: RoleAssigned
    // ────────────────────────────────────────────────────────────────────────
    contract.on("RoleAssigned", async (user, role, event) => {
      try {
        // Convert BigInt role to Number
        const roleNum = Number(role);

        await EventLog.create({
          eventName: "RoleAssigned",
          drugID: null, // No drug ID for role assignments
          data: { user, role: roleNum },
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber
        });
        console.log(`✅ Event saved: RoleAssigned - ${user.slice(0, 8)}... → role ${roleNum}`);
      } catch (err) {
        console.error("❌ EventLog save error (RoleAssigned):", err.message);
      }
    });

    // ────────────────────────────────────────────────────────────────────────
    // Provider Error Handler
    // ────────────────────────────────────────────────────────────────────────
    provider.on("error", async (error) => {
      console.error("🔴 Provider error:", error.message);
      await sendAlert("Blockchain provider connection error", {
        error: error.message,
        rpcUrl: process.env.RPC_URL
      });
    });

    console.log("✅ Blockchain event listener started");
    console.log(`   Contract: ${process.env.CONTRACT_ADDRESS}`);
    console.log(`   Network: Polygon Amoy`);
    console.log(`   Listening for: DrugCreated, DrugTransferred, RiskScoreUpdated, DrugRecalled, RoleAssigned`);

  } catch (err) {
    console.error("🔴 EventListener start error:", err.message);
    sendAlert("Failed to start blockchain event listener", {
      error: err.message,
      stack: err.stack
    });
  }
}

/**
 * Stop listening to blockchain events and clean up resources.
 */
function stopListening() {
  if (contract) {
    contract.removeAllListeners();
    console.log("Event listeners removed");
  }

  if (provider) {
    provider.destroy();
    console.log("Provider connection destroyed");
  }

  console.log("✅ Event listener stopped");
}

module.exports = { startListening, stopListening };
