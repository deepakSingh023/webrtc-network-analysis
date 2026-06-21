package com.example.Signalling_server.dto;

public record SignalMessage(
        String type,
        String roomId,
        String payload
) {}