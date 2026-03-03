#!/usr/bin/env node

/**
 * Neat Pulse MCP Server
 *
 * A custom Model Context Protocol server that wraps the entire
 * Neat Pulse REST API, giving Claude (or any MCP client) the
 * ability to query devices, read sensor data, manage rooms,
 * locations, regions, users, and issue device commands.
 *
 * Environment variables:
 *   NEAT_PULSE_API_KEY  – Bearer token from Pulse Settings > API keys
 *   NEAT_PULSE_ORG_ID   – Organisation ID from Pulse Settings
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { NeatPulseClient } from "./client.js";

// ── Bootstrap ──────────────────────────────────────────────────────

const apiKey = process.env.NEAT_PULSE_API_KEY;
const orgId = process.env.NEAT_PULSE_ORG_ID;

if (!apiKey || !orgId) {
  console.error(
    "Error: NEAT_PULSE_API_KEY and NEAT_PULSE_ORG_ID environment variables are required."
  );
  process.exit(1);
}

const pulse = new NeatPulseClient({ apiKey, orgId });

const server = new McpServer({
  name: "neat-pulse",
  version: "1.0.0",
});

// ── Helper ─────────────────────────────────────────────────────────

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function error(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// ── Endpoints (Devices) Tools ──────────────────────────────────────

server.tool(
  "list_devices",
  "List all Neat devices in the organization. Returns each device's model, serial number, firmware version, online/offline status, and room/location assignment. Devices live inside rooms in the hierarchy: Region → Location → Room → Device. Use regionId or locationId to narrow results to a specific site.",
  {
    regionId: z.number().optional().describe("Filter by region ID"),
    locationId: z.number().optional().describe("Filter by location ID"),
  },
  async ({ regionId, locationId }) => {
    try {
      const data = await pulse.listEndpoints(regionId, locationId);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "get_device",
  "Get detailed info and status for a specific Neat device by its ID. Returns firmware version, connection state, paired devices, and room assignment. Use this to check if a device is online before rebooting or pushing config changes.",
  {
    id: z.string().describe("The endpoint/device ID"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.getEndpoint(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "get_device_settings",
  "Get the current settings and configuration for a specific device. Returns display, audio, network, and other settings. Always read settings before using apply_device_config so you know what is already configured.",
  {
    id: z.string().describe("The endpoint/device ID"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.getEndpointSettings(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "apply_device_config",
  "Push a new configuration to a device. Config is a JSON string of setting key/value pairs — only the keys you include will be changed. Use get_device_settings first to see the current config. After applying, consider rebooting the device with reboot_device if changes require it.",
  {
    id: z.string().describe("The endpoint/device ID"),
    config: z
      .string()
      .describe("JSON string of configuration settings to apply to the device"),
  },
  async ({ id, config }) => {
    try {
      const parsed = JSON.parse(config);
      const data = await pulse.applyEndpointConfig(id, parsed);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "reboot_device",
  "Reboot a device and any devices paired with it (e.g. a Neat Bar paired with a Neat Pad will both reboot). Use after applying config changes or to troubleshoot connectivity issues. Check the device is online first with get_device.",
  {
    id: z.string().describe("The endpoint/device ID to reboot"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.rebootEndpoint(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "delete_device",
  "Permanently unenroll a device from the organization. The device must be re-enrolled using a room's DEC to return to Pulse management. Use list_devices or get_device first to confirm the target device.",
  {
    id: z.string().describe("The endpoint/device ID to delete"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.deleteEndpoint(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── Sensor Data Tools ──────────────────────────────────────────────

server.tool(
  "get_device_sensors",
  "Get the most recent sensor data sample for a single device. Returns temperature (°C), humidity (%rH), CO2 (ppm), VOC, and people count. Not all sensors are available on every model. For room-level data that combines multiple devices, use get_room_sensors instead.",
  {
    id: z.string().describe("The endpoint/device ID"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.getEndpointSensorData(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "get_all_device_sensors",
  "Get the most recent sensor data for ALL devices in the organization. Returns temperature, humidity, CO2, VOC, and people count per device. Filter by regionId or locationId to scope to a specific site. For a room-level aggregated view, use get_all_room_sensors instead.",
  {
    regionId: z.number().optional().describe("Filter by region ID"),
    locationId: z.number().optional().describe("Filter by location ID"),
  },
  async ({ regionId, locationId }) => {
    try {
      const data = await pulse.getBulkSensorData(regionId, locationId);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "get_room_sensors",
  "Get aggregated sensor data for a room — the recommended method for room-level environmental monitoring. Combines data from all devices in the room. Returns temperature (°C), humidity (%rH), CO2 (ppm), VOC, and people count. Use list_rooms first to get the room ID.",
  {
    id: z.string().describe("The room ID"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.getRoomSensorData(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "get_all_room_sensors",
  "Get aggregated sensor data for ALL rooms in the organization. Best starting point for an org-wide environmental overview. Returns temperature, humidity, CO2, VOC, and people count per room.",
  {},
  async () => {
    try {
      const data = await pulse.getBulkRoomSensorData();
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── Room Tools ─────────────────────────────────────────────────────

server.tool(
  "list_rooms",
  "List all rooms in the organization. Returns each room's ID, name, location assignment, and Device Enrollment Code (DEC). Rooms contain devices and sit inside locations in the hierarchy: Region → Location → Room → Device. Use this to find room IDs needed by other tools.",
  {},
  async () => {
    try {
      const data = await pulse.listRooms();
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "get_room",
  "Get details for a specific room by ID. Returns the room name, location assignment, DEC code, and assigned devices.",
  {
    id: z.string().describe("The room ID"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.getRoom(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "create_room",
  "Create a new room. Returns the new room's ID and Device Enrollment Code (DEC). To provision a full room: 1) create_room with an optional locationId, 2) share the returned DEC to enroll devices on-site. Create rooms in bulk by calling this multiple times in parallel.",
  {
    name: z.string().describe("Name for the new room"),
    locationId: z.number().optional().describe("Location ID to assign the room to"),
  },
  async (args) => {
    try {
      const data = await pulse.createRoom(args);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "update_room",
  "Update an existing room's name or location assignment. Use get_room first to see current values. Provide only the fields you want to change.",
  {
    id: z.string().describe("The room ID to update"),
    name: z.string().optional().describe("New name"),
    locationId: z.number().optional().describe("New location ID"),
  },
  async ({ id, ...updates }) => {
    try {
      const data = await pulse.updateRoom(id, updates);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "delete_room",
  "Delete a room by ID. Devices in the room become unassigned but are NOT unenrolled from the organization. Use list_rooms first to confirm the target.",
  {
    id: z.string().describe("The room ID to delete"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.deleteRoom(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "regenerate_room_dec",
  "Regenerate the Device Enrollment Code (DEC) for a room. Invalidates the old code and returns a new one. Use if the DEC was compromised or expired. Already-enrolled devices are not affected.",
  {
    id: z.string().describe("The room ID"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.regenerateRoomDec(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── Location Tools ─────────────────────────────────────────────────

server.tool(
  "list_locations",
  "List all locations in the organization with their IDs, names, and region assignments. Locations sit between regions and rooms in the hierarchy: Region → Location → Room → Device. Use this to find location IDs for filtering devices/rooms or assigning new rooms.",
  {},
  async () => {
    try {
      const data = await pulse.listLocations();
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "create_location",
  "Create a new location. Returns the new location ID. To set up a new site from scratch: 1) create_region (if needed), 2) create_location with regionId, 3) create_room with the returned locationId.",
  {
    name: z.string().describe("Name for the new location"),
    regionId: z.number().optional().describe("Region ID to assign to"),
  },
  async (args) => {
    try {
      const data = await pulse.createLocation(args);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "update_location",
  "Update a location's name or reassign it to a different region. Provide only the fields you want to change.",
  {
    id: z.number().describe("The location ID to update"),
    name: z.string().optional().describe("New name"),
    regionId: z.number().optional().describe("New region ID"),
  },
  async ({ id, ...updates }) => {
    try {
      const data = await pulse.updateLocation(id, updates);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "delete_location",
  "Delete a location. Rooms in this location become unassigned (not deleted). Use list_locations first to confirm the target.",
  {
    id: z.number().describe("The location ID to delete"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.deleteLocation(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── Region Tools ───────────────────────────────────────────────────

server.tool(
  "list_regions",
  "List all regions in the organization. Regions are the top level of the hierarchy: Region → Location → Room → Device. Returns each region's ID and name. Use region IDs to filter devices/sensors or scope admin users.",
  {},
  async () => {
    try {
      const data = await pulse.listRegions();
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "create_region",
  "Create a new region — the top of the org hierarchy. After creating, use create_location with the returned regionId, then create_room with the locationId to build out the full site structure.",
  {
    name: z.string().describe("Name for the new region"),
  },
  async (args) => {
    try {
      const data = await pulse.createRegion(args);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "update_region",
  "Rename a region. Does not affect locations or rooms assigned under it.",
  {
    id: z.number().describe("The region ID to update"),
    name: z.string().describe("New name for the region"),
  },
  async ({ id, ...updates }) => {
    try {
      const data = await pulse.updateRegion(id, updates);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "delete_region",
  "Delete a region. Locations in this region become unassigned (not deleted). Use list_regions first to confirm the target.",
  {
    id: z.number().describe("The region ID to delete"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.deleteRegion(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── User Tools ─────────────────────────────────────────────────────

server.tool(
  "list_users",
  "List all users in the organization. Returns each user's ID, email, role (owner or admin), and region assignments. Owners have full org access; admins can be scoped to specific regions.",
  {},
  async () => {
    try {
      const data = await pulse.listUsers();
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "get_user",
  "Get details for a specific user including their role (owner/admin) and assigned region IDs.",
  {
    id: z.string().describe("The user ID"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.getUser(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "create_user",
  "Invite a new user to the organization by email. Sends an invitation. Admins can be scoped to specific regions via regionIds; owners get full org access. Use list_regions first to get valid region IDs for scoping.",
  {
    email: z.string().describe("Email address for the new user"),
    role: z
      .enum(["owner", "admin"])
      .optional()
      .describe("User role: owner or admin"),
    regionIds: z
      .array(z.number())
      .optional()
      .describe("Region IDs to assign (for admin role)"),
  },
  async (args) => {
    try {
      const data = await pulse.createUser(args);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "update_user",
  "Update a user's role or region assignments. Use list_regions first to get valid region IDs. Provide only the fields you want to change.",
  {
    id: z.string().describe("The user ID to update"),
    role: z.enum(["owner", "admin"]).optional().describe("New role"),
    regionIds: z
      .array(z.number())
      .optional()
      .describe("Updated region IDs"),
  },
  async ({ id, ...updates }) => {
    try {
      const data = await pulse.updateUser(id, updates);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "delete_user",
  "Remove a user from the organization. Immediately revokes their access. This cannot be undone — the user would need to be re-invited with create_user.",
  {
    id: z.string().describe("The user ID to delete"),
  },
  async ({ id }) => {
    try {
      const data = await pulse.deleteUser(id);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── Profile Tools ──────────────────────────────────────────────────

server.tool(
  "list_profiles",
  "List all Pulse profiles in the organization. Profiles are reusable device configuration templates managed in the Pulse web UI. Use this to see what profiles are available before applying device config.",
  {},
  async () => {
    try {
      const data = await pulse.listProfiles();
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── Audit Log Tools ────────────────────────────────────────────────

server.tool(
  "get_audit_logs",
  "List audit log entries for the organization within a date range. Tracks all changes: device enrollments, config pushes, user changes, room/location edits, etc. Dates must be ISO 8601 format. Use pageToken from the response to paginate through large result sets.",
  {
    from: z
      .string()
      .describe("Start date in ISO 8601 format, e.g. 2024-01-01T10:00:00Z"),
    to: z
      .string()
      .describe("End date in ISO 8601 format, e.g. 2024-01-02T10:00:00Z"),
    pageToken: z.string().optional().describe("Pagination token"),
    pageSize: z.number().optional().describe("Number of results per page"),
  },
  async ({ from, to, pageToken, pageSize }) => {
    try {
      const data = await pulse.getAuditLogs(from, to, pageToken, pageSize);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── Bug Report Tools ───────────────────────────────────────────────

server.tool(
  "generate_bug_report",
  "Generate a bug report for one or more devices. Captures device logs and uploads them to Neat Support. Returns a support ID to share with Neat when opening a support case. Use as a last resort after checking sensors (get_device_sensors) and rebooting (reboot_device).",
  {
    ids: z
      .array(z.string())
      .describe("Array of endpoint/device IDs to include in the bug report"),
    uploadInCallLogs: z
      .boolean()
      .optional()
      .describe("Whether to include in-call logs in the report"),
  },
  async ({ ids, uploadInCallLogs }) => {
    try {
      const data = await pulse.generateBugReport(ids, uploadInCallLogs);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── Room Note Tools ────────────────────────────────────────────────

server.tool(
  "list_room_notes",
  "List all notes for a specific room. Notes document room setup, maintenance history, or known issues. Use list_rooms first to get the room ID.",
  {
    roomId: z.string().describe("The room ID"),
  },
  async ({ roomId }) => {
    try {
      const data = await pulse.listRoomNotes(roomId);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "get_room_note",
  "Get a specific note for a room by its note ID. Use list_room_notes first to find note IDs.",
  {
    roomId: z.string().describe("The room ID"),
    noteId: z.string().describe("The note ID"),
  },
  async ({ roomId, noteId }) => {
    try {
      const data = await pulse.getRoomNote(roomId, noteId);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "create_room_note",
  "Create a note for a room. Content must be a JSON string. Use notes to document commissioning details, maintenance records, or known issues. Get the room ID from list_rooms first.",
  {
    roomId: z.string().describe("The room ID"),
    content: z.string().describe("JSON string of the note content object"),
  },
  async ({ roomId, content }) => {
    try {
      const parsed = JSON.parse(content);
      const data = await pulse.createRoomNote(roomId, parsed);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "delete_room_note",
  "Permanently delete a note from a room. Use list_room_notes first to find the note ID.",
  {
    roomId: z.string().describe("The room ID"),
    noteId: z.string().describe("The note ID to delete"),
  },
  async ({ roomId, noteId }) => {
    try {
      const data = await pulse.deleteRoomNote(roomId, noteId);
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

server.tool(
  "list_all_room_notes",
  "List all room notes across every room in the organization. Useful for auditing documentation coverage or searching for a note across all rooms.",
  {},
  async () => {
    try {
      const data = await pulse.listAllRoomNotes();
      return json(data);
    } catch (e: any) {
      return error(e.message);
    }
  }
);

// ── Start Server ───────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Neat Pulse MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
