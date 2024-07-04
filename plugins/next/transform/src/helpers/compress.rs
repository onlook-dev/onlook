use base64::{engine::general_purpose, Engine as _};
use flate2::{read::ZlibDecoder, write::ZlibEncoder, Compression};
use serde_json::Value;
use std::io::{self, Read, Write};

// Function to compress JSON data to a base64-encoded string
pub fn compress(json: &Value) -> io::Result<String> {
    let json_str = serde_json::to_string(json)?;
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(json_str.as_bytes())?;
    let compressed_data = encoder.finish()?;
    Ok(general_purpose::STANDARD.encode(&compressed_data))
}

// Function to decompress a base64-encoded string back to JSON
pub fn decompress(encoded: &str) -> io::Result<Value> {
    let compressed_data = general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?; // Handle decode error
    let mut decoder = ZlibDecoder::new(&compressed_data[..]);
    let mut decompressed_data = String::new();
    decoder.read_to_string(&mut decompressed_data)?;
    serde_json::from_str(&decompressed_data)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e)) // Handle JSON parsing error
}
