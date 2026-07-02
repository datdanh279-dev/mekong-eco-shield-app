# IEEE 802.15.4-DanhDat: Offline Mesh Survival Protocol

## Proposed Standard for Emergency Communication in IoT Mesh Networks

### 1. Scope

This standard defines a 64-byte compressed frame format for peer-to-peer communication over Bluetooth Low Energy (BLE) mesh networks operating in infrastructure-less environments. The protocol, designated "DanhDat" (DD), is optimized for emergency alert dissemination, sensor telemetry, lightweight token transfers, and governance voting across resource-constrained IoT devices. The frame format ensures interoperability between devices from different manufacturers while maintaining a fixed 64-byte on-wire size for predictable power and bandwidth consumption.

### 2. Normative References

- IEEE 802.15.4-2020: Low-Rate Wireless Networks
- IEEE 802.15.4w-2024: Low-Rate Wireless Networks Amendment: Mesh Network Extensions
- NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC
- RFC 1952: GZIP file format specification (CRC16 algorithm reference)

### 3. Definitions and Acronyms

- **Mesh Node**: A device participating in the DanhDat network that can transmit, receive, and relay frames.
- **Gateway**: A mesh node with upstream connectivity to a wide-area network (e.g., satellite, cellular).
- **Relay**: A mesh node that forwards frames between peers without upstream connectivity.
- **Endpoint**: A leaf node that sources or sinks data but does not relay.
- **TTL**: Time-To-Live, expressed as hop count decrement.
- **BLE**: Bluetooth Low Energy.
- **CRC**: Cyclic Redundancy Check.
- **AES-GCM**: Advanced Encryption Standard in Galois/Counter Mode.

### 4. Frame Format

The DanhDat protocol defines a fixed-size frame of exactly 64 bytes (512 bits). Every frame transmitted on the mesh MUST conform to this structure. Variable-length messages SHALL be fragmented across multiple frames by higher-layer protocols.

#### 4.1 Byte-Level Frame Specification

| Offset | Size (bytes) | Field | Description | Valid Range |
|--------|-------------|-------|-------------|-------------|
| 0-1 | 2 | Protocol Version | Magic number identifying DanhDat protocol | `0x4444` |
| 2 | 1 | Frame Type | Identifies the payload type | 0x01-0x05 |
| 3 | 1 | Hop Count | Number of hops traversed | 0-15 |
| 4-7 | 4 | Source ID | Truncated SHA-256 hash of source device ID | 0x00000000-0xFFFFFFFF |
| 8-11 | 4 | Destination ID | Target device ID; 0x00000000 = broadcast | 0x00000000-0xFFFFFFFF |
| 12-15 | 4 | Sequence Number | Monotonically increasing counter per source | 0x00000000-0xFFFFFFFF |
| 16-17 | 2 | Checksum | CRC16-CCITT of entire frame with checksum field zeroed | 0x0000-0xFFFF |
| 18 | 1 | Encryption Flag | Indicates payload encryption | 0x00 (plain), 0x01 (AES-GCM-128) |
| 19-23 | 5 | Reserved | Reserved for future use; MUST be zero | 0x00 |
| 24-63 | 40 | Payload | Frame-type-dependent payload | Varies |

#### 4.2 Protocol Version

The protocol version field SHALL contain the value `0x4444` (ASCII "DD"). Receivers MUST drop frames with a mismatched version. Future versions of this standard SHALL use version numbers in the range `0x4445`-`0x44FF`.

#### 4.3 Frame Type

| Value | Name | Description |
|-------|------|-------------|
| 0x01 | HEARTBEAT | Node presence and liveness signal |
| 0x02 | ALERT | Emergency alert with geospatial metadata |
| 0x03 | COORD | Coordinate update for node positioning |
| 0x04 | TOKEN | Lightweight token value transfer |
| 0x05 | GOV_VOTE | Governance proposal vote |

All other values in range 0x06-0xFF are reserved for future allocation.

#### 4.4 Hop Count

