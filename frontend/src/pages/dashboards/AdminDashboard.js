/**
 * AdminDashboard.js
 * Full admin dashboard with role assignment, drug recall, and real-time event feed.
 * 
 * Features:
 *   - Role assignment form (assign blockchain roles to wallet addresses)
 *   - Drug recall form (admin can recall drugs from circulation)
 *   - Real-time blockchain event feed with auto-refresh every 30 seconds
 *   - Color-coded event types for visual clarity
 *   - Dark mode support
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import api from "../../services/api";

const ROLE_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "Admin" },
  { value: 2, label: "Manufacturer" },
  { value: 3, label: "Distributor" },
  { value: 4, label: "Pharmacy" },
  { value: 5, label: "Consumer" }
];

const EVENT_COLORS = {
  DrugCreated: "#e3f2fd",
  DrugTransferred: "#e8f5e9",
  DrugRecalled: "#ffebee",
  RiskScoreUpdated: "#fff3e0",
  RoleAssigned: "#f3e5f5"
};

const EVENT_COLORS_DARK = {
  DrugCreated: "#1e3a5f",
  DrugTransferred: "#1e4620",
  DrugRecalled: "#4a1a1a",
  RiskScoreUpdated: "#4a3319",
  RoleAssigned: "#3a1e4a"
};

export default function AdminDashboard() {
  const { wallet } = useAuth();
  const { darkMode } = useTheme();

  // State for role assignment form
  const [roleForm, setRoleForm] = useState({ address: "", role: 1 });
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState("");
  const [roleError, setRoleError] = useState("");

  // State for drug recall form
  const [recallForm, setRecallForm] = useState({ drugID: "" });
  const [recallLoading, setRecallLoading] = useState(false);
  const [recallSuccess, setRecallSuccess] = useState("");
  const [recallError, setRecallError] = useState("");

  // State for event feed
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");

  /**
   * Fetch blockchain events from API
   */
  const fetchEvents = async () => {
    try {
      const response = await api.get("/api/events?limit=20");
      setEvents(response.data.events || []);
      setEventsError("");
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setEventsError(err.response?.data?.error || "Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  };

  /**
   * Auto-refresh events every 30 seconds
   */
  useEffect(() => {
    fetchEvents();
    const intervalId = setInterval(fetchEvents, 30000);
    return () => clearInterval(intervalId);
  }, []);

  /**
   * Handle role assignment form submission
   */
  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setRoleLoading(true);
    setRoleError("");
    setRoleSuccess("");

    try {
      const response = await api.post("/admin/assignRole", {
        address: roleForm.address,
        role: parseInt(roleForm.role)
      });

      setRoleSuccess(`Role assigned successfully! Tx: ${response.data.txHash}`);
      setRoleForm({ address: "", role: 1 });

      // Refresh events to show new RoleAssigned event
      setTimeout(fetchEvents, 2000);
    } catch (err) {
      console.error("Role assignment error:", err);
      setRoleError(err.response?.data?.error || "Failed to assign role");
    } finally {
      setRoleLoading(false);
    }
  };

  /**
   * Handle drug recall form submission
   */
  const handleRecallSubmit = async (e) => {
    e.preventDefault();

    // Confirmation dialog
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to RECALL drug ${recallForm.drugID}?\n\nThis action will mark the drug as recalled on the blockchain and cannot be undone.`
    );

    if (!confirmed) return;

    setRecallLoading(true);
    setRecallError("");
    setRecallSuccess("");

    try {
      const response = await api.post("/admin/recall", {
        drugID: recallForm.drugID
      });

      setRecallSuccess(`Drug recalled successfully! Tx: ${response.data.txHash}`);
      setRecallForm({ drugID: "" });

      // Refresh events to show new DrugRecalled event
      setTimeout(fetchEvents, 2000);
    } catch (err) {
      console.error("Drug recall error:", err);
      setRecallError(err.response?.data?.error || "Failed to recall drug");
    } finally {
      setRecallLoading(false);
    }
  };

  /**
   * Format event details for display based on event type
   */
  const formatEventDetails = (event) => {
    switch (event.eventName) {
      case "DrugCreated":
        return `Manufacturer: ${event.data.manufacturer?.slice(0, 10)}...`;
      
      case "DrugTransferred":
        return `From ${event.data.from?.slice(0, 8)}... → To ${event.data.to?.slice(0, 8)}... @ (${event.data.lat?.toFixed(4)}, ${event.data.lng?.toFixed(4)})`;
      
      case "RiskScoreUpdated":
        return `Risk Score: ${event.data.riskScore}`;
      
      case "DrugRecalled":
        return "Recalled";
      
      case "RoleAssigned":
        return `User ${event.data.user?.slice(0, 10)}... → Role ${event.data.role}`;
      
      default:
        return JSON.stringify(event.data);
    }
  };

  /**
   * Get background color for event row
   */
  const getEventColor = (eventName) => {
    const colors = darkMode ? EVENT_COLORS_DARK : EVENT_COLORS;
    return colors[eventName] || (darkMode ? "#2a2a2a" : "#f9f9f9");
  };

  const styles = getStyles(darkMode);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>🛡️ Admin Dashboard</h1>
        <p style={styles.subtitle}>Wallet: <code style={styles.code}>{wallet}</code></p>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* Section 1: Role Assignment */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👤 Assign Role</h2>
          <form onSubmit={handleRoleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Wallet Address</label>
              <input
                type="text"
                style={styles.input}
                value={roleForm.address}
                onChange={(e) => setRoleForm({ ...roleForm, address: e.target.value })}
                placeholder="0x..."
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Role</label>
              <select
                style={styles.select}
                value={roleForm.role}
                onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" style={styles.button} disabled={roleLoading}>
              {roleLoading ? "Assigning..." : "Assign Role"}
            </button>
          </form>

          {roleSuccess && <div style={styles.success}>{roleSuccess}</div>}
          {roleError && <div style={styles.error}>{roleError}</div>}
        </div>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* Section 2: Drug Recall */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🚨 Recall Drug</h2>
          <form onSubmit={handleRecallSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Drug ID</label>
              <input
                type="text"
                style={styles.input}
                value={recallForm.drugID}
                onChange={(e) => setRecallForm({ drugID: e.target.value })}
                placeholder="Enter Drug ID"
                required
              />
            </div>

            <button type="submit" style={styles.buttonDanger} disabled={recallLoading}>
              {recallLoading ? "Recalling..." : "Recall Drug"}
            </button>
          </form>

          {recallSuccess && <div style={styles.success}>{recallSuccess}</div>}
          {recallError && <div style={styles.error}>{recallError}</div>}
        </div>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* Section 3: Recent Blockchain Events */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📡 Recent Blockchain Events</h2>
          <p style={styles.refreshNote}>Auto-refreshes every 30 seconds</p>

          {eventsLoading ? (
            <div style={styles.loadingContainer}>
              <LoadingSpinner size="medium" message="Loading events..." />
            </div>
          ) : eventsError ? (
            <div style={styles.error}>{eventsError}</div>
          ) : events.length === 0 ? (
            <div style={styles.emptyState}>
              <p>📭 No events recorded yet</p>
              <p style={styles.emptyHint}>
                Events will appear here once blockchain transactions occur
              </p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Event Type</th>
                    <th style={styles.th}>Drug ID</th>
                    <th style={styles.th}>Details</th>
                    <th style={styles.th}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, idx) => (
                    <tr
                      key={event._id || idx}
                      style={{
                        ...styles.tr,
                        backgroundColor: getEventColor(event.eventName)
                      }}
                    >
                      <td style={styles.td}>
                        <strong>{event.eventName}</strong>
                      </td>
                      <td style={styles.td}>
                        {event.drugID || <span style={styles.na}>N/A</span>}
                      </td>
                      <td style={styles.td}>{formatEventDetails(event)}</td>
                      <td style={styles.td}>
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Styles with dark mode support
 */
function getStyles(darkMode) {
  const bgPage = darkMode ? "#121212" : "#f5f7fa";
  const bgContainer = darkMode ? "#1e1e1e" : "#ffffff";
  const bgSection = darkMode ? "#2a2a2a" : "#f9fafb";
  const textPrimary = darkMode ? "#e0e0e0" : "#1f2937";
  const textSecondary = darkMode ? "#b0b0b0" : "#6b7280";
  const border = darkMode ? "#3a3a3a" : "#e5e7eb";
  const inputBg = darkMode ? "#333333" : "#ffffff";
  const inputBorder = darkMode ? "#4a4a4a" : "#d1d5db";

  return {
    page: {
      minHeight: "100vh",
      backgroundColor: bgPage,
      padding: "32px 16px",
      fontFamily: "'Segoe UI', Arial, sans-serif"
    },
    container: {
      maxWidth: "1200px",
      margin: "0 auto"
    },
    title: {
      fontSize: "32px",
      fontWeight: "bold",
      color: textPrimary,
      marginBottom: "8px"
    },
    subtitle: {
      fontSize: "14px",
      color: textSecondary,
      marginBottom: "32px"
    },
    code: {
      backgroundColor: bgSection,
      padding: "4px 8px",
      borderRadius: "4px",
      fontFamily: "monospace",
      fontSize: "13px"
    },
    section: {
      backgroundColor: bgContainer,
      borderRadius: "12px",
      padding: "24px",
      marginBottom: "24px",
      boxShadow: darkMode
        ? "0 2px 8px rgba(0,0,0,0.3)"
        : "0 2px 8px rgba(0,0,0,0.1)"
    },
    sectionTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: textPrimary,
      marginBottom: "16px"
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    },
    label: {
      fontSize: "14px",
      fontWeight: "500",
      color: textPrimary
    },
    input: {
      padding: "10px 12px",
      fontSize: "14px",
      border: `1px solid ${inputBorder}`,
      borderRadius: "6px",
      backgroundColor: inputBg,
      color: textPrimary,
      outline: "none"
    },
    select: {
      padding: "10px 12px",
      fontSize: "14px",
      border: `1px solid ${inputBorder}`,
      borderRadius: "6px",
      backgroundColor: inputBg,
      color: textPrimary,
      outline: "none",
      cursor: "pointer"
    },
    button: {
      padding: "12px 20px",
      fontSize: "14px",
      fontWeight: "600",
      color: "#ffffff",
      backgroundColor: "#4f46e5",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      transition: "background-color 0.2s"
    },
    buttonDanger: {
      padding: "12px 20px",
      fontSize: "14px",
      fontWeight: "600",
      color: "#ffffff",
      backgroundColor: "#dc2626",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      transition: "background-color 0.2s"
    },
    success: {
      padding: "12px",
      backgroundColor: "#d1fae5",
      color: "#065f46",
      border: "1px solid #6ee7b7",
      borderRadius: "6px",
      fontSize: "13px",
      marginTop: "12px"
    },
    error: {
      padding: "12px",
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      border: "1px solid "#fca5a5",
      borderRadius: "6px",
      fontSize: "13px",
      marginTop: "12px"
    },
    refreshNote: {
      fontSize: "13px",
      color: textSecondary,
      marginBottom: "16px",
      fontStyle: "italic"
    },
    loadingContainer: {
      display: "flex",
      justifyContent: "center",
      padding: "40px 0"
    },
    emptyState: {
      textAlign: "center",
      padding: "40px 20px",
      color: textSecondary
    },
    emptyHint: {
      fontSize: "13px",
      marginTop: "8px"
    },
    tableWrapper: {
      overflowX: "auto"
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "14px"
    },
    th: {
      textAlign: "left",
      padding: "12px",
      borderBottom: `2px solid ${border}`,
      fontWeight: "600",
      color: textPrimary,
      backgroundColor: bgSection
    },
    tr: {
      transition: "background-color 0.2s"
    },
    td: {
      padding: "12px",
      borderBottom: `1px solid ${border}`,
      color: textPrimary
    },
    na: {
      color: textSecondary,
      fontStyle: "italic"
    }
  };
}
