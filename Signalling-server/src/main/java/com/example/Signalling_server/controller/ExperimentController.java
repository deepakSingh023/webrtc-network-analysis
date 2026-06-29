package com.example.Signalling_server.controller;

import com.example.Signalling_server.dto.ExperimentDto;
import com.example.Signalling_server.dto.ExperimentSampleDto;
import com.example.Signalling_server.service.ExperimentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;


@RequiredArgsConstructor
@RestController
@RequestMapping("/experiment")
public class ExperimentController {

    private final ExperimentService experimentService;



    @PostMapping("/start")
    public ResponseEntity<Void> start(
            @RequestBody ExperimentDto dto
    ) throws IOException {

        experimentService.start(dto);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/stop")
    public ResponseEntity<Void> stopExperiment() throws IOException{
        experimentService.stop();

        return ResponseEntity.ok().build();
    }

    @PostMapping("/update")
    public ResponseEntity<Void> updateStats(
            @RequestBody ExperimentSampleDto data
            ){
         experimentService.updateStats(data);

         return ResponseEntity.ok().build();
    }
}