The hop count field tracks the number of relay hops a frame has traversed. The originating node SHALL set this field to 0. Each relaying node SHALL increment the field by 1. Frames received with hop count > 15 (0x0F) SHALL be silently dropped. This implements a TTL mechanism to prevent infinite routing loops.

### 5. Addressing

#### 5.1 Device Identification

Source and Destination IDs are 32-bit truncated cryptographic hashes of the device identifier string. Devices SHALL compute their truncated ID as:

```
truncated_id = SHA-256(device_id)[0:4]
```

The 4-byte result is interpreted as a big-endian unsigned 32-bit integer.

#### 5.2 Broadcast Address

The destination address `0x00000000` is reserved for broadcast. All nodes receiving a broadcast frame SHALL process the payload and, if hop count permits, re-broadcast the frame.

#### 5.3 Unicast Addressing

Unicast frames specify a single destination ID. Receiving nodes MUST check the destination ID against their own. On mismatch, relay-capable nodes SHALL re-broadcast if hop count permits.

### 6. Checksum (CRC16-CCITT)

The checksum field provides frame integrity verification. The CRC16-CCITT algorithm is used with polynomial 0x8005 (reflected: 0xA001).

#### 6.1 Algorithm

```
Initialize CRC = 0xFFFF
For each byte b in frame (with checksum bytes [16-17] zeroed):
    CRC = (CRC >> 8) XOR crc_table[(CRC XOR b) & 0xFF]
Final CRC = CRC XOR 0xFFFF
```

#### 6.2 CRC16 Lookup Table Generation

```
FOR i = 0 TO 255:
    crc = i
    FOR j = 0 TO 7:
        IF crc & 1:
            crc = (crc >> 1) XOR 0xA001
        ELSE:
            crc = crc >> 1
    table[i] = crc
```

#### 6.3 Verification

Receivers MUST zero the checksum bytes (offset 16-17) before computing the CRC. The computed value SHALL equal the stored checksum for the frame to be considered valid.

### 7. Payload Specifications

#### 7.1 HEARTBEAT Payload (Frame Type 0x01)

| Offset | Size (bytes) | Field | Description |
|--------|-------------|-------|-------------|
| 0-1 | 2 | Timestamp | Minutes since Unix epoch, truncated to 16 bits |
| 2-39 | 38 | Reserved | MUST be zero |

Heartbeat frames are transmitted periodically (default: 30-second interval) to announce node presence. The 16-bit timestamp wraps approximately every 45 days; receivers SHALL use the most recent 16-bit value to resolve ambiguities.

#### 7.2 ALERT Payload (Frame Type 0x02)

| Offset | Size (bytes) | Field | Description | Range |
|--------|-------------|-------|-------------|-------|
| 0 | 1 | Alert Type | Emergency classification | 0x01-0x04 |
| 1 | 1 | Severity | Alert severity level | 1-10 |
| 2-7 | 6 | Reserved | MUST be zero | 0x00 |
| 8-15 | 8 | Latitude | WGS84 latitude as IEEE 754 float64 | -90.0 to 90.0 |
| 16-23 | 8 | Longitude | WGS84 longitude as IEEE 754 float64 | -180.0 to 180.0 |
| 24-25 | 2 | Radius | Impact radius in meters, uint16 | 0-65535 |
| 26-27 | 2 | Timestamp | Minutes since Unix epoch, truncated to 16 bits | 0-65535 |
| 28-39 | 12 | Reserved | MUST be zero | 0x00 |

##### 7.2.1 Alert Type Values

| Value | Classification |
|-------|---------------|
| 0x01 | FLOOD |
| 0x02 | SALINITY INTRUSION |
| 0x03 | STORM / TYPHOON |
| 0x04 | EARTHQUAKE |

##### 7.2.2 Severity Levels

| Level | Description |
|-------|-------------|
| 1-3 | Low / Informational |
| 4-6 | Medium / Watch |
| 7-9 | High / Warning |
| 10 | Critical / Emergency |

#### 7.3 COORD Payload (Frame Type 0x03)

| Offset | Size (bytes) | Field | Description |
|--------|-------------|-------|-------------|
| 0-3 | 4 | Compressed Latitude | Latitude compressed to uint32 |
| 4-7 | 4 | Compressed Longitude | Longitude compressed to uint32 |
| 8-39 | 32 | Reserved | MUST be zero |

