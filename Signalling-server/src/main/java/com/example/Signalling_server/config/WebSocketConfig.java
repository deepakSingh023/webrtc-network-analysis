package com.example.Signalling_server.config;

import com.example.Signalling_server.websocket.SignalingHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig
        implements WebSocketConfigurer {

    private final SignalingHandler
            signalingHandler;

    @Override
    public void registerWebSocketHandlers(
            WebSocketHandlerRegistry registry
    ) {

        registry.addHandler(
                signalingHandler,
                "/signal"
        ).setAllowedOriginPatterns("*");
    }
}