import "./App.css";
import React, { useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PublicVerifyPage from "./pages/PublicVerifyPage";
import { BrowserProvider } from "ethers";
import QRGenerator from "./components/QRGenerator";
import QRScannerModal from "./components/QRScannerModal";
import {
  generateDrugQR,
  loginWithWallet,
} from "./services/api";

function App() {
  // ============================================================
  // BASIC DRUG STATE
  // ============================================================

  const [drugID, setDrugID] = useState("");
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");

  const [result, setResult] = useState(null);
  const [qr, setQr] = useState("");

  const [scannerOn, setScannerOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // ============================================================
  // WALLET / AUTH STATE
  // ============================================================

  const [token, setToken] = useState(
    () => localStorage.getItem("pharmachain_token") || ""
  );

  const [walletAddress, setWalletAddress] = useState(
    () => localStorage.getItem("pharmachain_wallet") || ""
  );

  const [role, setRole] = useState(
    () => localStorage.getItem("pharmachain_role") || ""
  );

  // ============================================================
  // DASHBOARD STATE
  // ============================================================

  const [stats, setStats] = useState({
    total: 0,
    expired: 0,
    safe: 0,
  });

  // ============================================================
  // CONNECT METAMASK + LOGIN
  // ============================================================

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert(
          "MetaMask is not installed. Please install MetaMask first."
        );
        return;
      }

      setLoading(true);

      // Create ethers provider
      const provider = new BrowserProvider(window.ethereum);

      // Ask MetaMask for wallet connection
      const accounts = await provider.send(
        "eth_requestAccounts",
        []
      );

      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet account found.");
      }

      const connectedWallet = accounts[0];

      // Get signer
      const signer = await provider.getSigner();

      // Backend expects this exact message format:
      // "Login to PharmaChain at <timestamp>"
      const message = `Login to PharmaChain at ${Date.now()}`;

      // Ask MetaMask to sign the message
      const signature = await signer.signMessage(message);

      // Send wallet + signature to backend
      const loginData = await loginWithWallet(
        connectedWallet,
        signature,
        message
      );

      // Save authentication information in React state
      setToken(loginData.token);
      setWalletAddress(loginData.walletAddress);
      setRole(loginData.role);

      // Save authentication information locally
      localStorage.setItem(
        "pharmachain_token",
        loginData.token
      );

      localStorage.setItem(
        "pharmachain_wallet",
        loginData.walletAddress
      );

      localStorage.setItem(
        "pharmachain_role",
        loginData.role
      );

      alert(
        `Wallet connected successfully!\n\nRole: ${loginData.role}`
      );
    } catch (err) {
      console.error("Wallet login error:", err);

      // User rejected MetaMask request
      if (err.code === 4001) {
        alert("MetaMask request was rejected.");
        return;
      }

      alert(
        err.response?.data?.error ||
          err.message ||
          "Wallet login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const logoutWallet = () => {
    localStorage.removeItem("pharmachain_token");
    localStorage.removeItem("pharmachain_wallet");
    localStorage.removeItem("pharmachain_role");

    setToken("");
    setWalletAddress("");
    setRole("");

    alert("Wallet session cleared.");
  };

  // ============================================================
  // CREATE DRUG
  // ============================================================

  const createDrug = async () => {
    if (!drugID.trim()) {
      alert("Please enter Drug ID.");
      return;
    }

    if (!name.trim()) {
      alert("Please enter drug name.");
      return;
    }

    if (!batch.trim()) {
      alert("Please enter batch number.");
      return;
    }

    if (!expiry) {
      alert("Please select expiry date.");
      return;
    }

    const [year, month, day] = expiry.split("-");

    const expiryTimestamp = Math.floor(
      new Date(
        year,
        month - 1,
        day
      ).getTime() / 1000
    );

    try {
      setLoading(true);

      await axios.post(
        "https://pharma-backend-foox.onrender.com/createDrug",
        {
          drugID: drugID.trim(),
          name: name.trim(),
          batch: batch.trim(),
          expiry: expiryTimestamp,
        }
      );

      alert("✅ Drug Created Successfully!");
    } catch (err) {
      console.error("Create drug error:", err);

      alert(
        err.response?.data?.error ||
          "Error creating drug."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GET DRUG
  // ============================================================

  const getDrug = async () => {
    if (!drugID.trim()) {
      alert("Please enter Drug ID.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(
        `https://pharma-backend-foox.onrender.com/getDrug/${encodeURIComponent(
          drugID.trim()
        )}`
      );

      setResult(res.data);
      updateStats(res.data);
    } catch (err) {
      console.error("Get drug error:", err);

      alert(
        err.response?.data?.error ||
          "❌ Drug not found."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GENERATE QR
  // Requires JWT authentication
  // ============================================================

  const generateQR = async () => {
    if (!drugID.trim()) {
      alert("Please enter a Drug ID.");
      return;
    }

    // QR endpoint requires authentication
    if (!token) {
      alert(
        "Please connect your MetaMask wallet before generating a QR code."
      );
      return;
    }

    try {
      setLoading(true);

      const data = await generateDrugQR(
        drugID.trim(),
        token
      );

      setQr(data.qr);

      alert("✅ QR code generated successfully!");
    } catch (err) {
      console.error("Generate QR error:", err);

      // JWT missing/expired
      if (err.response?.status === 401) {
        localStorage.removeItem(
          "pharmachain_token"
        );

        setToken("");

        alert(
          "Your login session has expired. Please connect your wallet again."
        );

        return;
      }

      // User doesn't have Manufacturer/Admin role
      if (err.response?.status === 403) {
        alert(
          err.response?.data?.error ||
            "Only Manufacturer or Admin can generate QR codes."
        );

        return;
      }

      // Drug doesn't exist
      if (err.response?.status === 404) {
        alert(
          err.response?.data?.error ||
            "Drug was not found on the blockchain."
        );

        return;
      }

      alert(
        err.response?.data?.error ||
          "Failed to generate QR code."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // DOWNLOAD QR
  // ============================================================

  const downloadQR = () => {
    if (!qr) {
      alert("Please generate a QR code first.");
      return;
    }

    const link = document.createElement("a");

    link.href = qr;
    link.download = `${drugID || "drug"}-QR.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================
  // GET DRUG AFTER QR SCAN
  // ============================================================

  const getDrugFromScan = async (id) => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(
        `https://pharma-backend-foox.onrender.com/getDrug/${encodeURIComponent(
          id
        )}`
      );

      setDrugID(id);
      setResult(res.data);

      updateStats(res.data);
    } catch (err) {
      console.error("Scanned drug error:", err);

      alert(
        err.response?.data?.error ||
          "Drug not found."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLE QR SCAN
  // ============================================================

  const handleScan = (id) => {
    setScannerOn(false);

    if (id) {
      getDrugFromScan(id);
    }
  };

  // ============================================================
  // STATUS
  // ============================================================

  const getStatus = () => {
    if (!result) {
      return "";
    }

    const currentTime = Math.floor(
      Date.now() / 1000
    );

    const expiryTime = Number(
      result.expiryDate
    );

    const risk = Number(
      result.riskScore
    );

    if (expiryTime < currentTime) {
      return "EXPIRED";
    }

    if (risk > 50) {
      return "HIGH RISK";
    }

    return "AUTHENTIC";
  };

  // ============================================================
  // STATUS COLOR
  // ============================================================

  const getStatusColor = () => {
    const status = getStatus();

    if (status === "AUTHENTIC") {
      return "green";
    }

    if (status === "EXPIRED") {
      return "orange";
    }

    return "red";
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "N/A";
    }

    const date = new Date(
      Number(timestamp) * 1000
    );

    return date.toDateString();
  };

  // ============================================================
  // UPDATE DASHBOARD STATS
  // ============================================================

  const updateStats = (data) => {
    if (!data) {
      return;
    }

    const currentTime = Math.floor(
      Date.now() / 1000
    );

    const expiryTime = Number(
      data.expiryDate
    );

    setStats((prev) => ({
      total: prev.total + 1,

      expired:
        expiryTime < currentTime
          ? prev.expired + 1
          : prev.expired,

      safe:
        expiryTime >= currentTime
          ? prev.safe + 1
          : prev.safe,
    }));
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      className={`container ${
        darkMode ? "dark" : ""
      }`}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <h1 style={{ marginBottom: "10px" }}>
        💊 Pharma Blockchain System
      </h1>

      <p style={{ opacity: 0.7 }}>
        Secure Drug Verification using
        Blockchain & QR
      </p>

      {/* ======================================================
          DARK MODE
      ====================================================== */}

      <button
        onClick={() =>
          setDarkMode(!darkMode)
        }
      >
        {darkMode
          ? "☀️ Light Mode"
          : "🌙 Dark Mode"}
      </button>

      {/* ======================================================
          WALLET LOGIN
      ====================================================== */}

      <div
        className="card"
        style={{ marginTop: "15px" }}
      >
        <h3>🦊 Wallet Authentication</h3>

        {!walletAddress ? (
          <>
            <p>
              Connect your MetaMask wallet to
              generate authenticated QR codes.
            </p>

            <button
              onClick={connectWallet}
              disabled={loading}
            >
              🦊 Connect MetaMask
            </button>
          </>
        ) : (
          <>
            <p>
              <b>Wallet:</b>{" "}
              {walletAddress.slice(0, 6)}
              ...
              {walletAddress.slice(-4)}
            </p>

            <p>
              <b>Role:</b>{" "}
              {role || "Unknown"}
            </p>

            <button
              onClick={logoutWallet}
              disabled={loading}
            >
              Logout
            </button>
          </>
        )}
      </div>

      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading && (
        <p>⏳ Loading...</p>
      )}

      {/* ======================================================
          DASHBOARD
      ====================================================== */}

      <div className="card">
        <h3>📊 Dashboard</h3>

        <p>
          Total Checked: {stats.total}
        </p>

        <p>
          Safe Drugs: {stats.safe}
        </p>

        <p>
          Expired Drugs: {stats.expired}
        </p>
      </div>

      {/* ======================================================
          CREATE DRUG
      ====================================================== */}

      <div className="card">
        <h3>🧾 Create Drug</h3>

        <input
          placeholder="Drug ID"
          value={drugID}
          onChange={(e) =>
            setDrugID(e.target.value)
          }
        />

        <input
          placeholder="Name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        <input
          placeholder="Batch"
          value={batch}
          onChange={(e) =>
            setBatch(e.target.value)
          }
        />

        <input
          type="date"
          value={expiry}
          onChange={(e) =>
            setExpiry(e.target.value)
          }
        />

        <button
          onClick={createDrug}
          disabled={loading}
        >
          Create Drug
        </button>
      </div>

      {/* ======================================================
          GET / VERIFY DRUG
      ====================================================== */}

      <div className="card">
        <h3>🔍 Get Drug</h3>

        <input
          placeholder="Drug ID"
          value={drugID}
          onChange={(e) =>
            setDrugID(e.target.value)
          }
        />

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "10px",
          }}
         >
          <button
            onClick={getDrug}
            disabled={loading}
         >
            Get Drug
          </button>

          <button
            onClick={generateQR}
            disabled={loading}
         >
            Generate QR
          </button>

          <button
            onClick={() => setScannerOn(true)}
            disabled={loading}
         >
            📷 Scan QR
          </button>
        </div>

        {/* ==================================================
            QR SCANNER
        ================================================== */}

        <QRScannerModal
          isOpen={scannerOn}
          onScan={handleScan}
          onClose={() => setScannerOn(false)}
        />
      </div>

      {/* ======================================================
          GENERATED QR
      ====================================================== */}

      {qr && (
        <div className="card">
          <h3>📱 QR Code</h3>

          <img
            src={qr}
            alt="Drug Verification QR Code"
            style={{
              maxWidth: "300px",
              width: "100%",
            }}
          />

          <br />

          <button
            onClick={downloadQR}
            disabled={loading}
          >
            ⬇️ Download QR
          </button>
        </div>
      )}

      {/* ======================================================
          DRUG INFORMATION
      ====================================================== */}

      {result && (
        <div className="card">
          <h3>📦 Drug Info</h3>

          <p>
            <b>ID:</b>{" "}
            {result.drugID}
          </p>

          <p>
            <b>Name:</b>{" "}
            {result.name}
          </p>

          <p>
            <b>Batch:</b>{" "}
            {result.batchNumber}
          </p>

          <p>
            <b>Owner:</b>{" "}
            {result.currentOwner}
          </p>

          <p>
            <b>Expiry:</b>{" "}
            {formatDate(
              result.expiryDate
            )}
          </p>

          <p>
            <b>Risk Score:</b>{" "}
            {result.riskScore}
          </p>

          <p>
            <b>Status:</b>{" "}
            <span
              className={`status ${getStatus()
                .toLowerCase()
                .replace(" ", "-")}`}
              style={{
                color: getStatusColor(),
              }}
            >
              {getStatus()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/verify/:drugID"
          element={<PublicVerifyPage />}
        />

        <Route
          path="*"
          element={<App />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
