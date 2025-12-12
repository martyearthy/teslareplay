import struct
import sys
import os

def main(path):
    with open(path, "rb") as fp:
        # Simple atom walker
        fp.seek(0, 2)
        file_size = fp.tell()
        fp.seek(0)
        
        mdat_start = 0
        mdat_size = 0
        
        while fp.tell() < file_size:
            pos = fp.tell()
            header = fp.read(8)
            if len(header) < 8: break
            
            size, type = struct.unpack(">I4s", header)
            if size == 1:
                size = struct.unpack(">Q", fp.read(8))[0]
            
            if type == b'mdat':
                mdat_start = pos
                mdat_size = size
                break
                
            if size == 0:
                break
            fp.seek(pos + size)
            
        if mdat_size > 0:
            print(f"Found mdat at {mdat_start}, size {mdat_size}")
            scan_mdat(fp, mdat_start, mdat_size)
        else:
            print("mdat not found")

def scan_mdat(fp, start, size):
    # mdat header size
    header_size = 16 if size > 4294967295 else 8
    # Actually checking if we read 8 or 16 bytes earlier is better, but here we assume standard
    # Let's just use the file pointer which is at the payload start if we didn't seek away
    # Re-seek to payload
    fp.seek(start + header_size)
    
    end = start + size
    count = 0
    
    while fp.tell() < end and count < 5: # Just check first 5 SEI messages
        # Read NAL length prefix (4 bytes)
        len_bytes = fp.read(4)
        if len(len_bytes) < 4: break
        length = struct.unpack(">I", len_bytes)[0]
        
        nal_start = fp.tell()
        # Read NAL header
        if length > 0:
            nal_header = fp.read(1)
            nal_type = ord(nal_header) & 0x1F
            
            if nal_type == 6: # SEI
                print(f"\nSEI NAL found at {nal_start}, length {length}")
                payload = fp.read(length - 1)
                
                # Check SEI payload type
                if len(payload) > 1:
                    ptype = payload[0]
                    # Read size
                    psize = payload[1]
                    offset = 2
                    if psize == 0xFF:
                        # varint size handling simplified
                        while payload[offset-1] == 0xFF:
                             psize += payload[offset]
                             offset += 1
                    
                    print(f"  SEI Payload Type: {ptype}")
                    print(f"  SEI Payload Size: {psize}")
                    
                    # Dump first 32 bytes of SEI payload
                    dump_hex(payload[:64])
                    
                    count += 1
            else:
                fp.seek(length - 1, 1)
        else:
             pass

def dump_hex(data):
    hex_str = " ".join(f"{b:02X}" for b in data)
    ascii_str = "".join(chr(b) if 32 <= b < 127 else "." for b in data)
    print(f"  Hex: {hex_str}")
    print(f"  Asc: {ascii_str}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python inspect_sei.py <file>")
    else:
        main(sys.argv[1])
