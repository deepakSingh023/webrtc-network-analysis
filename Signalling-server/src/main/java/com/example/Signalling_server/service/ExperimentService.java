package com.example.Signalling_server.service;


import com.example.Signalling_server.dto.ExperimentData;
import com.example.Signalling_server.dto.ExperimentDto;
import com.example.Signalling_server.dto.ExperimentResult;
import com.example.Signalling_server.dto.ExperimentSampleDto;
import com.example.Signalling_server.enums.DataType;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;


@RequiredArgsConstructor
@Service
public class ExperimentService {

    private Path currentExperimentFile;

    private Instant startTime;

    private ExperimentResult currentExperiment;

    private final ObjectMapper objectMapper;


    public void start(ExperimentDto data) throws IOException {

        if (currentExperiment != null) {
            throw new IllegalStateException("Experiment already running");
        }

        Path folder = Paths.get(
                "results",
                data.experimentType(),
                String.valueOf(data.experimentValue())
        );

        Files.createDirectories(folder);

        currentExperimentFile = folder.resolve(
                "run" + data.run() + ".json"
        );

        startTime = Instant.now();

        currentExperiment = new ExperimentResult();

        currentExperiment.setExperimentType(data.experimentType());
        currentExperiment.setExperimentValue(data.experimentValue());
        currentExperiment.setRun(data.run());
        currentExperiment.setStartTime(startTime);
        currentExperiment.setLocalSamples(new ArrayList<>());
        currentExperiment.setRemoteSample(new ArrayList<>());
    }

    public void stop() throws IOException {

        if (currentExperiment == null) {
            return;
        }

        objectMapper.writeValue(
                currentExperimentFile.toFile(),
                currentExperiment
        );

        currentExperiment = null;
        currentExperimentFile = null;
        startTime = null;
    }
    public void updateStats(ExperimentSampleDto data) {

        if (currentExperiment == null) {
            return;
        }

        long elapsed =
                Duration.between(
                        startTime,
                        Instant.now()
                ).toMillis();

        ExperimentData sample =
                new ExperimentData(

                        elapsed,

                        data.rtt(),
                        data.jitter(),

                        data.packetsLost(),
                        data.packetsSent(),
                        data.packetsReceived(),

                        data.bytesSent(),
                        data.bytesReceived(),

                        data.availableOutgoingBitrate(),
                        data.availableIncomingBitrate(),

                        data.fps(),

                        data.framesDropped()
                );

        if (data.type() == DataType.LOCAL) {
            currentExperiment.getLocalSamples().add(sample);
            System.out.println("Added Local Sample. Total now: " + currentExperiment.getLocalSamples().size());
        } else if (data.type() == DataType.REMOTE) {
            currentExperiment.getRemoteSample().add(sample);
            System.out.println("Added Remote Sample. Total now: " + currentExperiment.getRemoteSample().size());
        }
    }
}
