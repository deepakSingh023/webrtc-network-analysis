package com.example.Signalling_server.dto;

public record ExperimentSampleDto(

        long elapsedTime,

        double rtt,
        double jitter,

        long packetsLost,
        long packetsSent,
        long packetsReceived,

        long bytesSent,
        long bytesReceived,

        double availableOutgoingBitrate,
        double availableIncomingBitrate,

        double fps,

        long framesDropped

) {}