package com.example.Signalling_server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;


@AllArgsConstructor
@Data
public class ExperimentData {

    private long elapsedTime;

    private double rtt;
    private double jitter;

    private long packetsLost;
    private long packetsSent;
    private long packetsReceived;

    private long bytesSent;
    private long bytesReceived;

    private double availableOutgoingBitrate;
    private double availableIncomingBitrate;

    private double fps;

    private long framesDropped;
}
