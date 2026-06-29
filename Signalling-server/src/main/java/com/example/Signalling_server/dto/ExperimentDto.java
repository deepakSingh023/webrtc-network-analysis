package com.example.Signalling_server.dto;

public record ExperimentDto(
        String experimentType,
        int experimentValue,
        int run
) {
}