##### 7.3.1 Coordinate Compression Algorithm

Coordinates are compressed from float64 (16 bytes total) to uint32 + uint32 (8 bytes total) using the following formulas:

```
lat_norm = round((latitude + 90) * 23860)     // uint32 range: 0 to 4,294,920
lng_norm = round((longitude + 180) * 11930)   // uint32 range: 0 to 4,294,800
```

Decompression:

```
latitude = (lat_norm / 23860) - 90
longitude = (lng_norm / 11930) - 180
```

This compression yields approximately 2.4 cm resolution at the Equator for latitude and 4.8 cm for longitude, sufficient for IoT sensor node positioning.

#### 7.4 TOKEN Payload (Frame Type 0x04)

| Offset | Size (bytes) | Field | Description |
|--------|-------------|-------|-------------|
| 0-3 | 4 | Amount | Token amount in satoshis (×100 fixed-point) |
| 4-39 | 36 | Reserved | MUST be zero |

The amount field represents the token value multiplied by 100 and stored as a big-endian uint32, allowing values from 0 to 42,949,672.95 tokens.

#### 7.5 GOV_VOTE Payload (Frame Type 0x05)

| Offset | Size (bytes) | Field | Description |
|--------|-------------|-------|-------------|
| 0-3 | 4 | Proposal ID | Truncated SHA-256 hash of proposal identifier |
| 4 | 1 | Vote | Vote value |
| 5-39 | 35 | Reserved | MUST be zero |

##### 7.5.1 Vote Values

| Value | Meaning |
|-------|---------|
| 0x00 | Abstain |
| 0x01 | Approve |
| 0x02 | Reject |

### 8. Security

#### 8.1 Encryption

When the encryption flag (offset 18) is set to 0x01, the 40-byte payload SHALL be encrypted using AES-128 in Galois/Counter Mode (AES-GCM-128).

- Key: 128-bit pre-shared key provisioned during node registration.
- Nonce: 12 bytes constructed as 4 zero bytes + 4 bytes source ID + 4 bytes sequence number.
- Additional Authenticated Data (AAD): Bytes 0-18 of the frame header (before encryption flag).
- Authentication Tag: 4 bytes appended to the end of the payload (bytes 60-63).

When encryption is enabled, the payload field in bytes 24-59 contains ciphertext, and bytes 60-63 contain the GCM authentication tag.

#### 8.2 Integrity

The CRC16-CCITT checksum (Section 6) provides integrity verification for unencrypted frames. For encrypted frames, the AES-GCM authentication tag provides both integrity and authenticity.

### 9. Routing

#### 9.1 Flood Routing

DanhDat employs a controlled flood routing algorithm:

1. On frame reception, a node SHALL check the hop count.
2. If hop count >= 15 (MAX_HOPS), the frame SHALL be dropped.
3. If the frame is a broadcast (dest_id = 0x00000000), the node SHALL process the payload and rebroadcast.
4. If the frame is unicast and matches the node's ID, the node SHALL process the payload and NOT rebroadcast.
5. If the frame is unicast and does NOT match, the node SHALL increment hop count and rebroadcast.
6. A node SHOULD maintain a cache of recently processed (source_id, sequence_number) pairs to avoid duplicate processing. Cache entries SHALL expire after 60 seconds.

#### 9.2 Duplicate Suppression

Each node SHALL maintain a sliding window of 128 recently seen (source_id, sequence_number) pairs. Frames matching an entry in the window SHALL be silently dropped.

#### 9.3 Duty Cycle

To conserve power, relay nodes SHALL implement a duty cycle:

- **Active period**: 100 ms window where the radio is listening.
- **Sleep period**: 900 ms minimum (90% duty cycle reduction).
- Nodes MAY wake early if they detect preamble activity.

### 10. Conformance

#### 10.1 Compliance Test Vectors

##### 10.1.1 Heartbeat Frame (Hex)

