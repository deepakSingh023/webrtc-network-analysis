package com.example.Signalling_server.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.socket.WebSocketSession;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Room {

    private String roomId;

    private WebSocketSession host;

    private WebSocketSession guest;

    public Room(
            String roomId,
            WebSocketSession host
    ) {
        this.roomId = roomId;
        this.host = host;
    }
}