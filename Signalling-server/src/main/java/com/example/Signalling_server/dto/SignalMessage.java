package com.example.Signalling_server.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record SignalMessage(
        String type,
        String roomId,
        JsonNode payload
) {}