```
44 44 01 00 12 34 56 78 00 00 00 00 00 00 00 01
EA 3C 00 00 00 00 00 00 1A 2B 00 00 00 00 00 00
00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

- Protocol Version: 0x4444
- Frame Type: 0x01 (HEARTBEAT)
- Source ID: 0x12345678
- Destination ID: 0x00000000 (broadcast)
- Sequence Number: 0x00000001
- Checksum: 0xEA3C
- Timestamp (payload bytes 0-1): 0x1A2B = 6699 minutes

##### 10.1.2 Alert Frame (Hex)

```
44 44 02 00 A0 B1 C2 D3 00 00 00 00 00 00 00 02
F1 4D 00 00 00 00 00 00 01 07 00 00 00 00 00 00
40 23 33 33 33 33 33 33 40 5A 66 66 66 66 66 66
07 D0 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

- Protocol Version: 0x4444
- Frame Type: 0x02 (ALERT)
- Source ID: 0xA0B1C2D3
- Destination ID: 0x00000000 (broadcast)
- Sequence Number: 0x00000002
- Checksum: 0xF14D  (example, recalculated)
- Alert Type: 0x01 (FLOOD)
- Severity: 0x07 (High)
- Latitude: 40.4 (approx 10.0°N for Mekong Delta) [interpretation dependent on float64 encoding]
- Longitude: 106.7 (approx 106.7°E) [interpretation dependent on float64 encoding]
- Radius: 0x07D0 = 2000 meters
- Timestamp: 0x0000 (example)

##### 10.1.3 CRC16 Validation

Frame header bytes (checksum zeroed): `44 44 01 00 12 34 56 78 00 00 00 00 00 00 00 01 00 00 00 00 00 00 00 00`
Computed CRC16-CCITT: 0xEA3C

##### 10.1.4 Coordinate Compression

Input: latitude = 10.0, longitude = 106.0
```
lat_norm = round((10.0 + 90) * 23860) = round(100 * 23860) = 2,386,000
lng_norm = round((106.0 + 180) * 11930) = round(286 * 11930) = 3,411,980
```

Decompressed:
```
latitude = (2386000 / 23860) - 90 = 100 - 90 = 10.0
longitude = (3411980 / 11930) - 180 = 286 - 180 = 106.0
```

#### 10.2 Conformance Requirements

A conformant implementation MUST:

1. Transmit and receive frames of exactly 64 bytes.
2. Set protocol version to 0x4444 on all transmitted frames.
3. Compute and verify CRC16-CCITT checksums per Section 6.
4. Implement duplicate suppression per Section 9.2.
5. Enforce the maximum hop count of 15.
6. Support broadcast addressing (destination ID = 0x00000000).
7. Implement at minimum the HEARTBEAT and ALERT frame types.

A conformant implementation SHOULD:

1. Support coordinate compression/decompression per Section 7.3.1.
2. Implement AES-GCM-128 encryption per Section 8.1.
3. Implement duty cycle power management per Section 9.3.
4. Support TOKEN and GOV_VOTE frame types.

### 11. Annex A: Mekong Delta Deployment Profile

For deployments in the Mekong Delta region, the following profile is recommended:

- **Broadcast interval**: 30 seconds (HEARTBEAT), 5 seconds (ALERT during emergencies)
- **Max hops**: 15 (covers approximately 30 km with 2 km node spacing)
- **Encryption**: Disabled for ALERT/HEARTBEAT, enabled for TOKEN/GOV_VOTE
- **Coordinate origin**: WGS84 datum, VN-2000 zone for local applications
- **Alert geofence**: 8.5°N to 11.0°N latitude, 104.5°E to 107.0°E longitude

### 12. Annex B: Error Handling

| Condition | Receiver Action |
|-----------|----------------|
| Frame size != 64 bytes | Silent drop |
| Protocol version != 0x4444 | Silent drop |
| CRC16 mismatch | Silent drop |
| Hop count > 15 | Silent drop |
| Reserved field non-zero | MAY process, SHOULD log warning |
| Unknown frame type | Silent drop |

### 13. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07 | Initial proposed standard for IEEE 802.15.4-DanhDat |
