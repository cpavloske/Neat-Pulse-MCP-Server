# Neat Pulse MCP Server

A custom Model Context Protocol (MCP) server that wraps the entire Neat Pulse REST API. This gives Claude Code (or any MCP client) the ability to manage your Neat video conferencing devices, read sensor data, and control your Pulse organization.

## What It Does

This server exposes **37 tools** across 9 categories:

### Devices (Endpoints)
| Tool | Description |
|------|-------------|
| `list_devices` | List all devices, optionally filter by region/location |
| `get_device` | Get detailed info and status for a device |
| `get_device_settings` | Get current config for a device |
| `apply_device_config` | Push new settings to a device |
| `reboot_device` | Reboot a device and its paired devices |
| `delete_device` | Unenroll a device from Pulse |

### Sensor Data
| Tool | Description |
|------|-------------|
| `get_device_sensors` | Get latest sensor data for one device |
| `get_all_device_sensors` | Get sensor data for all devices |
| `get_room_sensors` | Get aggregated sensor data for a room |
| `get_all_room_sensors` | Get sensor data for all rooms |

### Rooms
| Tool | Description |
|------|-------------|
| `list_rooms` | List all rooms |
| `get_room` | Get room details |
| `create_room` | Create a new room |
| `update_room` | Update a room |
| `delete_room` | Delete a room |
| `regenerate_room_dec` | Regenerate device enrollment code |

### Locations
| Tool | Description |
|------|-------------|
| `list_locations` | List all locations |
| `create_location` | Create a location |
| `update_location` | Update a location |
| `delete_location` | Delete a location |

### Regions
| Tool | Description |
|------|-------------|
| `list_regions` | List all regions |
| `create_region` | Create a region |
| `update_region` | Update a region |
| `delete_region` | Delete a region |

### Users
| Tool | Description |
|------|-------------|
| `list_users` | List all org users |
| `get_user` | Get user details |
| `create_user` | Invite a new user |
| `update_user` | Update user role/regions |
| `delete_user` | Remove a user |

### Profiles
| Tool | Description |
|------|-------------|
| `list_profiles` | List all Pulse profiles |

### Audit Logs
| Tool | Description |
|------|-------------|
| `get_audit_logs` | List audit log entries within a date range |

### Bug Reports
| Tool | Description |
|------|-------------|
| `generate_bug_report` | Generate a bug report for one or more devices |

### Room Notes
| Tool | Description |
|------|-------------|
| `list_room_notes` | List all notes for a specific room |
| `get_room_note` | Get a specific room note |
| `create_room_note` | Create a note for a room |
| `delete_room_note` | Delete a room note |
| `list_all_room_notes` | List all notes across every room |

## Prerequisites

1. A Neat Pulse account on a **paid plan** (Plus or Pro). The API is not available on Starter.
2. An API key generated in Pulse under **Settings > API keys**
3. Your Organization ID from the Pulse **Settings** page
4. Node.js 18+ installed

## Setup

### 1. Clone or copy this project

```bash
cd ~/Documents/GitHub
git clone https://github.com/cpavloske/Neat-Pulse-MCP-Server.git neat-pulse-mcp
cd neat-pulse-mcp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

### 4. Add to Claude Code

Run this as a **single line** in your terminal:

```bash
claude mcp add neat-pulse -e NEAT_PULSE_API_KEY=YOUR_API_KEY -e NEAT_PULSE_ORG_ID=YOUR_ORG_ID -- node /full/path/to/neat-pulse-mcp/build/index.js
```

Replace `YOUR_API_KEY` and `YOUR_ORG_ID` with your actual credentials.

**On Mac:**
```bash
claude mcp add neat-pulse -e NEAT_PULSE_API_KEY=YOUR_API_KEY -e NEAT_PULSE_ORG_ID=YOUR_ORG_ID -- node ~/Documents/GitHub/neat-pulse-mcp/build/index.js
```

**On Windows (PowerShell):**
```powershell
claude mcp add neat-pulse -e NEAT_PULSE_API_KEY=YOUR_API_KEY -e NEAT_PULSE_ORG_ID=YOUR_ORG_ID -- node $env:USERPROFILE\Documents\GitHub\neat-pulse-mcp\build\index.js
```

### 5. Restart Claude Code and verify

```bash
claude
/mcp
```

You should see `neat-pulse` with a green checkmark.

## Usage Examples

Once connected, you can ask Claude things like:

**Device management:**
- "List all my Neat devices"
- "Show me devices that are offline"
- "What's the firmware version on device X?"
- "Reboot the Neat Bar in Conference Room A"

**Sensor data:**
- "What's the temperature in all our rooms?"
- "Show me CO2 levels across the office"
- "How many people are in the boardroom right now?"
- "Get humidity readings for all devices at the Dallas location"

**Organization management:**
- "Create a new room called 'Executive Boardroom' at the Houston location"
- "List all locations and their regions"
- "What users have access to Pulse?"

## Project Structure

```
neat-pulse-mcp/
  src/
    client.ts    # Neat Pulse API HTTP client wrapper
    index.ts     # MCP server with all 27 tools registered
  build/         # Compiled JavaScript (after npm run build)
  package.json
  tsconfig.json
  README.md
```

## API Reference

This server wraps the official Neat Pulse API v0.1.1 documented at:
https://api.pulse.neat.no/docs/

All requests go through `https://api.pulse.neat.no/v1/orgs/{orgId}/...` using Bearer token authentication.

## Sensor Data Available

Neat devices report the following sensor data (varies by device model):
- **Temperature** (accuracy ±1°C within +15°C to +40°C)
- **Humidity** (accuracy ±3.5% rH in the 20% to 80% range)
- **CO2** levels
- **VOC** (volatile organic compounds)
- **People count** (occupancy)
- **ShutterClosed** (Neat Frame only, whether privacy shutter is blocking camera)

## Troubleshooting

**Server shows as "failed" in `/mcp`:**
- Verify your API key and org ID are correct
- Make sure you built the project (`npm run build`)
- Check the path in the `claude mcp add` command points to the correct `build/index.js`

**API returns 403:**
- Your API key may not have the right scopes. Go to Pulse Settings > API keys and ensure it has both Read and Write permissions.

**API returns 404:**
- Double check your Organization ID in Pulse Settings

## License

MIT
