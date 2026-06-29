package com.example.Signalling_server.dto;

import lombok.Data;

import java.time.Instant;
import java.util.List;


@Data
public class ExperimentResult {

    private String experimentType;
    private int experimentValue;
    private int run;

    private Instant startTime;

    private List<ExperimentSampleDto> samples;
}